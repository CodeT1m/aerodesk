"use client";

import { CONCIERGE_CONVERSATIONS_QUERY } from "@/sanity/lib/queries";
import { summarizeInsights, type StoredConversation } from "@/lib/ai/insights-summary";
import { useEffect, useMemo, useState } from "react";
import { useClient } from "sanity";

const SENTIMENT_COLOR: Record<string, string> = {
  positive: "#0f766e",
  neutral: "#64748b",
  negative: "#b45309",
};

export function InsightsTool() {
  const studioClient = useClient({ apiVersion: "2026-02-01" });
  const client = useMemo(
    () => studioClient.withConfig({ perspective: "raw", useCdn: false }),
    [studioClient],
  );
  const [conversations, setConversations] = useState<StoredConversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void client
      .fetch<StoredConversation[]>(CONCIERGE_CONVERSATIONS_QUERY)
      .then((rows) => {
        if (!cancelled) setConversations(rows ?? []);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load Insights.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const summary = useMemo(() => summarizeInsights(conversations ?? []), [conversations]);

  return (
    <div style={{ padding: 32, maxWidth: 960, lineHeight: 1.5, color: "inherit" }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>Concierge Insights</h2>
      <p style={{ margin: "0 0 20px", opacity: 0.7 }}>
        Saved Concierge threads with sentiment, success score, and content gaps. Classification runs
        after each reply and again from <code>pnpm sanity:insights:classify</code>.
      </p>
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      {conversations === null && !error ? <p>Loading conversations…</p> : null}
      {conversations ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <Kpi label="Threads" value={String(summary.total)} />
            <Kpi label="Classified" value={String(summary.classifiedCount)} />
            <Kpi label="Avg success" value={summary.classifiedCount ? `${summary.avgScore}/10` : "—"} />
            <Kpi
              label="Sentiment"
              value={`${summary.bySentiment.positive} / ${summary.bySentiment.neutral} / ${summary.bySentiment.negative}`}
              hint="positive / neutral / negative"
            />
          </div>
          <h3 style={{ margin: "28px 0 8px", fontSize: 16 }}>Content gaps</h3>
          {summary.topGaps.length === 0 ? (
            <p style={{ color: "inherit", opacity: 0.7 }}>No gaps yet. They appear when Concierge lacked catalog or policy facts.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {summary.topGaps.map((gap) => (
                <li key={gap.label}>
                  {gap.label} <span style={{ color: "#64748b" }}>({gap.count})</span>
                </li>
              ))}
            </ul>
          )}
          <h3 style={{ margin: "28px 0 8px", fontSize: 16 }}>Recent conversations</h3>
          {conversations.length === 0 ? (
            <p style={{ opacity: 0.7 }}>
              No saved threads yet. Ask Concierge Desk a question, then refresh this tool.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {conversations.map((item) => (
                <article
                  key={item._id}
                  style={{
                    border: "1px solid color-mix(in oklab, currentColor 16%, transparent)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    background: "color-mix(in oklab, currentColor 4%, transparent)",
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {item.firstMessage?.slice(0, 140) || item.threadId || "Conversation"}
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
                    {item.classification?.summary ?? "Waiting for sentiment classification."}
                  </p>
                  <p style={{ margin: "8px 0 0", fontSize: 12 }}>
                    <span
                      style={{
                        color: SENTIMENT_COLOR[item.classification?.sentiment ?? ""] ?? "#64748b",
                        fontWeight: 600,
                        textTransform: "capitalize",
                      }}
                    >
                      {item.classification?.sentiment ?? "unclassified"}
                    </span>
                    {typeof item.classification?.successScore === "number"
                      ? ` · score ${item.classification.successScore}/10`
                      : ""}
                    {item.messageCount ? ` · ${item.messageCount} messages` : ""}
                    {item.lastMessageAt
                      ? ` · ${new Date(item.lastMessageAt).toLocaleString()}`
                      : ""}
                  </p>
                  {(item.classification?.contentGaps ?? []).length > 0 ? (
                    <p style={{ margin: "6px 0 0", fontSize: 12, color: "#b45309" }}>
                      Gaps: {(item.classification?.contentGaps ?? []).join(", ")}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div
      style={{
        border: "1px solid color-mix(in oklab, currentColor 16%, transparent)",
        borderRadius: 12,
        padding: 14,
        background: "color-mix(in oklab, currentColor 4%, transparent)",
      }}
    >
      <p style={{ margin: 0, fontSize: 12, opacity: 0.7, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </p>
      <p style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 650 }}>{value}</p>
      {hint ? <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.55 }}>{hint}</p> : null}
    </div>
  );
}
