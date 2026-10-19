"use client";

import { MarkdownText } from "@/components/concierge/markdown-text";
import {
  CatalogChips,
  FlightDetailsCard,
  FlightTicketList,
  FollowUpChips,
  HandoffConfirm,
  SeatRecsCard,
  ToolStatus,
  TripCards,
  toolStatusLabel,
} from "@/components/concierge/widgets";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { suggestedFollowUps } from "@/lib/ai/follow-ups";
import { CONCIERGE_PRESETS } from "@/lib/ai/presets";
import type { Cabin } from "@/lib/types";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

const THREAD_KEY = "aerodesk-concierge-thread";
let cachedThreadId: string | null = null;

function readConciergeThreadId(): string {
  if (cachedThreadId) return cachedThreadId;
  const existing = sessionStorage.getItem(THREAD_KEY);
  if (existing) {
    cachedThreadId = existing;
    return existing;
  }
  const next = crypto.randomUUID();
  sessionStorage.setItem(THREAD_KEY, next);
  cachedThreadId = next;
  return next;
}

function useConciergeThreadId() {
  return useSyncExternalStore(
    () => () => undefined,
    readConciergeThreadId,
    () => "pending",
  );
}

export function ConciergeChat() {
  const threadId = useConciergeThreadId();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/concierge" }), []);
  const { messages, sendMessage, status, error, stop } = useChat({
    id: threadId,
    transport,
  });
  const busy = status === "streaming" || status === "submitted" || threadId === "pending";
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const followUps = lastAssistant && !busy ? suggestedFollowUps(lastAssistant.parts) : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    void sendMessage({ text: trimmed });
    setInput("");
  }

  function pickFlight(flightId: string, cabin: Cabin) {
    ask(
      `Use flight ${flightId} in ${cabin} and draft a booking handoff for one adult. Ask me to confirm the card before I leave chat.`,
    );
  }

  return (
    <div className="panel-surface grid gap-5 rounded-[1.5rem] p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-5">
        <span className="eyebrow mr-3 text-muted-foreground">QUICK QUESTIONS</span>
        {CONCIERGE_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full px-3"
            disabled={busy}
            onClick={() => ask(preset.prompt)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="grid min-h-36 max-h-[min(70vh,44rem)] content-start gap-3 overflow-y-auto pr-1" aria-live="polite">
        {messages.length === 0 ? (
          <div className="mx-auto grid max-w-md justify-items-center gap-3 py-6 text-center">
            <span className="glow-accent flex size-12 items-center justify-center rounded-full bg-primary/10 font-heading text-2xl font-semibold text-primary">A</span>
            <h2 className="font-heading text-2xl font-semibold">How can we help you travel?</h2>
            <p className="text-sm leading-6 text-muted-foreground">Choose a question above or ask your own. Flight options and booking steps will appear here.</p>
          </div>
        ) : null}
        {messages.map((message, messageIndex) => {
          const isLastAssistant =
            message.role === "assistant" && messageIndex === messages.length - 1;
          const streamingThis = isLastAssistant && status === "streaming";
          const textParts = message.parts.filter((part) => part.type === "text");
          const lastTextIndex = message.parts.reduce((found, part, index) => {
            return part.type === "text" ? index : found;
          }, -1);
          return (
            <Card
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-auto max-w-[92%] border border-primary/15 bg-primary/5 shadow-none"
                  : "max-w-[96%] border border-border/80 bg-card shadow-sm"
              }
            >
              <CardContent className="space-y-3 p-4 text-sm">
                <p className="eyebrow text-muted-foreground">
                  {message.role === "user" ? "You" : "Concierge"}
                </p>
                {message.parts.map((part, index) => {
                  const key = `${message.id}-${index}`;
                  if (part.type === "text") {
                    if (message.role === "user") {
                      return (
                        <p key={key} className="whitespace-pre-wrap">
                          {part.text}
                        </p>
                      );
                    }
                    return (
                      <MarkdownText
                        key={key}
                        text={part.text}
                        streaming={streamingThis && index === lastTextIndex}
                      />
                    );
                  }
                  if (!isToolUIPart(part)) return null;
                  if (part.state === "input-streaming" || part.state === "input-available") {
                    return <ToolStatus key={key} label={toolStatusLabel(part.type)} />;
                  }
                  if (part.state === "output-error") {
                    return (
                      <p key={key} className="text-sm text-destructive">
                        {part.errorText || "That lookup failed. Try another question."}
                      </p>
                    );
                  }
                  if (part.state !== "output-available") return null;
                  if (part.type === "tool-searchFlights") {
                    return <FlightTicketList key={key} output={part.output} onUseFlight={pickFlight} />;
                  }
                  if (part.type === "tool-getFlightDetails") {
                    return (
                      <FlightDetailsCard
                        key={key}
                        output={part.output}
                        onUseFlight={(flightId) => pickFlight(flightId, "economy")}
                      />
                    );
                  }
                  if (part.type === "tool-recommendSeats" || part.type === "tool-getSeatMap") {
                    return <SeatRecsCard key={key} output={part.output} />;
                  }
                  if (part.type === "tool-searchCatalogByMeaning") {
                    return <CatalogChips key={key} output={part.output} />;
                  }
                  if (
                    part.type === "tool-draftItinerary" ||
                    part.type === "tool-getFlightsPageHref" ||
                    part.type === "tool-getSeatPickerHref"
                  ) {
                    return <HandoffConfirm key={key} output={part.output} />;
                  }
                  if (part.type === "tool-listMyTrips" || part.type === "tool-getMyBooking") {
                    return <TripCards key={key} output={part.output} />;
                  }
                  return null;
                })}
                {streamingThis && textParts.every((part) => !part.text) ? (
                  <MarkdownText text="" streaming />
                ) : null}
              </CardContent>
            </Card>
          );
        })}
        {status === "submitted" ? (
          <Card>
            <CardContent className="p-4">
              <ToolStatus label="Concierge is writing" />
            </CardContent>
          </Card>
        ) : null}
        <div ref={bottomRef} />
      </div>
      {followUps.length > 0 ? (
        <FollowUpChips items={followUps} disabled={busy} onPick={ask} />
      ) : null}
      <form
        className="grid gap-3 border-t border-border pt-5"
        onSubmit={(event) => {
          event.preventDefault();
          ask(input);
        }}
      >
        <Textarea
          className="min-h-24 resize-y border-border bg-background/80 p-4 text-sm shadow-none"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about flights, window seats, aisle seats, or your trips"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              ask(input);
            }
          }}
        />
        {error ? (
          <p role="alert" className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error.message || "Concierge could not answer that. Try another preset or send again."}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="h-9 min-w-24" disabled={busy || !input.trim()}>
            {status === "streaming" ? "Writing..." : status === "submitted" ? "Starting..." : "Send"}
          </Button>
          {busy && status !== "submitted" ? (
            <Button type="button" variant="outline" onClick={() => void stop()}>
              Stop
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
