import { defineField, defineType } from "sanity";
import { BoltIcon } from "@sanity/icons/Bolt";

export const CONCIERGE_PROMPT_ID = "conciergePrompt";

export const conciergePrompt = defineType({
  name: "conciergePrompt",
  title: "Concierge prompt",
  type: "document",
  icon: BoltIcon,
  fields: [
    defineField({
      name: "title",
      type: "string",
      initialValue: "Concierge Desk",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "systemPrompt",
      title: "System prompt",
      type: "text",
      rows: 24,
      description:
        "Published text is the source of truth for Concierge Desk. New conversations pick up the latest published version.",
      validation: (rule) => rule.required().min(40),
    }),
  ],
  preview: {
    select: { title: "title" },
  },
});

export const conciergeConversation = defineType({
  name: "conciergeConversation",
  title: "Concierge conversation",
  type: "document",
  fields: [
    defineField({
      name: "threadId",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "firstMessage", type: "text", rows: 3 }),
    defineField({ name: "messageCount", type: "number" }),
    defineField({ name: "lastMessageAt", type: "datetime" }),
    defineField({
      name: "messages",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "role",
              type: "string",
              options: { list: ["user", "assistant", "system"] },
              validation: (rule) => rule.required(),
            }),
            defineField({ name: "content", type: "text", rows: 4, validation: (rule) => rule.required() }),
          ],
          preview: {
            select: { role: "role", content: "content" },
            prepare: ({ role, content }) => ({
              title: role ?? "message",
              subtitle: typeof content === "string" ? content.slice(0, 80) : "",
            }),
          },
        },
      ],
    }),
    defineField({
      name: "classification",
      type: "object",
      fields: [
        defineField({
          name: "sentiment",
          type: "string",
          options: { list: ["positive", "neutral", "negative"] },
        }),
        defineField({
          name: "successScore",
          type: "number",
          validation: (rule) => rule.min(1).max(10),
        }),
        defineField({ name: "contentGaps", type: "array", of: [{ type: "string" }] }),
        defineField({ name: "summary", type: "text", rows: 3 }),
        defineField({ name: "classifiedAt", type: "datetime" }),
      ],
    }),
  ],
  preview: {
    select: {
      firstMessage: "firstMessage",
      sentiment: "classification.sentiment",
      score: "classification.successScore",
    },
    prepare: ({ firstMessage, sentiment, score }) => ({
      title: firstMessage ? String(firstMessage).slice(0, 72) : "Concierge conversation",
      subtitle: [sentiment, typeof score === "number" ? `score ${score}/10` : "unclassified"]
        .filter(Boolean)
        .join(" · "),
    }),
  },
});
