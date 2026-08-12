/**
 * ASCII-art banner generator.
 *
 * Renders text as large block letters using an embedded 5×5 pixel
 * font, ideal for CLI splash screens, section headers, and build
 * success screens. Supports a custom fill character, per-banner color
 * (via the `banner.text` theme slot or an explicit color), letter
 * spacing, and an automatic plain-mode fallback (ASCII `#` fill, no
 * ANSI) for dumb terminals, log scrapers, and screen readers.
 */

import { isPlainMode } from "./accessibility";
import { getConfig } from "./config";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";

export type BannerStyle = "block";

export interface BannerOptions {
	/** Character used to paint filled cells. Defaults to `█`; forced to `#` in plain mode. */
	fill?: string;
	/** Foreground color for the whole banner. Falls back to the `banner.text` theme slot (default: bold). */
	color?: ColorStyle;
	/** Separator between glyphs. Defaults to two spaces. */
	gap?: string;
	/** Paint each font cell as 2 columns (default `true`) so the 5×5 font reads square. Pass `false` for a narrow variant. */
	double?: boolean;
}

/**
 * Render `text` as large block art.
 *
 * @example
 * ```ts
 * console.log(banner("GO", { fill: "#", color: "green" }))
 * ```
 */
export function banner(text: string, options?: BannerOptions): string {
	const plain = isPlainMode();
	const fill = plain ? "#" : (options?.fill ?? "█");
	const gap = options?.gap ?? "  ";
	const double = options?.double ?? true;

	if (text === "") return "";

	const theme = getConfig().theme;
	const colorFn = resolveColor(
		"banner.text",
		theme,
		plain ? undefined : options?.color,
	).apply;

	const glyphs = Array.from(text).map((ch) => FONT[ch] ?? FONT[" "]);
	const rows: string[] = [];
	for (let row = 0; row < 5; row++) {
		const line = glyphs
			.map((glyph) => {
				const cells = glyph[row];
				return cells
					.split("")
					.map((c) =>
						c === "#" ? fill.repeat(double ? 2 : 1) : double ? "  " : " ",
					)
					.join("");
			})
			.join(gap);
		rows.push(line);
	}

	const out = rows.map((row) => row.trimEnd()).join("\n");
	if (plain) return out;
	return colorFn(out);
}

/**
 * Render `text` as block art and return the rows as an array.
 */
export function bannerLines(text: string, options?: BannerOptions): string[] {
	const whole = banner(text, options);
	return whole.split("\n");
}

// ── 5×5 block font ──────────────────────────────────────────────
// `#` = filled cell, `.` = empty cell. Covers A–Z, 0–9, and common
// punctuation; unknown characters fall back to a space.
const FONT: Record<string, string[]> = {
	A: [".###.", "#...#", "#####", "#...#", "#...#"],
	B: ["####.", "#...#", "####.", "#...#", "####."],
	C: [".###.", "#...#", "#....", "#...#", ".###."],
	D: ["####.", "#...#", "#...#", "#...#", "####."],
	E: ["#####", "#....", "####.", "#....", "#####"],
	F: ["#####", "#....", "####.", "#....", "#...."],
	G: [".###.", "#...#", "#..##", "#...#", ".####"],
	H: ["#...#", "#...#", "#####", "#...#", "#...#"],
	I: ["#####", "..#..", "..#..", "..#..", "#####"],
	J: ["..###", "...#.", "...#.", "#..#.", ".##.."],
	K: ["#...#", "#..#.", "###..", "#..#.", "#...#"],
	L: ["#....", "#....", "#....", "#....", "#####"],
	M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
	N: ["#...#", "##..#", "#.#.#", "#..##", "#...#"],
	O: [".###.", "#...#", "#...#", "#...#", ".###."],
	P: ["####.", "#...#", "####.", "#....", "#...."],
	Q: [".###.", "#...#", "#...#", "#..##", ".##.#"],
	R: ["####.", "#...#", "####.", "#..#.", "#...#"],
	S: [".####", "#....", ".###.", "....#", "####."],
	T: ["#####", "..#..", "..#..", "..#..", "..#.."],
	U: ["#...#", "#...#", "#...#", "#...#", ".###."],
	V: ["#...#", "#...#", "#...#", ".#.#.", "..#.."],
	W: ["#...#", "#...#", "#.#.#", "##.##", "#...#"],
	X: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
	Y: ["#...#", "#...#", ".#.#.", "..#..", "..#.."],
	Z: ["#####", "...#.", "..#..", ".#...", "#####"],
	0: [".###.", "#..##", "#.#.#", "##..#", ".###."],
	1: ["..#..", ".##..", "..#..", "..#..", "#####"],
	2: [".###.", "....#", "..##.", ".#...", "#####"],
	3: ["####.", "....#", ".###.", "....#", "####."],
	4: ["#..#.", "#..#.", "#####", "...#.", "...#."],
	5: ["#####", "#....", "####.", "....#", "####."],
	6: [".###.", "#....", "####.", "#...#", ".###."],
	7: ["#####", "...#.", "..#..", ".#...", ".#..."],
	8: [".###.", "#...#", ".###.", "#...#", ".###."],
	9: [".###.", "#...#", ".####", "....#", ".###."],
	" ": [".....", ".....", ".....", ".....", "....."],
	"-": [".....", ".....", "#####", ".....", "....."],
	"_": [".....", ".....", ".....", ".....", "#####"],
	"!": ["..#..", "..#..", "..#..", ".....", "..#.."],
	"?": [".###.", "#...#", "..#..", ".....", "..#.."],
	":": [".....", "..#..", ".....", "..#..", "....."],
	".": [".....", ".....", ".....", ".....", "..#.."],
	",": [".....", ".....", ".....", "..#..", ".#..."],
	"/": ["....#", "...#.", "..#..", ".#...", "#...."],
	"+": ["..#..", "..#..", "#####", "..#..", "..#.."],
	"=": [".....", "#####", ".....", "#####", "....."],
	"*": ["#.#.#", ".#.#.", "#####", ".#.#.", "#.#.#"],
	"@": [".###.", "#...#", "#.###", "#...#", ".###."],
};
