import { describe, it, expect } from "vitest";
import { tokenize } from "../src/tokenizer";
import { md } from "../src/renderer";
import { stripAnsi } from "@bdocs/dui";

describe("tokenizer", () => {
	it("tokenizes headings", () => {
		const tokens = tokenize("# H1\n## H2\n### H3");
		expect(tokens).toHaveLength(3);
		expect(tokens[0]).toMatchObject({ type: "heading", level: 1 });
		expect(tokens[1]).toMatchObject({ type: "heading", level: 2 });
		expect(tokens[2]).toMatchObject({ type: "heading", level: 3 });
	});

	it("tokenizes code blocks", () => {
		const tokens = tokenize("```ts\nconst x = 1\n```");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "code", lang: "ts", code: "const x = 1" });
	});

	it("tokenizes code blocks without language", () => {
		const tokens = tokenize("```\nplain text\n```");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "code", lang: "", code: "plain text" });
	});

	it("tokenizes unordered lists", () => {
		const tokens = tokenize("- Item 1\n- Item 2");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "list", ordered: false });
	});

	it("tokenizes ordered lists", () => {
		const tokens = tokenize("1. First\n2. Second");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "list", ordered: true });
	});

	it("tokenizes blockquotes", () => {
		const tokens = tokenize("> Quote text");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "quote" });
	});

	it("tokenizes thematic breaks", () => {
		const tokens = tokenize("---");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "thematicBreak" });
	});

	it("tokenizes paragraphs", () => {
		const tokens = tokenize("Hello world.\nThis is a paragraph.");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "paragraph" });
	});

	it("separates blocks by blank lines", () => {
		const tokens = tokenize("# Title\n\nParagraph here");
		expect(tokens).toHaveLength(2);
		expect(tokens[0]).toMatchObject({ type: "heading", level: 1 });
		expect(tokens[1]).toMatchObject({ type: "paragraph" });
	});

	it("handles bold inline", () => {
		const tokens = tokenize("Hello **world**");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "paragraph" });
	});

	it("handles italic inline", () => {
		const tokens = tokenize("Hello *world*");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "paragraph" });
	});

	it("handles inline code", () => {
		const tokens = tokenize("Use `code` here");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "paragraph" });
	});

	it("handles links", () => {
		const tokens = tokenize("[text](url)");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "paragraph" });
	});

	it("handles images", () => {
		const tokens = tokenize("![alt](img.png)");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "paragraph" });
	});

	it("handles empty input", () => {
		const tokens = tokenize("");
		expect(tokens).toHaveLength(0);
	});

	it("handles tables", () => {
		const tokens = tokenize("| H1 | H2 |\n|---|---|\n| A | B |");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "table" });
	});

	it("handles complex markdown", () => {
		const md_text = `# Title

**bold** and *italic* and \`code\`

- Item 1
- Item 2

> A quote

\`\`\`ts
const x = 1
\`\`\`

---

The end.`;
		const tokens = tokenize(md_text);
		expect(tokens.length).toBeGreaterThanOrEqual(5);
	});
});

describe("renderer", () => {
	it("renders markdown with ANSI", async () => {
		const output = await md("# Hello\nThis is **bold** and `code`.");
		expect(output).toContain("Hello");
		expect(output).toContain("bold");
		expect(output).toContain("code");
		expect(output).toContain("\x1b["); // ANSI sequences
	});

	it("renders plain text", async () => {
		const output = await md("Just text");
		const clean = stripAnsi(output);
		expect(clean).toBe("Just text");
	});

	it("renders lists", async () => {
		const output = await md("- A\n- B\n- C");
		const clean = stripAnsi(output);
		expect(clean).toContain("A");
		expect(clean).toContain("B");
		expect(clean).toContain("C");
	});

	it("renders code blocks", async () => {
		const output = await md("```\ncode here\n```");
		expect(output).toContain("code here");
	});

	it("renders thematic break", async () => {
		const output = await md("---");
		expect(output.length).toBeGreaterThan(0);
	});

	it("renders blockquotes", async () => {
		const output = await md("> Quote");
		const clean = stripAnsi(output);
		expect(clean).toContain("Quote");
	});

	it("handles empty input", async () => {
		const output = await md("");
		expect(output).toBe("");
	});

	it("renders links", async () => {
		const output = await md("[click](https://example.com)");
		const clean = stripAnsi(output);
		expect(clean).toContain("click");
		expect(clean).toContain("example.com");
	});

	it("renders images", async () => {
		const output = await md("![alt](img.png)");
		const clean = stripAnsi(output);
		expect(clean).toContain("image");
	});

	it("renders all heading levels", async () => {
		const text = Array.from({ length: 6 }, (_, i) => `${"#".repeat(i + 1)} H${i + 1}`).join("\n");
		const output = await md(text);
		const clean = stripAnsi(output);
		for (let i = 1; i <= 6; i++) {
			expect(clean).toContain(`H${i}`);
		}
	});
});
