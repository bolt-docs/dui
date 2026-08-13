import { describe, expect, it, vi } from "vitest";
import { banner, bannerLines } from "../src/index";

function strip(s: string): string {
	return s.replace(
		/[\u001b\u009b](?:\[[0-9;:<=>?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\-_])/g,
		"",
	);
}

// Every glyph defined in the embedded font (see src/banner.ts).
// ANSI Shadow is an uppercase-only figlet font, so a–z reuse the
// uppercase shapes; accented vowels add an accent row on top.
const GLYPHS =
	"!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~áéíóúñÁÉÍÓÚÑÜü¿¡€—–";

describe("banner", () => {
	it("renders a single glyph as 6 rows", () => {
		const out = banner("A", { fill: "#", gap: "" });
		expect(out.split("\n")).toHaveLength(6);
	});

	it("renders the correct solid shape", () => {
		const out = strip(banner("I", { fill: "#", gap: "" }));
		// "I" is a solid stem in every row.
		expect(out.split("\n")).toEqual(["###", "###", "###", "###", "###", "###"]);
	});

	it("does not double by default and doubles on request", () => {
		const single = strip(banner("I", { fill: "#", gap: "" }));
		expect(single.split("\n")).toHaveLength(6);
		expect(single.split("\n")[0]).toBe("###");

		const doubled = strip(banner("I", { fill: "#", gap: "", double: true }));
		expect(doubled.split("\n")).toHaveLength(12);
		expect(doubled.split("\n")[0]).toBe("######");
	});

	it("joins glyphs flush with no gap by default", () => {
		const out = strip(banner("HI", { fill: "#", gap: "" }));
		// H row 0 is `###  ###`, I row 0 is `###` — flush, no extra gap.
		expect(out.split("\n")[0]).toBe("###  ######");
	});

	it("kerns words like real figlet (space glyph is 4 cells)", () => {
		const out = strip(banner("a b", { fill: "#" }));
		// a's trailing space + the 4-cell space glyph = 5-cell word gap.
		expect(out.split("\n")[0]).toBe(" ######     #######");
	});

	it("falls back to a blank glyph for unknown characters", () => {
		expect(banner("ß", { fill: "#", gap: " " })).toBe("");
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
		const rows = bannerLines("A", { fill: "#", gap: "" });
		expect(rows).toHaveLength(6);
	});

	it("defaults to native shadow glyphs, flush kerning and no doubling", () => {
		const rows = bannerLines("A").map(strip);
		expect(rows).toHaveLength(6);
		// The native glyphs keep their box-drawing characters.
		expect(rows[0]).toBe(" █████╗");
		expect(rows[5]).toBe("╚═╝  ╚═╝");
	});

	it("renders every glyph in the font with only fill cells", () => {
		for (const ch of GLYPHS) {
			const rows = strip(banner(ch, { fill: "#", gap: "" })).split("\n");
			expect(rows.length).toBeGreaterThan(0);
			for (const row of rows) {
				expect(row).toMatch(/^[ #]*$/);
			}
		}
	});

	it("renders a known glyph as a golden snapshot", () => {
		const rows = bannerLines("A", { fill: "#", gap: "" }).map(strip);
		expect(rows).toEqual([
			" ######",
			"########",
			"########",
			"########",
			"###  ###",
			"###  ###",
		]);
	});

	it("renders every glyph doubled without stray characters", () => {
		for (const ch of GLYPHS) {
			const rows = strip(banner(ch, { fill: "#", gap: "", double: true })).split(
				"\n",
			);
			expect(rows.length).toBeGreaterThan(0);
			expect(rows.length % 2).toBe(0);
			for (const row of rows) {
				expect(row).toMatch(/^[ #]*$/);
			}
		}
	});

	it("keeps rows aligned when glyphs fill the right column", () => {
		// Every M row is 11 cells wide, so no row loses trailing cells.
		const rows = bannerLines("MM", { fill: "#", gap: "" }).map(strip);
		expect(rows.every((r) => r.length === rows[0].length)).toBe(true);
		expect(rows[0]).toBe("####   ########   ####");
	});

	it("trims trailing whitespace from every row", () => {
		const rows = bannerLines("E", { fill: "#" });
		expect(rows.every((r) => r === r.trimEnd())).toBe(true);
	});

	it("renders multi-glyph banners with glyphs joined by the gap", () => {
		const out = strip(banner("AB", { fill: "#", gap: " " }));
		expect(out.split("\n")[0]).toBe(" ######  #######");
	});

	it("honors a custom fill character", () => {
		const out = strip(banner("I", { fill: "O", gap: "" }));
		expect(out.split("\n")).toEqual(["OOO", "OOO", "OOO", "OOO", "OOO", "OOO"]);
	});

	it("handles empty text", () => {
		expect(banner("")).toBe("");
		expect(bannerLines("")).toEqual([""]);
	});

	it("handles unsupported characters as blank glyphs", () => {
		expect(banner("ßß", { fill: "#", gap: " " })).toBe("");
	});

	it("renders lowercase letters", () => {
		for (const ch of "abcdefghijklmnopqrstuvwxyz") {
			const art = strip(banner(ch, { fill: "#", gap: "" }));
			expect(art).not.toBe("");
		}
	});

	it("renders a lowercase glyph as a golden snapshot", () => {
		const rows = bannerLines("b", { fill: "#", gap: "" }).map(strip);
		expect(rows).toEqual([
			"#######",
			"########",
			"########",
			"########",
			"########",
			"#######",
		]);
	});

	it("renders mixed-case words end to end", () => {
		const rows = bannerLines("Hola", { fill: "#", gap: " " }).map(strip);
		expect(rows).toEqual([
			"###  ###  #######  ###       ######",
			"###  ### ######### ###      ########",
			"######## ###   ### ###      ########",
			"######## ###   ### ###      ########",
			"###  ### ######### ######## ###  ###",
			"###  ###  #######  ######## ###  ###",
		]);
	});

	it("renders the added punctuation and Spanish glyphs", () => {
		for (const ch of '()"\'#&;~|{}`áéíóúñ') {
			const art = strip(banner(ch, { fill: "#", gap: "" }));
			// Each glyph paints at least one cell instead of falling back blank.
			expect(art).not.toBe("");
		}
	});

	it("renders an accented glyph as a golden snapshot", () => {
		const rows = bannerLines("á", { fill: "#", gap: "" }).map(strip);
		expect(rows).toEqual([
			"   ###",
			" ######",
			"########",
			"########",
			"########",
			"###  ###",
			"###  ###",
		]);
	});

	it("renders an accented banner end to end", () => {
		const rows = bannerLines("ñu", { fill: "#", gap: " " }).map(strip);
		// The ñ paints the tilde accent row; the banner is 7 rows tall.
		expect(rows).toHaveLength(7);
		expect(rows[0]).toBe("  ### ###");
	});

	it("handles multi-codepoint input safely", () => {
		const out = strip(banner("A🙂", { fill: "#", gap: "" }));
		// `A` renders as its glyph; the emoji falls back to a blank glyph,
		// which trims away as trailing whitespace.
		expect(out.split("\n")[0]).toBe(" ######");
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

	it("renders the added uppercase accented and special glyphs", () => {
		for (const ch of "ÁÉÍÓÚÑÜü¿¡€—–") {
			const art = strip(banner(ch, { fill: "#", gap: "" }));
			expect(art).not.toBe("");
		}
	});

	it("centers the accent marks above their letters", () => {
		for (const ch of "áéíóúñÁÉÍÓÚÑÜü") {
			const rows = bannerLines(ch, { fill: "#", gap: "" }).map(strip);
			// The mark row must sit horizontally inside the letter rows.
			const mark = [...rows[0]].map((c, i) => (c === " " ? -1 : i)).filter((i) => i >= 0);
			let min = Infinity;
			let max = -1;
			for (const r of rows.slice(1)) {
				for (let i = 0; i < r.length; i++) {
					if (r[i] !== " ") {
						min = Math.min(min, i);
						max = Math.max(max, i);
					}
				}
			}
			expect(mark.length).toBeGreaterThan(0);
			expect(mark.every((i) => i >= min && i <= max)).toBe(true);
		}
	});

	it("renders Ü as a golden snapshot", () => {
		const rows = bannerLines("Ü", { fill: "#", gap: "" }).map(strip);
		expect(rows).toEqual([
			"  ## ##",
			"###   ###",
			"###   ###",
			"###   ###",
			"###   ###",
			"#########",
			" #######",
		]);
	});

	it("renders the inverted question mark as a golden snapshot", () => {
		const rows = bannerLines("¿", { fill: "#", gap: "" }).map(strip);
		expect(rows).toEqual([
			"  ###",
			"  ###",
			" #####",
			"######",
			"########",
			"########",
		]);
	});

	it("renders the euro sign and em dash as golden snapshots", () => {
		expect(bannerLines("€", { fill: "#", gap: "" }).map(strip)).toEqual([
			" #######",
			"########",
			"########",
			"########",
			"########",
			"########",
			" #######",
		]);
		expect(bannerLines("—", { fill: "#", gap: "" }).map(strip)).toEqual([
			"#########",
			"#########",
		]);
	});

	it("renders uppercase accented letters", () => {
		const rows = bannerLines("Á", { fill: "#", gap: "" }).map(strip);
		expect(rows).toEqual(bannerLines("á", { fill: "#", gap: "" }).map(strip));
	});
});

describe("banner smush layout", () => {
	it("smushes glyphs like figlet's universal smushing", () => {
		const rows = bannerLines("HOLA", { layout: "smush", fill: "#" }).map(strip);
		expect(rows).toEqual([
			"###  #############     ######",
			"###  #############    ########",
			"##########   #####    ########",
			"##########   #####    ########",
			"###  ####################  ###",
			"###  ####################  ###",
		]);
	});

	it("keeps native shadow glyphs when smushing", () => {
		const rows = bannerLines("CI", { layout: "smush" }).map(strip);
		expect(rows).toEqual([
			" ████████╗",
			"██╔════██║",
			"██║    ██║",
			"██║    ██║",
			"╚████████║",
			" ╚═════╚═╝",
		]);
	});

	it("preserves word gaps when smushing", () => {
		const rows = bannerLines("HELLO WORLD", { layout: "smush", fill: "#" }).map(
			strip,
		);
		// The font's hardblank edges keep a real space between words.
		expect(rows[0]).toBe(
			"###  ############    ###     #######     ###    ####################    #######",
		);
		expect(rows[0].includes("     ")).toBe(true);
	});

	it("keeps accents above their letters when smushing", () => {
		const rows = bannerLines("música", { layout: "smush" }).map(strip);
		expect(rows).toHaveLength(7);
		// The ú accent sits on the top row, above the letters.
		expect(rows[0]).toBe("             ██╗");
	});

	it("ignores the gap option in smush layout", () => {
		expect(banner("AB", { layout: "smush", gap: "X" })).toBe(
			banner("AB", { layout: "smush" }),
		);
	});

	it("renders a single glyph identically in both layouts", () => {
		expect(banner("A", { layout: "smush" })).toBe(banner("A", { layout: "flush" }));
	});

	it("smushed output is narrower than flush for dense pairs", () => {
		const w = (s: string) => s.split("\n")[0].length;
		expect(w(strip(banner("AB", { layout: "smush" })))).toBeLessThan(
			w(strip(banner("AB", { layout: "flush" }))),
		);
	});

	it("doubles the smushed shape on request", () => {
		const rows = bannerLines("I", { layout: "smush", fill: "#", double: true }).map(
			strip,
		);
		expect(rows).toHaveLength(12);
		expect(rows.every((r) => r === "######")).toBe(true);
	});
});
