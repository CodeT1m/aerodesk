export type TranscriptMessage = { role: "user" | "assistant" | "system"; content: string };
export type InsightSentiment = "positive" | "neutral" | "negative";

export type ConversationClassification = {
  sentiment: InsightSentiment;
  successScore: number;
  contentGaps: string[];
  summary: string;
  classifiedAt: string;
};

export type StoredConversation = {
  _id: string;
  threadId?: string;
  firstMessage?: string;
  messageCount?: number;
  lastMessageAt?: string;
  classification?: Partial<ConversationClassification> | null;
};

export function conversationDocId(threadId: string): string {
  return `conciergeConversation.${threadId.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
}

export function summarizeInsights(conversations: StoredConversation[]) {
  const classified = conversations.filter((item) => item.classification?.sentiment);
  const bySentiment: Record<InsightSentiment, number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };
  const gapCounts = new Map<string, number>();
  let scoreTotal = 0;
  let scoreCount = 0;

  for (const item of classified) {
    const sentiment = item.classification?.sentiment;
    if (sentiment) bySentiment[sentiment] += 1;
    const score = item.classification?.successScore;
    if (typeof score === "number") {
      scoreTotal += score;
      scoreCount += 1;
    }
    for (const gap of item.classification?.contentGaps ?? []) {
      const label = gap.trim();
      if (!label) continue;
      gapCounts.set(label, (gapCounts.get(label) ?? 0) + 1);
    }
  }

  return {
    total: conversations.length,
    classifiedCount: classified.length,
    avgScore: scoreCount === 0 ? 0 : Math.round((scoreTotal / scoreCount) * 10) / 10,
    bySentiment,
    topGaps: [...gapCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, count]) => ({ label, count })),
  };
}
