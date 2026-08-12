import { describe, expect, it, vi } from "vitest";
import { banner, bannerLines } from "../src/index";

function strip(s: string): string {
	return s.replace(
		/[\u001b\u009b](?:\[[0-9;:<=>?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\-_])/g,
		"",
	);
}

// All glyphs defined in the embedded font (see src/banner.ts).
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.!?:.,/+*=@";

describe("banner", () => {
	it("renders 5 rows for a single glyph", () => {
		const out = banner("A", { fill: "#", double: false });
		expect(out.split("\n")).toHaveLength(5);
	});

	it("renders the correct block shape", () => {
		const out = strip(banner("I", { fill: "#", double: false, gap: "" }));
		// 5x5 "I" glyph: filled top/bottom rows, single center column.
		expect(out.split("\n")[0]).toBe("#####");
		expect(out.split("\n")[1]).toBe("  #");
		expect(out.split("\n")[4]).toBe("#####");
	});

	it("doubles each cell by default", () => {
		const out = strip(banner("I", { fill: "#", gap: "" }));
		expect(out.split("\n")[0]).toBe("##########");
		expect(out.split("\n")[1]).toBe("    ##");
	});

	it("joins glyphs with the configured gap", () => {
		const out = strip(banner("HI", { fill: "#", double: false, gap: " " }));
		// H row 0 is `#   #`, I row 0 is `#####`, joined by the gap.
		expect(out.split("\n")[0]).toBe("#   # #####");
	});

	it("falls back to a blank row for unknown glyphs", () => {
		const out = strip(banner("~", { fill: "#", double: false, gap: "" }));
		expect(out.split("\n")).toEqual(["", "", "", "", ""]);
	});

	it("applies color when not in plain mode", () => {
		vi.stubEnv("NO_COLOR", "");
		vi.stubEnv("TERM", "xterm-256color");
		vi.stubEnv("PREFERS_REDUCED_MOTION", "");
		const out = banner("A", { fill: "#", color: "red" });
		expect(out).toContain("\u001b[");
		vi.unstubAllEnvs();
	});

	it("bannerLines returns the rows separately", () => {
		const rows = bannerLines("A", { fill: "#", double: false });
		expect(rows).toHaveLength(5);
	});

	it("defaults to block fill, two-space gap and doubled cells", () => {
		const rows = bannerLines("A").map(strip);
		// A row 0 is `.###.` → `  ██████` after trimming trailing spaces.
		expect(rows[0]).toBe("  ██████");
		// A row 1 is `#...#` → `██      ██`.
		expect(rows[1]).toBe("██      ██");
	});

	it("renders every glyph in the font as 5 rows of 5 cells", () => {
		for (const ch of GLYPHS) {
			const rows = banner(ch, { fill: "#", double: false, gap: "" })
				.split("\n")
				.map(strip);
			expect(rows).toHaveLength(5);
			for (const row of rows) {
				// Row content is the raw glyph (5 cells), no extra fill.
				expect(row.length).toBeLessThanOrEqual(5);
				expect(row).toMatch(/^[ #]*$/);
			}
		}
	});

	it("renders a known glyph as a golden snapshot", () => {
		const rows = bannerLines("A", { fill: "#", gap: "" }).map(strip);
		expect(rows).toEqual([
			"  ######",
			"##      ##",
			"##########",
			"##      ##",
			"##      ##",
		]);
	});

	it("renders every glyph at doubled width without stray characters", () => {
		for (const ch of GLYPHS) {
			const rows = banner(ch, { fill: "#", gap: "" })
				.split("\n")
				.map(strip);
			expect(rows).toHaveLength(5);
			expect(rows.every((r) => /^[ #]*$/.test(r))).toBe(true);
		}
	});

	it("keeps rows aligned when glyphs fill the right column", () => {
		// H is `#...#` in every row, so no row loses trailing cells.
		const rows = bannerLines("HH", { fill: "#" }).map(strip);
		expect(rows.every((r) => r.length === rows[0].length)).toBe(true);
	});

	it("trims trailing whitespace from every row", () => {
		const rows = bannerLines("E", { fill: "#", double: false });
		expect(rows.every((r) => r === r.trimEnd())).toBe(true);
	});

	it("renders multi-glyph banners with glyphs joined by the gap", () => {
		const out = strip(banner("AB", { fill: "#", double: false, gap: " " }));
		// A row 0 `.###.` → ` ### ` + gap + B row 0 `####.` → `#### `
		expect(out.split("\n")[0]).toBe(" ###  ####");
	});

	it("honors a custom fill character", () => {
		const out = strip(banner("I", { fill: "O", double: false }));
		expect(out.split("\n")[0]).toBe("OOOOO");
		expect(out.split("\n")[1]).toBe("  O");
	});

	it("handles empty text", () => {
		expect(banner("")).toBe("");
		expect(bannerLines("")).toEqual([""]);
	});

	it("handles lowercase letters as unknown glyphs", () => {
		const out = strip(banner("ab", { fill: "#", double: false, gap: " " }));
		expect(out.split("\n")).toEqual(["", "", "", "", ""]);
	});

	it("handles multi-codepoint input safely", () => {
		const out = strip(banner("A🙂", { fill: "#", double: false, gap: "" }));
		// `A` renders as its glyph; the emoji falls back to a blank glyph,
		// which trims away as trailing whitespace.
		expect(out.split("\n")[0]).toBe(" ###");
	});

	it("forces # fill in plain mode (no ANSI)", () => {
		vi.stubEnv("NO_COLOR", "1");
		vi.stubEnv("TERM", "dumb");
		const out = banner("A", { fill: "█", color: "red" });
		expect(out).not.toContain("\u001b");
		expect(out).not.toContain("█");
		expect(out).toContain("#");
		vi.unstubAllEnvs();
	});

	it("keeps the requested fill when not in plain mode", () => {
		vi.stubEnv("NO_COLOR", "");
		vi.stubEnv("TERM", "xterm-256color");
		const out = strip(banner("A", { fill: "█", color: "red" }));
		expect(out).toContain("█");
		expect(out).not.toContain("#");
		vi.unstubAllEnvs();
	});

	it("bannerLines keeps the whole banner as one styled block", () => {
		vi.stubEnv("NO_COLOR", "");
		vi.stubEnv("TERM", "xterm-256color");
		const rows = bannerLines("A", { color: "green" });
		// The first row carries the opening code, the last row the reset.
		expect(rows[0].startsWith("\u001b[")).toBe(true);
		expect(rows[rows.length - 1].endsWith("\u001b[39m")).toBe(true);
		vi.unstubAllEnvs();
	});

	it("colors the whole banner as one block", () => {
		vi.stubEnv("NO_COLOR", "");
		vi.stubEnv("TERM", "xterm-256color");
		const out = banner("GO", { color: "green" });
		// One opening code before the first row and one reset at the end.
		const codes = out.match(/\u001b\[[0-9;]*m/g) ?? [];
		expect(codes.length).toBe(2);
		vi.unstubAllEnvs();
	});
});
