import { NextResponse } from "next/server";
import { createMCPClient } from "@ai-sdk/mcp";
import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { getEntitlements } from "@/lib/entitlements";
import { conciergeTools } from "@/lib/ai/tools";
import { saveConciergeConversation } from "@/lib/ai/insights";
import { CONCIERGE_UI_CONTRACT, DEFAULT_CONCIERGE_SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { CONCIERGE_PROMPT_QUERY } from "@/sanity/lib/queries";
import { client } from "@/sanity/lib/client";

async function loadSanityContext() {
  const mcpUrl = process.env.SANITY_CONTEXT_MCP_URL;
  const orgToken = process.env.SANITY_ORGANIZATION_TOKEN;
  if (!mcpUrl || !orgToken) {
    return {
      initialContext: "",
      tools: {},
      close: async () => undefined,
    };
  }

  const initialContextUrl = new URL(mcpUrl);
  initialContextUrl.pathname = `${initialContextUrl.pathname.replace(/\/$/, "")}/initial-context`;
  const initialContext = await fetch(initialContextUrl, {
    headers: { Authorization: `Bearer ${orgToken}` },
  }).then((response) => response.text());

  const mcp = await createMCPClient({
    transport: {
      type: "http",
      url: mcpUrl,
      headers: { Authorization: `Bearer ${orgToken}` },
    },
  });
  const mcpTools = await mcp.tools();

  return {
    initialContext,
    tools: mcpTools,
    close: async () => {
      await mcp.close();
    },
  };
}

async function loadSystemPrompt(): Promise<string> {
  const published = client.withConfig({
    useCdn: false,
    token: process.env.SANITY_API_READ_TOKEN,
    perspective: "published",
  });
  const doc = await published.fetch<{ systemPrompt?: string } | null>(CONCIERGE_PROMPT_QUERY);
  const fromStudio = doc?.systemPrompt?.trim();
  const base = fromStudio && fromStudio.length > 0 ? fromStudio : DEFAULT_CONCIERGE_SYSTEM_PROMPT;
  const todayUtc = new Date().toISOString().slice(0, 10);
  return `${base}\n\n${CONCIERGE_UI_CONTRACT.replace("{{TODAY_UTC}}", todayUtc)}`;
}

export async function POST(req: Request) {
  const { hasConcierge, userId } = await getEntitlements();
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!hasConcierge) {
    return NextResponse.json({ error: "Pro membership required" }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Concierge is not fully configured. Add an Anthropic API key." },
      { status: 503 },
    );
  }

  const body = (await req.json()) as { messages?: UIMessage[]; id?: string };
  const messages = body.messages;
  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "Invalid chat payload" }, { status: 400 });
  }

  const threadId =
    typeof body.id === "string" && body.id.length > 0 ? body.id : crypto.randomUUID();
  const [context, systemPrompt] = await Promise.all([loadSanityContext(), loadSystemPrompt()]);
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: context.initialContext
      ? `${systemPrompt}\n\n# Data reference\n${context.initialContext}`
      : systemPrompt,
    messages: modelMessages,
    tools: {
      ...conciergeTools(userId),
      ...(context.tools as object),
    },
    stopWhen: stepCountIs(8),
    onFinish: async ({ text }) => {
      await saveConciergeConversation(threadId, messages, text);
      await context.close();
    },
  });

  return result.toUIMessageStreamResponse();
}
