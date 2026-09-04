import { stripAnsi, visibleLength } from "@bdocs/dui";
import { describe, expect, it } from "vitest";
import { md } from "../src/renderer";
import { tokenize, tokenizeInline } from "../src/tokenizer";

// ── Bug 1: tokenizeInline infinite loop on unmatched delimiters ─────────
//
// When an opening delimiter (`*`, `**`, `~~`, backtick, `[`) has no
// closing pair, every construct branch bails out AND the literal-text
// accumulator refuses to consume the delimiter char — so `pos` never
// advances and the loop spins forever. Any document containing a stray
// delimiter (e.g. "price 5 * 6") froze the whole CLI.
describe("tokenizeInline does not hang on unmatched delimiters", () => {
	const textOf = (tokens: ReturnType<typeof tokenizeInline>): string =>
		tokens.map((t) => (t.type === "text" ? t.content : "")).join("");

	it.each([
		"*",
		"**",
		"***",
		"~~",
		"`",
		"[unclosed",
		"[text](unclosed",
		"a * b",
		"5 * 6",
		"**unclosed",
		"`code",
		"a ~~ b",
		"plain * text with ` tick",
	])("keeps literal text for %j", (input) => {
		expect(textOf(tokenizeInline(input))).toBe(input);
	});

	it("tokenizes a paragraph containing a stray asterisk", () => {
		const blocks = tokenize("price is 5 * 6 or **bold**");
		expect(blocks).toHaveLength(1);
		const inline = (blocks[0] as { inline: ReturnType<typeof tokenizeInline> })
			.inline;
		expect(inline.some((t) => t.type === "bold")).toBe(true);
	});

	it("still parses balanced emphasis next to stray delimiters", () => {
		const tokens = tokenizeInline("*a* and **b** and * c");
		expect(tokens.some((t) => t.type === "italic")).toBe(true);
		expect(tokens.some((t) => t.type === "bold")).toBe(true);
	});
});

// ── Bug 2: renderCode right-border misalignment on CJK lines ─────────────
//
// The body padding used `stripAnsi(l).length` (UTF-16 code units) while a
// CJK char occupies 2 terminal cells — so code blocks containing CJK text
// painted the right `│` past the box edge.
describe("renderCode width handling", () => {
	it("keeps the code box right border aligned for CJK content", async () => {
		const out = await md("```\n短中文行\n```", { width: 20 });
		const widths = out.split("\n").map((l) => visibleLength(stripAnsi(l)));
		// Top border, body line and bottom border must all be the same width.
		expect(new Set(widths).size).toBe(1);
		expect(widths[0]).toBe(20);
	});

	// ── Bug 3: renderCode truncation slices ANSI sequences in half ────────
	//
	// The old code did `l.slice(0, width - 5)` on the raw highlighted
	// string: it counted escape-sequence bytes as characters and could cut
	// an SGR code in the middle (e.g. `\x1b[38;2;…m` → `\x1b[3`), which
	// corrupts every subsequent render on the terminal.
	it("truncates overlong highlighted lines without splitting ANSI codes", async () => {
		const long = "const x = 1; // " + "abcdefghij".repeat(20);
		const out = await md("```ts\n" + long + "\n```", { width: 60 });
		const lines = out.split("\n");
		const [top, ...rest] = lines;
		for (const line of rest) {
			// Remove every complete CSI sequence; no ESC byte may remain.
			const leftover = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
			expect(leftover).not.toContain("\x1b");
			// Body + bottom border line up at `width` cells.
			expect(visibleLength(stripAnsi(line))).toBe(60);
		}
		// The top border measures `width` too — the colored ` ts` lang tag
		// intentionally protrudes *after* the box's `┐`, so only measure
		// up to and including the corner char.
		const topBorder = top.slice(0, top.indexOf("┐") + 1);
		expect(visibleLength(stripAnsi(topBorder))).toBe(60);
		// The truncated prefix must end with a full reset + ellipsis.
		const body = rest[0];
		expect(body).toMatch(/\x1b\[0m…/);
	});

	it("keeps CJK + ellipsis inside the box when truncating", async () => {
		const out = await md("```\n" + "中文".repeat(30) + "\n```", { width: 24 });
		for (const line of out.split("\n")) {
			expect(visibleLength(stripAnsi(line))).toBe(24);
		}
	});
});

// ── Bug 4: paragraph wrap splits inline styles across lines ─────────────
//
// Wrapping a styled paragraph on plain word boundaries can put the bold
// opener `\x1b[1m` at the end of one line and its reset on a later line —
// style state then leaks across the whole wrapped paragraph.
describe("renderParagraph wrap keeps ANSI balanced", () => {
	// Per line: push style-opening SGR codes, pop on resets. A correctly
	// wrapped line must finish with an empty stack.
	const sgrOpen = (line: string): number => {
		let depth = 0;
		for (const m of line.matchAll(/\x1b\[([0-9;]*)m/g)) {
			const code = m[1];
			const isReset = /^(0|2[2-9]|39|49)$/.test(code);
			if (isReset) depth = Math.max(0, depth - 1);
			else depth++;
		}
		return depth;
	};

	it("does not leak an open style onto the next wrapped line", async () => {
		const text =
			"intro **wordone wordtwo wordthree wordfour wordfive wordsix** tail";
		const out = await md(text, { width: 20 });
		const lines = out.split("\n");
		expect(lines.length).toBeGreaterThan(1);
		for (const line of lines) {
			expect(sgrOpen(line)).toBe(0);
		}
	});
});
