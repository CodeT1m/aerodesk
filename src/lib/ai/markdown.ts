import type { ReactNode } from "react";
import { createElement, Fragment } from "react";

export type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

export function splitMarkdownBlocks(source: string): MarkdownBlock[] {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let table: string[][] | null = null;

  function flushParagraph() {
    const text = paragraph.join("\n").trim();
    paragraph = [];
    if (text) blocks.push({ type: "paragraph", text });
  }

  function flushList() {
    if (!list) return;
    blocks.push({ type: "list", ordered: list.ordered, items: list.items });
    list = null;
  }

  function flushTable() {
    if (!table || table.length === 0) return;
    const [headerRow, ...rest] = table;
    const headers = headerRow ?? [];
    const rows = rest.filter((row) => !row.every((cell) => /^[-:]+$/.test(cell)));
    if (headers.length > 0) {
      blocks.push({ type: "table", headers, rows });
    }
    table = null;
  }

  function splitTableRow(line: string): string[] {
    return line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
  }

  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    const unordered = /^[-*]\s+(.+)$/.exec(line);
    const ordered = /^\d+[.)]\s+(.+)$/.exec(line);

    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushTable();
      continue;
    }

    if (/^\|.+\|$/.test(line.trim())) {
      flushParagraph();
      flushList();
      const cells = splitTableRow(line);
      if (!table) table = [cells];
      else table.push(cells);
      continue;
    }

    flushTable();

    if (heading) {
      flushParagraph();
      flushList();
      const marks = heading[1] ?? "#";
      const level = Math.min(marks.length, 3) as 1 | 2 | 3;
      blocks.push({ type: "heading", level, text: heading[2] ?? "" });
      continue;
    }

    if (unordered || ordered) {
      flushParagraph();
      const nextOrdered = Boolean(ordered);
      const item = (unordered?.[1] ?? ordered?.[1] ?? "").trim();
      if (!list || list.ordered !== nextOrdered) {
        flushList();
        list = { ordered: nextOrdered, items: [item] };
      } else {
        list.items.push(item);
      }
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  flushTable();
  return blocks;
}

export function parseInlineMarkdown(text: string, keyPrefix = "i"): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(\*\*([^*]+)\*\*|\*(?!\*)([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const key = `${keyPrefix}-${index}`;
    if (match[2]) {
      nodes.push(createElement("strong", { key }, match[2]));
    } else if (match[3]) {
      nodes.push(createElement("em", { key }, match[3]));
    } else if (match[4]) {
      nodes.push(
        createElement(
          "code",
          { key, className: "rounded bg-muted px-1 py-0.5 text-[0.85em]" },
          match[4],
        ),
      );
    } else if (match[5] && match[6]) {
      nodes.push(
        createElement(
          "a",
          {
            key,
            href: match[6],
            className: "font-medium text-sky-700 underline underline-offset-2 dark:text-sky-300",
          },
          match[5],
        ),
      );
    }
    last = match.index + match[0].length;
    index += 1;
  }

  if (last < text.length) {
    nodes.push(text.slice(last));
  }

  return nodes.length > 0 ? nodes : [text];
}

export function markdownToReact(source: string, streaming = false): ReactNode {
  const blocks = splitMarkdownBlocks(source);
  if (blocks.length === 0 && !streaming) {
    return null;
  }

  return createElement(
    "div",
    { className: "grid gap-2 text-sm leading-6 text-foreground" },
    ...blocks.map((block, index) => {
      if (block.type === "heading") {
        const Tag = block.level === 1 ? "h3" : block.level === 2 ? "h4" : "h5";
        return createElement(
          Tag,
          { key: `h-${index}`, className: "font-semibold tracking-tight" },
          ...parseInlineMarkdown(block.text, `h${index}`),
        );
      }
      if (block.type === "list") {
        return createElement(
          block.ordered ? "ol" : "ul",
          {
            key: `l-${index}`,
            className: block.ordered
              ? "grid list-decimal gap-1 pl-5"
              : "grid list-disc gap-1 pl-5",
          },
          ...block.items.map((item, itemIndex) =>
            createElement(
              "li",
              { key: `li-${index}-${itemIndex}` },
              ...parseInlineMarkdown(item, `l${index}-${itemIndex}`),
            ),
          ),
        );
      }
      if (block.type === "table") {
        return createElement(
          "div",
          { key: `t-${index}`, className: "overflow-x-auto" },
          createElement(
            "table",
            { className: "w-full border-collapse text-left text-sm" },
            createElement(
              "thead",
              null,
              createElement(
                "tr",
                { className: "border-b border-border" },
                ...block.headers.map((header, headerIndex) =>
                  createElement(
                    "th",
                    {
                      key: `th-${index}-${headerIndex}`,
                      className: "px-2 py-1.5 font-semibold",
                    },
                    ...parseInlineMarkdown(header, `th${index}-${headerIndex}`),
                  ),
                ),
              ),
            ),
            createElement(
              "tbody",
              null,
              ...block.rows.map((row, rowIndex) =>
                createElement(
                  "tr",
                  { key: `tr-${index}-${rowIndex}`, className: "border-b border-border/60" },
                  ...row.map((cell, cellIndex) =>
                    createElement(
                      "td",
                      {
                        key: `td-${index}-${rowIndex}-${cellIndex}`,
                        className: "px-2 py-1.5",
                      },
                      ...parseInlineMarkdown(cell, `td${index}-${rowIndex}-${cellIndex}`),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      }
      const lines = block.text.split("\n");
      return createElement(
        "p",
        { key: `p-${index}` },
        ...lines.flatMap((line, lineIndex) => {
          const bits = parseInlineMarkdown(line, `p${index}-${lineIndex}`);
          if (lineIndex === 0) return bits;
          return [createElement("br", { key: `br-${index}-${lineIndex}` }), ...bits];
        }),
      );
    }),
    streaming
      ? createElement("span", {
          key: "caret",
          className: "ml-0.5 inline-block h-4 w-1 animate-pulse bg-sky-500 align-middle",
          "aria-hidden": true,
        })
      : null,
    createElement(Fragment, { key: "end" }),
  );
}
