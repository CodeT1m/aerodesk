import { describe, expect, it } from "vitest";
import {
  conversationDocId,
  summarizeInsights,
  type StoredConversation,
} from "./insights-summary";
import { transcriptFromUiMessages } from "./insights";
import type { UIMessage } from "ai";

function textMessage(id: string, role: "user" | "assistant", text: string): UIMessage {
  return { id, role, parts: [{ type: "text", text }] };
}

describe("transcriptFromUiMessages", () => {
  it("keeps user text and appends the latest assistant reply", () => {
    const transcript = transcriptFromUiMessages(
      [textMessage("1", "user", "I want a window seat")],
      "Pick **A** or **F** in Economy.",
    );
    expect(transcript).toEqual([
      { role: "user", content: "I want a window seat" },
      { role: "assistant", content: "Pick **A** or **F** in Economy." },
    ]);
  });
});

describe("summarizeInsights", () => {
  it("aggregates sentiment, scores, and content gaps", () => {
    const conversations: StoredConversation[] = [
      {
        _id: "a",
        classification: {
          sentiment: "positive",
          successScore: 8,
          contentGaps: ["window seat columns"],
        },
      },
      {
        _id: "b",
        classification: {
          sentiment: "negative",
          successScore: 4,
          contentGaps: ["window seat columns", "dummy payment"],
        },
      },
      { _id: "c" },
    ];
    expect(summarizeInsights(conversations)).toEqual({
      total: 3,
      classifiedCount: 2,
      avgScore: 6,
      bySentiment: { positive: 1, neutral: 0, negative: 1 },
      topGaps: [
        { label: "window seat columns", count: 2 },
        { label: "dummy payment", count: 1 },
      ],
    });
  });
});

describe("conversationDocId", () => {
  it("keeps a stable Sanity id for a UUID thread", () => {
    expect(conversationDocId("3b8f0a2e-1c44-4d11-9c0a-7f2c1d9e4b10")).toBe(
      "conciergeConversation.3b8f0a2e-1c44-4d11-9c0a-7f2c1d9e4b10",
    );
  });
});
