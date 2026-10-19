"use client";

import { markdownToReact } from "@/lib/ai/markdown";

export function MarkdownText({ text, streaming = false }: { text: string; streaming?: boolean }) {
  return markdownToReact(text, streaming);
}
