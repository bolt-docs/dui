import {
	configure,
	getConfig,
	resetConfig,
	setColorSupported,
	stripAnsi,
} from "@bdocs/dui";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { md } from "../src/renderer";
import { tokenize, tokenizeInline } from "../src/tokenizer";

describe("tokenizeInline", () => {
	it("parses bold text", () => {
		const tokens = tokenizeInline("**hello**");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "bold", content: "hello" });
	});

	it("parses italic text", () => {
		const tokens = tokenizeInline("*italic*");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "italic", content: "italic" });
	});

	it("parses inline code", () => {
		const tokens = tokenizeInline("`code`");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "code", content: "code" });
	});

	it("parses links", () => {
		const tokens = tokenizeInline("[text](https://example.com)");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({
			type: "link",
			content: "text",
			url: "https://example.com",
		});
	});

	it("parses images", () => {
		const tokens = tokenizeInline("![alt text](image.png)");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({
			type: "image",
			alt: "alt text",
			url: "image.png",
		});
	});

	it("parses multiple inline elements", () => {
		const tokens = tokenizeInline("**bold** and *italic*");
		// bold token + 5 text tokens (" and ") + italic token = 7
		expect(tokens[0]).toMatchObject({ type: "bold", content: "bold" });
		const textTokens = tokens.filter((t) => t.type === "text");
		expect(textTokens.map((t) => t.content).join("")).toBe(" and ");
		const lastToken = tokens[tokens.length - 1];
		expect(lastToken).toMatchObject({ type: "italic", content: "italic" });
	});

	it("parses plain text", () => {
		const tokens = tokenizeInline("just plain text");
		expect(tokens).toHaveLength(15); // one per character
		expect(tokens[0]).toMatchObject({ type: "text", content: "j" });
	});

	it("handles empty input", () => {
		const tokens = tokenizeInline("");
		expect(tokens).toHaveLength(0);
	});
});

describe("tokenizer", () => {
	it("tokenizes headings", () => {
		const tokens = tokenize("# H1\n## H2\n### H3");
		expect(tokens).toHaveLength(3);
		expect(tokens[0]).toMatchObject({ type: "heading", level: 1 });
		expect(tokens[1]).toMatchObject({ type: "heading", level: 2 });
		expect(tokens[2]).toMatchObject({ type: "heading", level: 3 });
	});

	it("tokenizes all six heading levels", () => {
		for (let i = 1; i <= 6; i++) {
			const tokens = tokenize(`${"#".repeat(i)} H${i}`);
			expect(tokens[0]).toMatchObject({ type: "heading", level: i });
		}
	});

	it("tokenizes code blocks", () => {
		const tokens = tokenize("```ts\nconst x = 1\n```");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({
			type: "code",
			lang: "ts",
			code: "const x = 1",
		});
	});

	it("tokenizes code blocks without language", () => {
		const tokens = tokenize("```\nplain text\n```");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({
			type: "code",
			lang: "",
			code: "plain text",
		});
	});

	it("tokenizes multi-line code blocks", () => {
		const code = "line1\nline2\nline3";
		const tokens = tokenize("```\n" + code + "\n```");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "code", code });
	});

	it("tokenizes tildes code fences", () => {
		const tokens = tokenize("~~~\ncode\n~~~");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "code", code: "code" });
	});

	it("tokenizes unordered lists", () => {
		const tokens = tokenize("- Item 1\n- Item 2");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "list", ordered: false });
	});

	it("tokenizes unordered lists with asterisk", () => {
		const tokens = tokenize("* Item 1\n* Item 2");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "list", ordered: false });
	});

	it("tokenizes unordered lists with plus", () => {
		const tokens = tokenize("+ Item 1\n+ Item 2");
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

	it("tokenizes multi-line blockquotes", () => {
		const tokens = tokenize("> Line 1\n> Line 2\n> Line 3");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "quote" });
	});

	it("tokenizes thematic breaks with hyphens", () => {
		const tokens = tokenize("---");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "thematicBreak" });
	});

	it("tokenizes thematic breaks with asterisks", () => {
		const tokens = tokenize("***");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "thematicBreak" });
	});

	it("tokenizes thematic breaks with underscores", () => {
		const tokens = tokenize("___");
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

	it("handles whitespace-only input", () => {
		const tokens = tokenize("   \n\n  ");
		expect(tokens).toHaveLength(0);
	});

	it("handles tables", () => {
		const tokens = tokenize("| H1 | H2 |\n|---|---|\n| A | B |");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toMatchObject({ type: "table" });
	});

	it("handles tables without separator row", () => {
		const tokens = tokenize("| H1 | H2 |\n| A | B |");
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

	it("renders ordered lists", async () => {
		const output = await md("1. First\n2. Second");
		const clean = stripAnsi(output);
		expect(clean).toContain("First");
		expect(clean).toContain("Second");
		// First item should have "1."
		expect(clean).toContain("1.");
	});

	it("renders code blocks", async () => {
		const output = await md("```\ncode here\n```");
		expect(output).toContain("code here");
	});

	it("renders code blocks with border characters", async () => {
		const output = await md("```\ntest\n```");
		expect(output).toContain("┌");
		expect(output).toContain("└");
		expect(output).toContain("│");
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
		const text = Array.from(
			{ length: 6 },
			(_, i) => `${"#".repeat(i + 1)} H${i + 1}`,
		).join("\n");
		const output = await md(text);
		const clean = stripAnsi(output);
		for (let i = 1; i <= 6; i++) {
			expect(clean).toContain(`H${i}`);
		}
	});

	it("renders heading with ANSI color codes", async () => {
		const output = await md("# Big Title");
		expect(output).toContain("\x1b[");
		expect(output).toContain("Big Title");
		// The renderer must NOT leak the raw markdown `#` marker into
		// the output. Hierarchy is conveyed through color + bold + the
		// `▌` accent bar so the line reads as styled prose, not raw
		// markdown syntax.
		expect(stripAnsi(output)).not.toContain("# Big Title");
		expect(stripAnsi(output)).toContain("Big Title");
		expect(output).toContain("▌ Big Title");
	});

	it("does not render the leading `#` from any heading level", async () => {
		// Driving from markdown source the reader typed — they SHOULD
		// see styled prose after `md()`, not a copy of their markdown
		// verbatim. Asserting against each of the six levels keeps the
		// regression visible to anyone fixing heading layout.
		for (let level = 1; level <= 6; level++) {
			const text = `${"#".repeat(level)} Hidden`;
			const output = await md(text);
			const clean = stripAnsi(output);
			expect(clean).not.toContain(`${"#".repeat(level)} Hidden`);
			expect(clean).toContain("Hidden");
		}
	});

	it("indents deeper heading levels so the depth reads visually", async () => {
		// Strip ANSI so we measure space-only indent, not the colored
		// bar. H1/H2 should be flush-left; H4+ should deepen in 2-space
		// steps while still containing the label.
		const output = await md("# Top\n## Sub\n#### Deep");
		const clean = stripAnsi(output);
		expect(clean).toMatch(/^▌ Top/m);
		expect(clean).toMatch(/^▌ Sub/m);
		expect(clean).toMatch(/^ {2}▌ Deep/m);
	});

	it("renders italic text with ANSI", async () => {
		const output = await md("*italic text*");
		expect(output).toContain("\x1b[3m");
		expect(output).toContain("italic text");
	});

	it("renders table", async () => {
		const output = await md("| H1 | H2 |\n|---|---|\n| A | B |");
		const clean = stripAnsi(output);
		expect(clean).toContain("H1");
		expect(clean).toContain("H2");
		expect(clean).toContain("A");
		expect(clean).toContain("B");
	});

	it("handles markdown with only inline elements", async () => {
		const output = await md("**bold** and *italic*");
		const clean = stripAnsi(output);
		expect(clean).toContain("bold");
		expect(clean).toContain("italic");
	});

	it("handles mixed content", async () => {
		const output = await md(
			"# Title\n\n> Quote with **bold**\n\n- List item with `code`",
		);
		const clean = stripAnsi(output);
		expect(clean).toContain("Title");
		expect(clean).toContain("Quote");
		expect(clean).toContain("bold");
		expect(clean).toContain("List item");
		expect(clean).toContain("code");
	});

	it("renders checkbox lists", async () => {
		const output = await md("- [x] Done\n- [ ] Todo");
		const clean = stripAnsi(output);
		expect(clean).toContain("Done");
		expect(clean).toContain("Todo");
	});
});

describe("renderer theme integration", () => {
	// The renderer routes color slots through DUI's `colorize()`, which
	// does NOT gate on `isColorSupported` itself — BUT the broader DUI
	// toolchain (e.g. `colors.dim`) does, and several cloned helpers in
	// the renderer path read `isColorSupported` indirectly. Vitest boots
	// without a TTY so we flip the flag on for the whole describe block
	// to keep hex SGR assertions deterministic. Don't move this to
	// `afterEach` — moving silently drops SGR codes on the first run.
	beforeAll(() => {
		setColorSupported(true);
	});

	afterEach(() => {
		resetConfig();
		setColorSupported(true);
	});

	it("uses default heading color when no theme override is set", async () => {
		const output = await md("# Title");
		// Default markdown.heading1 is `#ff6e6e` → 24-bit ANSI red.
		expect(output).toMatch(/\x1b\[38;2;255;110;110m/);
	});

	it("honors theme override for headings", async () => {
		configure({ theme: { markdown: { heading1: "#00ff00" } } });
		const output = await md("# Theme Title");
		expect(output).toMatch(/\x1b\[38;2;0;255;0m/);
	});

	it("honors theme override for inline code", async () => {
		configure({
			theme: { markdown: { codeInline: { fg: "#ffcc00", bg: "#202020" } } },
		});
		const output = await md("`chip`");
		expect(output).toMatch(/\x1b\[38;2;255;204;0m/);
		expect(output).toMatch(/\x1b\[48;2;32;32;32m/);
	});

	it("emits default chip background for inline code", async () => {
		// The default `markdown.codeInline` is `{ fg: "#96c8ff",
		// bg: "#282c34" }` so out-of-the-box inline code keeps a chip
		// background instead of falling through to fg-only styling.
		const output = await md("`chip`");
		expect(output).toMatch(/\x1b\[38;2;150;200;255m/);
		expect(output).toMatch(/\x1b\[48;2;40;44;52m/);
	});

	it("honors theme override for quote bar", async () => {
		configure({ theme: { markdown: { quoteBar: "#abcdef" } } });
		const output = await md("> Quoted");
		expect(output).toMatch(/\x1b\[38;2;171;205;239m/);
	});

	it("honors theme override for list checkbox states", async () => {
		configure({
			theme: { markdown: { listCheck: "#11ff11", listCross: "#ff1111" } },
		});
		const output = await md("- [x] done\n- [ ] todo");
		expect(output).toMatch(/\x1b\[38;2;17;255;17m/);
		expect(output).toMatch(/\x1b\[38;2;255;17;17m/);
	});

	it("honors theme override for hyperlink text and url", async () => {
		configure({
			theme: { markdown: { linkText: "#112233", linkUrl: "#445566" } },
		});
		const output = await md("[label](https://example.com)");
		expect(output).toMatch(/\x1b\[38;2;17;34;51m/);
		expect(output).toMatch(/\x1b\[38;2;68;85;102m/);
	});

	it("renders default thematic break with the markdown thematic color", async () => {
		const output = await md("---");
		// Default `markdown.thematic` is `#888888` — represented as the
		// 24-bit gray (136, 136, 136) once `colorize` emits its SGR.
		expect(output).toMatch(/\x1b\[38;2;136;136;136m/);
	});

	it("honors theme override for thematic break", async () => {
		configure({ theme: { markdown: { thematic: "#999999" } } });
		const output = await md("---");
		// Thematic break is rendered directly off `markdown.thematic`,
		// so the configured hex color must appear in the SGR stream.
		expect(output).toMatch(/\x1b\[38;2;153;153;153m/);
	});

	it("falls back to defaults when theme is empty", async () => {
		configure({ theme: { markdown: {} } });
		const output = await md("# Default");
		expect(output).toMatch(/\x1b\[38;2;255;110;110m/);
	});

	it("h6 keeps its distinct slot color (#b48cff)", async () => {
		const output = await md("###### H6");
		// h6 maps to `markdown.heading6` which defaults to `#b48cff`
		// (180, 140, 255) — not the h5 fallback, so a stylesheet
		// override of `heading6` still flows through correctly.
		expect(output).toMatch(/\x1b\[38;2;180;140;255m/);
	});
});
