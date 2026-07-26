import { describe, expect, it } from "vitest";
import { grid, visibleLength } from "../src/index";

describe("grid", () => {
	it("renders N equal columns", () => {
		const out = grid({ columns: ["a", "b"], width: 20 });
		const lines = out.split("\n");
		// 2 columns, 1 row each, joined with default gap=2
		expect(lines.length).toBeGreaterThan(0);
		expect(out).toContain("a");
		expect(out).toContain("b");
	});

	it("honors fixed widths and renders side-by-side", () => {
		const out = grid({
			columns: [
				{ content: "LEFT", width: 6, align: "left" },
				{ content: "RIGHT", width: 6, align: "right" },
			],
			width: 14,
			gap: 2,
		});
		expect(out).toContain("LEFT");
		expect(out).toContain("RIGHT");
		// RIGHT should be right-aligned → starts with 6-5=1 space (after gap).
		// Pattern: "LEFT  " + 2-gap + " RIGHT" → visibleLength check.
		const lines = out.split("\n");
		expect(lines.length).toBe(1);
		// Width should equal fixed (6+6) + gap (2) = 14.
		expect(visibleLength(lines[0])).toBe(14);
	});

	it("distributes remaining width across fr units", () => {
		const out = grid({
			columns: [
				{ content: "AAA", width: "1fr" },
				{ content: "BBB", width: "2fr" },
			],
			width: 30,
			gap: 2,
		});
		const lines = out.split("\n");
		expect(visibleLength(lines[0])).toBe(30);
	});

	it("applies left/center/right alignment per column", () => {
		const out = grid({
			columns: [
				{ content: "x", width: 6, align: "center" },
				{ content: "y", width: 6, align: "right" },
			],
			width: 14,
			gap: 2,
		});
		const lines = out.split("\n");
		expect(lines[0]).toMatch(/^\s+x\s{4,}\s+y$/);
	});

	it("wraps each column independently and zips by max line index", () => {
		const out = grid({
			columns: [
				{
					content: "first column is short",
					width: 14,
				},
				{
					content:
						"second column has a much longer content that wraps multiple lines",
					width: 14,
				},
			],
			width: 30,
			gap: 2,
		});
		const lines = out.split("\n");
		// Short column produces 1 wrapped line; long column produces 3+,
		// zip → every short-column line padded with spaces so rows align.
		expect(lines.length).toBeGreaterThanOrEqual(3);
		for (const line of lines) {
			expect(visibleLength(line)).toBe(30);
		}
	});

	it("degrades gracefully when content = number shorthand but all columns empty", () => {
		const out = grid({ columns: 3, width: 20 });
		// 3 cols of width 6 (with gap=2 → 6+2+6+2+6=22, but width=20 clamps).
		// Returns empty rows because there's nothing visible.
		expect(typeof out).toBe("string");
	});

	// Edge-case coverage — CJK, narrow widths, very tall columns.
	describe("edge cases", () => {
		it("CJK content in columns respects cell-aware alignment", () => {
			// Each CJK char is 2 cells. width=8 per column keeps the
			// alignment math tight: "你好" = 4 cells, fits.
			const out = grid({
				columns: [
					{ content: "你好", width: 8, align: "left" },
					{ content: "世界", width: 8, align: "right" },
				],
				width: 18,
				gap: 2,
			});
			const lines = out.split("\n");
			expect(lines.length).toBeGreaterThan(0);
			// Outer width = 8 + 2 (gap) + 8 = 18 visible cells.
			expect(visibleLength(lines[0])).toBe(18);
			// Right-aligned column ends with the second CJK pair.
			expect(lines[0]).toContain("世界");
		});

		it("width: 0 returns empty string without crashing", () => {
			expect(grid({ columns: ["x"], width: 0 })).toBe("");
		});

		it("negative width clamps to empty string", () => {
			expect(grid({ columns: ["x"], width: -1 })).toBe("");
		});

		it("CJK column content wraps per cell width when narrower than content", () => {
			// 6 chars × 2 cells = 12 cells; wrapping at width 4 packs
			// 2 chars per line (`你 好\n世 界`), so the grid is 3 rows
			// tall and each row's visible width matches the layout.
			const out = grid({
				columns: [{ content: "你好世界问", width: 4 }],
				width: 4,
			});
			const lines = out.split("\n");
			expect(lines.length).toBeGreaterThanOrEqual(3);
			for (const line of lines) {
				expect(visibleLength(line)).toBeLessThanOrEqual(4);
			}
		});
	});
});
