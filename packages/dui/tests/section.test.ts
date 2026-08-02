import { afterEach, describe, expect, it, vi } from "vitest";
import { refreshAccessibility, resetConfig, section, stripAnsi, visibleLength } from "../src/index";

// Env vars are read LIVE from process.env by the accessibility
// heuristic. Ensure a clean slate at module load time.
process.env.NO_COLOR = "";
process.env.TERM = "xterm-256color";
process.env.PREFERS_REDUCED_MOTION = "";
refreshAccessibility();

describe("section", () => {
	afterEach(() => {
		resetConfig();
	});

	it("renders a single-line divider with title left-aligned", () => {
		const out = section({ title: "Settings", width: 30 });
		const lines = out.split("\n");
		expect(lines.length).toBe(1);
		expect(visibleLength(lines[0])).toBe(30);
		expect(lines[0]).toContain("Settings");
	});

	it("renders centered divider when align is center", () => {
		const out = section({ title: "Config", width: 30, align: "center" });
		const lines = out.split("\n");
		expect(lines.length).toBe(1);
		expect(lines[0]).toContain("Config");
		// Title should be roughly equidistant from edges
		expect(visibleLength(lines[0])).toBe(30);
	});

	it("truncates long title with ellipsis to preserve single-line geometry", () => {
		const long = "A".repeat(60);
		const out = section({ title: long, width: 20 });
		const lines = out.split("\n");
		expect(lines.length).toBe(1);
		// Even with a 60-char truncated title, divider stays 20 wide.
		expect(visibleLength(lines[0])).toBe(20);
	});

	it("falls back to a pure dashed line when even truncated title would overflow", () => {
		const out = section({ title: "X", width: 3 });
		const lines = out.split("\n");
		expect(lines.length).toBe(1);
		// ANSI-prefixed until stripped — the pure‑line fallback applies
		// the section.line color theme so consumers don't lose the
		// visual cue when titles don't fit.
		expect(stripAnsi(lines[0])).toBe("\u2500".repeat(3));
	});

	it("respects custom width", () => {
		const out = section({ title: "T", width: 50 });
		expect(visibleLength(out)).toBe(50);
	});

	// Edge cases — unicode (CJK), empty, zero width.
	describe("edge cases", () => {
		it("CJK title truncates with ellipsis to preserve strict 1-line geometry", () => {
			// Chinese characters are 2 cells each per `string-width`, so
			// 7 chars = 14 cells, wider than width=14 minus 4 reserved =
			// 10 max-title-width. truncateByCells slices by cells
			// (preserving `…` = 1 cell) so the rendered row stays at
			// exactly `width` cells visible.
			const out = section({ title: "中文标题标题标题", width: 14 });
			const lines = out.split("\n");
			expect(lines.length).toBe(1);
			expect(visibleLength(lines[0])).toBe(14);
		});

		it("CJK title with very narrow width truncates to single ellipsis", () => {
			// width=6 → maxTitleLen = 6-4 = 2 cells.
			// "中文" = 4 cells > max; target = max-1 = 1 cell; the first
			// CJK char alone is 2 cells > 1, so truncateByCells emits
			// the lone "…" character (1 cell) and the divider ends up
			// `── … ─` (6 cells visible).
			const out = section({ title: "中文", width: 6 });
			const lines = out.split("\n");
			expect(lines.length).toBe(1);
			expect(stripAnsi(lines[0])).toContain("\u2026");
			expect(visibleLength(lines[0])).toBe(6);
		});

		it("empty title renders pure dash line", () => {
			const out = section({ title: "", width: 8, align: "center" });
			const lines = out.split("\n");
			expect(lines.length).toBe(1);
			// Empty title falls back to a pure dashed line so the
			// divider still reads as a horizontal rule without the
			// centred-gap artifact of "───   ───".
			expect(stripAnsi(lines[0])).toBe("\u2500".repeat(8));
		});

		it("whitespace-only title still falls back to pure-dash", () => {
			const out = section({ title: "   ", width: 12 });
			expect(stripAnsi(out)).toBe("\u2500".repeat(12));
		});

		it("width=1 falls back to a single-cell dash line", () => {
			const out = section({ title: "T", width: 1 });
			const stripped = stripAnsi(out);
			expect(stripped).toBe("\u2500");
		});

		it("strips ANSI escapes from the title before layout", () => {
			const out = section({ title: "\u001b[31mSettings\u001b[0m", width: 30 });
			const stripped = stripAnsi(out);
			expect(stripped).toContain("Settings");
			// Width math ran on the CLEAN title — divider stays exactly 30.
			expect(visibleLength(out)).toBe(30);
		});

		it("strips OSC window-title escapes from the title", () => {
			const out = section({ title: "\u001b]0;evil\u0007Config", width: 30 });
			expect(stripAnsi(out)).toContain("Config");
			expect(out).not.toContain("\u001b]");
		});

		it("collapses newlines so the divider stays single-line", () => {
			const out = section({ title: "A\nB", width: 20 });
			expect(out.split("\n").length).toBe(1);
			expect(stripAnsi(out)).toContain("A B");
		});

		it("treats an ANSI-only title as empty and falls back to pure dash", () => {
			const out = section({ title: "\u001b[31m\u001b[0m", width: 10 });
			expect(stripAnsi(out)).toBe("\u2500".repeat(10));
		});

		it("coerces non-string titles for JS consumers", () => {
			// @ts-expect-error JS consumers can pass non-strings
			const out = section({ title: 42, width: 10 });
			expect(stripAnsi(out)).toContain("42");
		});

		it("degrades gracefully (unstyled + warning) on invalid title color", () => {
			const warn = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
			try {
				const out = section({
					title: "X",
					width: 10,
					colors: { title: "not-a-color" },
				});
				// Renders unstyled, keeps geometry, and warns once per slot.
				expect(stripAnsi(out)).toBe("\u2500\u2500 X \u2500\u2500\u2500\u2500\u2500");
				expect(warn).toHaveBeenCalled();
			} finally {
				warn.mockRestore();
			}
		});

		it("degrades gracefully (unstyled + warning) on invalid line color", () => {
			const warn = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
			try {
				const out = section({
					title: "X",
					width: 10,
					colors: { line: "not-a-color" },
				});
				expect(visibleLength(out)).toBe(10);
				expect(warn).toHaveBeenCalled();
			} finally {
				warn.mockRestore();
			}
		});
	});
});
