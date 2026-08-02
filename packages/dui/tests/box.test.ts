import { afterEach, describe, expect, it } from "vitest";
import { box, double, refreshAccessibility, resetConfig, round, single, visibleLength } from "../src/index";

// Env vars are read LIVE from process.env by the accessibility
// heuristic. Ensure a clean slate at module load time — vitest
// may reuse a worker whose previous file mutated env (e.g. the
// accessibility test stubs TERM=dumb).
process.env.NO_COLOR = "";
process.env.TERM = "xterm-256color";
process.env.PREFERS_REDUCED_MOTION = "";
refreshAccessibility();

describe("box", () => {
	afterEach(() => {
		resetConfig();
	});

	it("generic box renders with content", () => {
		const result = box(["hello"], { width: 20 });
		expect(result).toContain("hello");
		expect(result).toContain("╔");
		expect(result).toContain("╝");
	});

	it("double renders with title", () => {
		const result = double(["content"], { title: "Test" });
		expect(result).toContain("Test");
		expect(result).toContain("content");
		expect(result).toContain("╔");
		expect(result).toContain("╝");
	});

	it("title border row is same visible width as bottom border row", () => {
		const result = double(["content"], { title: "Title" });
		const lines = result.split("\n");
		const topLine = lines[0];
		const bottomLine = lines[lines.length - 1];
		expect(visibleLength(topLine)).toBe(visibleLength(bottomLine));
	});

	it("single renders with title", () => {
		const result = single(["body"], { title: "Title" });
		expect(result).toContain("Title");
		expect(result).toContain("┏");
		expect(result).toContain("┛");
	});

	it("round renders with title", () => {
		const result = round(["item"], { title: "Round" });
		expect(result).toContain("Round");
		expect(result).toContain("╭");
		expect(result).toContain("╯");
	});

	it("wraps long box content responsively", () => {
		const result = box(["this is a super long line of text inside a box"], {
			title: "Responsive Box",
			width: 20,
		});
		const lines = result.split("\n");
		expect(lines.length).toBeGreaterThan(4);
		expect(result).toContain("this is");
	});

	it("supports custom border color and options in box and shorthands", () => {
		const resultBox = box(["content"], { title: "Title", color: "#ff8800" });
		expect(resultBox).toContain("\x1b[38;2;255;136;0m");

		const resultRound = round(["content"], {
			title: "Title",
			color: "#ff8800",
		});
		expect(resultRound).toContain("\x1b[38;2;255;136;0m");
	});

	// New border styles (v0.7.0) — verify each literal char shows up in
	// the rendered output. These tests also lock in the BORDERS map so a
	// future regression that re-points the unicode chars is caught.
	it("renders thick border style with heavy strokes", () => {
		const out = box(["X"], { style: "thick", width: 10 });
		expect(out).toContain("\u250F"); // ┏
		expect(out).toContain("\u2501"); // ━ heavy horizontal
		expect(out).toContain("\u2503"); // ┃ heavy vertical
	});

	it("renders ascii border style with pure ASCII chars", () => {
		const out = box(["X"], { style: "ascii", width: 10 });
		expect(out).toContain("+");
		expect(out).toContain("-");
		expect(out).toContain("|");
		expect(out).not.toContain("\u2501");
		expect(out).not.toContain("\u2503");
	});

	it("renders dashed border style with dashed strokes", () => {
		const out = box(["X"], { style: "dashed", width: 10 });
		expect(out).toContain("\u2504"); // ┄ light dashed horizontal
		expect(out).toContain("\u2506"); // ┆ light dashed vertical
	});

	it("renders dotted border style with dotted strokes", () => {
		const out = box(["X"], { style: "dotted", width: 10 });
		expect(out).toContain("\u2508"); // ┈ light dotted horizontal
		expect(out).toContain("\u250A"); // ┊ light dotted vertical
	});

	// Edge-case coverage (CJK + empty + zero width).
	describe("edge cases", () => {
		it("renders empty content without crashing", () => {
			// box default style is `double` — top-left renders ╔, not ┌.
			const out = box([], { width: 10 });
			expect(out).toContain("\u2554"); // ╔
			expect(out).toContain("\u255A"); // ╚
			expect(out).toContain("\u2550"); // ═
		});

		it("renders empty content with round style (light corners)", () => {
			const out = box([], { width: 10, style: "round" });
			expect(out).toContain("\u256D"); // ╭
			expect(out).toContain("\u2570"); // ╯
		});

		it("CJK characters count as 2 cells wide (visibleLength math)", () => {
			// "你好" = 2 codepoints × 2 cells = 4.
			expect(visibleLength("你好")).toBe(4);

			// width=12, padding=1 → bordered line = 12 + 2 border = 14
			// cells of visible content; each rendered bordered line must
			// fit within `width + 2` (the outer dimension is the box
			// width including both border columns).
			const out = box(
				["测试中文文本自动换行处理逻辑"],
				{ width: 12, padding: 1 },
			);
			const lines = out.split("\n");
			for (const line of lines) {
				expect(visibleLength(line)).toBeLessThanOrEqual(14);
			}
		});

		it("truncate helper is CJK-aware: title cell count is preserved across truncation", () => {
			// A long CJK title entered into a narrow box shouldn't
			// overflow the bordered top row. With width=14 + 14 cells,
			// the bordered top should be exactly 14+2 = 16 visible
			// cells (border + truncated title + ellipsis + border).
			const out = box(["body"], {
				title: "中文标题标题标题标",
				width: 14,
			});
			expect(visibleLength(out.split("\n")[0])).toBeLessThanOrEqual(16);
		});

		// Alignment regression: an explicit width smaller than
		// content + padding used to overflow the box (wrapped lines
		// were forced to 4 cells by a floor while the borders stayed
		// at the requested narrow width), breaking the side borders.
		it("explicit width smaller than content+padding keeps borders aligned", () => {
			for (const [w, p] of [
				[5, 2],
				[6, 2],
				[8, 3],
				[3, 0],
			] as Array<[number, number]>) {
				const out = box(["abcdefghij"], { width: w, padding: p });
				const widths = new Set(
					out.split("\n").map((l) => visibleLength(l)),
				);
				expect(widths.size).toBe(1);
			}
		});

		it("title + narrow explicit width keeps every row aligned", () => {
			const out = box(["abcdefgh"], { width: 4, title: "T" });
			const widths = new Set(
				out.split("\n").map((l) => visibleLength(l)),
			);
			expect(widths.size).toBe(1);
		});
	});
});
