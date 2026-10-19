import { describe, expect, it } from "vitest";
import { parseInlineMarkdown, splitMarkdownBlocks } from "./markdown";

describe("splitMarkdownBlocks", () => {
  it("splits headings, bullets, and paragraphs", () => {
    const blocks = splitMarkdownBlocks(
      "## Window seats\n\nPick these columns:\n\n- Economy **A** and **F**\n- Business A and E\n\nConfirm in the seat map.",
    );
    expect(blocks).toEqual([
      { type: "heading", level: 2, text: "Window seats" },
      { type: "paragraph", text: "Pick these columns:" },
      { type: "list", ordered: false, items: ["Economy **A** and **F**", "Business A and E"] },
      { type: "paragraph", text: "Confirm in the seat map." },
    ]);
  });

  it("parses GitHub-style tables", () => {
    const blocks = splitMarkdownBlocks(
      "| Cabin | Columns |\n| --- | --- |\n| Economy | **A** and **F** |",
    );
    expect(blocks).toEqual([
      {
        type: "table",
        headers: ["Cabin", "Columns"],
        rows: [["Economy", "**A** and **F**"]],
      },
    ]);
  });
});

describe("parseInlineMarkdown", () => {
  it("turns double asterisks into strong nodes instead of leaving raw markers", () => {
    const nodes = parseInlineMarkdown("Choose **12A** or **12F**");
    const strong = nodes.filter(
      (node) => typeof node === "object" && node !== null && "type" in node && node.type === "strong",
    );
    expect(strong).toHaveLength(2);
    expect(nodes.some((node) => typeof node === "string" && node.includes("**"))).toBe(false);
  });
});
