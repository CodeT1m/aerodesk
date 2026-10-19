import { createClient, type SanityClient } from "@sanity/client";
import { classifyConversation, classifyConversations } from "@sanity/context/insights";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject, type UIMessage } from "ai";
import { z } from "zod";
import { dataset, projectId } from "@/sanity/env";
import {
  conversationDocId,
  type ConversationClassification,
  type TranscriptMessage,
} from "@/lib/ai/insights-summary";

export {
  conversationDocId,
  summarizeInsights,
  type ConversationClassification,
  type InsightSentiment,
  type StoredConversation,
  type TranscriptMessage,
} from "@/lib/ai/insights-summary";

export const CONCIERGE_INSIGHTS_ENDPOINT =
  process.env.SANITY_CONTEXT_ENDPOINT_NAME ?? "aerodesk-concierge";

const classificationSchema = z.object({
  successScore: z.number().min(1).max(10),
  sentiment: z.enum(["positive", "neutral", "negative"]),
  contentGaps: z.array(z.string()),
  summary: z.string(),
});

export function getInsightsClient(): SanityClient | null {
  const organizationId = process.env.SANITY_ORGANIZATION_ID;
  const token = process.env.SANITY_ORGANIZATION_TOKEN;
  if (!organizationId || !token) {
    return null;
  }

  return createClient({
    apiVersion: "v2025-11-27",
    token,
    context: { organizationId },
    useCdn: false,
    useProjectHostname: false,
  });
}

export function getConversationWriteClient(): SanityClient | null {
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!token) return null;
  return createClient({
    projectId,
    dataset,
    apiVersion: "2026-02-01",
    token,
    useCdn: false,
  });
}

export function transcriptFromUiMessages(
  messages: UIMessage[],
  assistantText?: string,
): TranscriptMessage[] {
  const rows: TranscriptMessage[] = [];
  for (const message of messages) {
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => ("text" in part ? part.text : ""))
      .join("\n")
      .trim();
    if (!text) continue;
    const role = message.role === "user" || message.role === "system" ? message.role : "assistant";
    rows.push({ role, content: text });
  }
  const trimmedAssistant = assistantText?.trim();
  if (trimmedAssistant && rows.at(-1)?.content !== trimmedAssistant) {
    rows.push({ role: "assistant", content: trimmedAssistant });
  }
  return rows;
}

async function previousContentGaps(client: SanityClient): Promise<string[]> {
  const rows = await client.fetch<string[][]>(
    `*[_type == "conciergeConversation" && defined(classification.contentGaps)].classification.contentGaps`,
  );
  const counts = new Map<string, number>();
  for (const gaps of rows ?? []) {
    for (const gap of gaps ?? []) {
      const label = gap.trim();
      if (!label) continue;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([label]) => label);
}

export async function classifyTranscript(
  messages: TranscriptMessage[],
  knownGaps: string[] = [],
): Promise<Omit<ConversationClassification, "classifiedAt">> {
  const transcript = messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n")
    .slice(0, 12_000);

  const result = await generateObject({
    model: anthropic("claude-haiku-4-5"),
    schema: classificationSchema,
    schemaName: "ConciergeInsights",
    schemaDescription: "Sentiment, success score, and content gaps for an Aerodesk Concierge chat.",
    prompt: `Classify this Aerodesk Concierge Desk conversation.

Score successScore 1-10 for how well the agent resolved the traveler's needs.
Set sentiment from the traveler's tone: positive, neutral, or negative.
List contentGaps only when the agent lacked catalog, policy, schedule, or booking facts. Prefer existing labels when they match:
${knownGaps.length > 0 ? knownGaps.join("; ") : "(none yet)"}
Write a one-sentence summary.

Transcript:
${transcript}`,
  });

  return {
    successScore: result.object.successScore,
    sentiment: result.object.sentiment,
    contentGaps: result.object.contentGaps.map((gap) => gap.trim()).filter(Boolean).slice(0, 8),
    summary: result.object.summary.trim(),
  };
}

async function saveDatasetConversation(threadId: string, messages: TranscriptMessage[]) {
  const client = getConversationWriteClient();
  if (!client) {
    console.error("[sanity-insights] SANITY_API_WRITE_TOKEN is required to save Concierge conversations.");
    return null;
  }

  const firstUser = messages.find((message) => message.role === "user")?.content ?? messages[0]?.content ?? "";
  const id = conversationDocId(threadId);
  await client.createOrReplace({
    _id: id,
    _type: "conciergeConversation",
    threadId,
    firstMessage: firstUser.slice(0, 400),
    messageCount: messages.length,
    lastMessageAt: new Date().toISOString(),
    messages: messages.map((message, index) => ({
      _key: `${index}-${message.role}`,
      role: message.role,
      content: message.content,
    })),
  });
  return { client, id };
}

async function classifyAndStore(threadId: string, messages: TranscriptMessage[]) {
  const saved = await saveDatasetConversation(threadId, messages);
  if (!saved || !process.env.ANTHROPIC_API_KEY) return;

  try {
    const knownGaps = await previousContentGaps(saved.client);
    const metrics = await classifyTranscript(messages, knownGaps);
    await saved.client
      .patch(saved.id)
      .set({
        classification: {
          ...metrics,
          classifiedAt: new Date().toISOString(),
        },
      })
      .commit();
  } catch (error) {
    console.error(
      "[sanity-insights]",
      error instanceof Error ? error.message : "Failed to classify Concierge conversation",
    );
  }
}

async function saveContextConversation(threadId: string, messages: TranscriptMessage[]) {
  const client = getInsightsClient();
  if (!client) return;

  try {
    await client.context.conversations.save({
      threadId,
      messages,
      metadata: {
        mcpEndpoints: [CONCIERGE_INSIGHTS_ENDPOINT],
        app: "aerodesk",
        surface: "concierge",
      },
    });

    if (!process.env.ANTHROPIC_API_KEY) return;
    await classifyConversation({
      client,
      threadId,
      model: anthropic("claude-haiku-4-5"),
      messages,
    });
  } catch (error) {
    console.error(
      "[sanity-insights]",
      error instanceof Error ? error.message : "Failed to save Context conversation",
    );
  }
}

export async function saveConciergeConversation(
  threadId: string,
  messages: UIMessage[],
  assistantText?: string,
) {
  const transcript = transcriptFromUiMessages(messages, assistantText);
  if (transcript.length === 0) return;

  await Promise.allSettled([
    classifyAndStore(threadId, transcript),
    saveContextConversation(threadId, transcript),
  ]);
}

export async function classifyPendingDatasetConversations() {
  const client = getConversationWriteClient();
  if (!client) {
    throw new Error("Insights classification needs SANITY_API_WRITE_TOKEN.");
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Insights classification needs ANTHROPIC_API_KEY.");
  }

  const pending = await client.fetch<
    { _id: string; threadId?: string; messages?: TranscriptMessage[] }[]
  >(
    `*[_type == "conciergeConversation" && !defined(classification.classifiedAt)] | order(lastMessageAt asc) [0...50] {
      _id,
      threadId,
      messages
    }`,
  );

  const knownGaps = await previousContentGaps(client);
  let successCount = 0;
  let errorCount = 0;

  for (const conversation of pending) {
    const messages = conversation.messages ?? [];
    if (messages.length === 0) {
      errorCount += 1;
      continue;
    }
    try {
      const metrics = await classifyTranscript(messages, knownGaps);
      await client
        .patch(conversation._id)
        .set({
          classification: {
            ...metrics,
            classifiedAt: new Date().toISOString(),
          },
        })
        .commit();
      successCount += 1;
    } catch (error) {
      errorCount += 1;
      console.error(
        "[sanity-insights]",
        conversation.threadId ?? conversation._id,
        error instanceof Error ? error.message : "classification failed",
      );
    }
  }

  return { successCount, errorCount, totalFound: pending.length };
}

export async function classifyConciergeInsights() {
  const datasetResult = await classifyPendingDatasetConversations();
  const contextClient = getInsightsClient();
  if (!contextClient || !process.env.ANTHROPIC_API_KEY) {
    return { ...datasetResult, context: null };
  }

  const context = await classifyConversations({
    client: contextClient,
    model: anthropic("claude-haiku-4-5"),
    mcpEndpoint: CONCIERGE_INSIGHTS_ENDPOINT,
    settledForMinutes: 0,
    limit: 50,
  });

  return { ...datasetResult, context };
}
