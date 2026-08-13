/**
 * ASCII-art banner generator.
 *
 * Renders text with an embedded ANSI Shadow figlet font — the classic
 * heavy-shadow look from READMEs and CLI tools. Glyph spacing, kerning
 * and baselines match the original FIGfont: letters sit flush with the
 * font's own internal padding. Supports a custom fill character,
 * per-banner color (via the `banner.text` theme slot or an explicit
 * color), letter spacing, a solid doubled variant, figlet-style glyph
 * smushing, and an automatic plain-mode fallback (ASCII `#` fill, no
 * ANSI) for dumb terminals, log scrapers, and screen readers.
 */

import { isPlainMode } from "./accessibility";
import { getConfig } from "./config";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";

export type BannerStyle = "block";

export type BannerLayout = "flush" | "smush";

export interface BannerOptions {
	/** Paint every non-space cell with this character. Defaults to the native shadow glyphs. */
	fill?: string;
	/** Foreground color for the whole banner. Falls back to the `banner.text` theme slot (default: bold). */
	color?: ColorStyle;
	/** Extra separator between glyphs (ignored in `smush` layout). Defaults to no gap — the font's internal spacing handles kerning. */
	gap?: string;
	/** Render a solid variant with each cell doubled (default `false`). */
	double?: boolean;
	/**
	 * How glyphs are joined horizontally:
	 * - `"flush"` (default) — glyphs sit side by side, flush, using the
	 *   font's own internal padding for spacing.
	 * - `"smush"` — glyphs overlap like figlet's universal smushing:
	 *   the later glyph wins where ink collides, and spaces collapse to
	 *   the font's hardblank width. `gap` is ignored.
	 */
	layout?: BannerLayout;
}

/**
 * Render `text` as large shadow art.
 *
 * @example
 * ```ts
 * console.log(banner("GO", { fill: "#", color: "green" }))
 * ```
 */
export function banner(text: string, options?: BannerOptions): string {
	const plain = isPlainMode();
	const fill = plain ? "#" : options?.fill;
	const gap = options?.gap ?? "";
	const double = options?.double ?? false;
	const smush = options?.layout === "smush";

	if (text === "") return "";

	const theme = getConfig().theme;
	const colorFn = resolveColor(
		"banner.text",
		theme,
		plain ? undefined : options?.color,
	).apply;

	const glyphs = Array.from(text).map((ch) => FONT[ch] ?? FONT[" "]);
	const height = Math.max(...glyphs.map((glyph) => glyph.length));
	const rows = smush
		? smushGlyphs(glyphs, height)
		: Array.from({ length: height }, (_, row) =>
				glyphs.map((glyph) => glyph[row] ?? "").join(gap),
			);

	// Hardblanks are never ink — they become spaces in the output.
	let out = rows.join("\n").replace(/\$/g, " ");

	if (double) {
		// Solid blocks: replace every cell with the fill, then double
		// horizontally and vertically for the chunky look.
		const scaled = out.split("\n").map((row) =>
			[...row.replace(/[^ ]/g, fill ?? "█")]
				.map((cell) => (cell === " " ? "  " : cell + cell))
				.join(""),
		);
		const big: string[] = [];
		for (const row of scaled) big.push(row, row);
		out = big.join("\n");
	} else if (fill) {
		out = out.replace(/[^ \n]/g, fill);
	}

	// Drop blank leading/trailing rows and trailing whitespace.
	const lines = out.split("\n");
	while (lines.length && lines[0].trim() === "") lines.shift();
	while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
	out = lines.map((line) => line.trimEnd()).join("\n");

	if (plain || out === "") return out;
	return colorFn(out);
}

/**
 * Render `text` as shadow art and return the rows as an array.
 */
export function bannerLines(text: string, options?: BannerOptions): string[] {
	const whole = banner(text, options);
	return whole.split("\n");
}

// ── Figlet universal smushing ─────────────────────────────────────
// The font uses "$" as the hardblank sub-character (figlet's marker for
// "blank that must not be smushed away" — e.g. the space glyph's edges).
// Smushing follows the FIGlet "universal smushing" layout: glyphs slide
// left until ink collides, the later glyph wins on collision, and a
// hardblank collision backs off one column.

/** How many columns `right` may overlap `left` under universal smushing. */
function smushLength(left: string, right: string): number {
	if (left.length === 0) return 0;
	const maxDist = left.length;
	let curDist = 1;
	outer: while (curDist <= maxDist) {
		const seg1 = left.slice(left.length - curDist);
		const seg2 = right.slice(0, Math.min(curDist, right.length));
		const n = Math.min(curDist, right.length);
		for (let i = 0; i < n; i++) {
			const ch1 = seg1[i];
			const ch2 = seg2[i];
			if (ch1 !== " " && ch2 !== " ") {
				// Universal smushing allows the collision; a hardblank
				// collision backs off one column.
				if (ch1 === "$" || ch2 === "$") curDist -= 1;
				break outer;
			}
		}
		curDist++;
	}
	return Math.min(maxDist, curDist);
}

/** Universal smush of two colliding cells: the later glyph wins. */
function smushCell(ch1: string, ch2: string): string {
	if (ch2 === " " || ch2 === "") return ch1;
	if (ch2 === "$" && ch1 !== " ") return ch1;
	return ch2;
}

/** Merge `right` onto `left`, overlapping by `overlap` columns. */
function smushRow(left: string, right: string, overlap: number): string {
	const len1 = left.length;
	const len2 = right.length;
	const piece1 = left.slice(0, Math.max(0, len1 - overlap));
	let piece2 = "";
	for (let j = 0; j < overlap; j++) {
		const ch1 = j < len1 ? left[len1 - overlap + j] : " ";
		const ch2 = j < len2 ? right[j] : " ";
		piece2 += smushCell(ch1, ch2);
	}
	return piece1 + piece2 + right.slice(overlap);
}

/** Smush a sequence of glyphs into a single row block. */
function smushGlyphs(
	glyphs: readonly (readonly string[])[],
	height: number,
): string[] {
	const acc = Array.from({ length: height }, () => "");
	for (const glyph of glyphs) {
		// The leading row is a synthetic blank used for accent marks; the
		// real figlet rows (1..height-1) decide the overlap.
		let overlap = 10000;
		for (let row = 1; row < height; row++) {
			overlap = Math.min(overlap, smushLength(acc[row], glyph[row] ?? ""));
		}
		overlap = overlap === 10000 ? 0 : overlap;
		// Accent marks sit at the same column as the letters: pad the
		// accumulated top row to the letters' width before merging.
		const leftW = Math.max(...acc.slice(1).map((r) => r.length));
		for (let row = 1; row < height; row++) {
			acc[row] = smushRow(acc[row], glyph[row] ?? "", overlap);
		}
		acc[0] = smushRow(acc[0].padEnd(leftW, " "), glyph[0] ?? "", overlap);
	}
	return acc;
}

// ── Embedded ANSI Shadow FIGfont ───────────────────────────────
// Each glyph is 8 rows: a blank leading row (so accents align on the
// baseline) followed by the font's 7 rows verbatim — internal padding
// and baselines match the original FIGfont, so letters kern exactly
// like real figlet. "$" is the font's hardblank (becomes a space in
// output). Unknown characters fall back to a blank glyph.
// Accented vowels add an accent row on top of their base letter.
const FONT: Record<string, readonly string[]> = {
	"0": ["", " ██████╗ ", "██╔═████╗", "██║██╔██║", "████╔╝██║", "╚██████╔╝", " ╚═════╝ ", "         "],
	"1": ["", " ██╗", "███║", "╚██║", " ██║", " ██║", " ╚═╝", "    "],
	"2": ["", "██████╗ ", "╚════██╗", " █████╔╝", "██╔═══╝ ", "███████╗", "╚══════╝", "        "],
	"3": ["", "██████╗ ", "╚════██╗", " █████╔╝", " ╚═══██╗", "██████╔╝", "╚═════╝ ", "        "],
	"4": ["", "██╗  ██╗", "██║  ██║", "███████║", "╚════██║", "     ██║", "     ╚═╝", "        "],
	"5": ["", "███████╗", "██╔════╝", "███████╗", "╚════██║", "███████║", "╚══════╝", "        "],
	"6": ["", " ██████╗ ", "██╔════╝ ", "███████╗ ", "██╔═══██╗", "╚██████╔╝", " ╚═════╝ ", "         "],
	"7": ["", "███████╗", "╚════██║", "    ██╔╝", "   ██╔╝ ", "   ██║  ", "   ╚═╝  ", "        "],
	"8": ["", " █████╗ ", "██╔══██╗", "╚█████╔╝", "██╔══██╗", "╚█████╔╝", " ╚════╝ ", "        "],
	"9": ["", " █████╗ ", "██╔══██╗", "╚██████║", " ╚═══██║", " █████╔╝", " ╚════╝ ", "        "],
	" ": ["", "$  $", "$  $", "$  $", "$  $", "$  $", "$  $", "$  $"],
	"!": ["", "██╗", "██║", "██║", "╚═╝", "██╗", "╚═╝", "   "],
	"\"": ["", "██╗ ██╗", "╚═╝ ╚═╝", "       ", "       ", "       ", "       ", "       "],
	"#": ["", " ██╗ ██╗ ", "████████╗", "╚██╔═██╔╝", "████████╗", "╚██╔═██╔╝", " ╚═╝ ╚═╝ ", "         "],
	"$": ["", "▄▄███▄▄·", "██╔════╝", "███████╗", "╚════██║", "███████║", "╚═▀▀▀══╝", "        "],
	"%": ["", "██╗ ██╗", "╚═╝██╔╝", "  ██╔╝ ", " ██╔╝  ", "██╔╝██╗", "╚═╝ ╚═╝", "       "],
	"&": ["", "   ██╗   ", "   ██║   ", "████████╗", "██╔═██╔═╝", "██████║  ", "╚═════╝  ", "         "],
	"'": ["", "██╗", "╚═╝", "   ", "   ", "   ", "   ", "   "],
	"(": ["", " ██╗", "██╔╝", "██║ ", "██║ ", "╚██╗", " ╚═╝", "    "],
	")": ["", "██╗ ", "╚██╗", " ██║", " ██║", "██╔╝", "╚═╝ ", "    "],
	"*": ["", "      ", "▄ ██╗▄", " ████╗", "▀╚██╔▀", "  ╚═╝ ", "      ", "      "],
	"+": ["", "  ██╗  ", "  ██║  ", "██████╗", "  ╚═╝  ", "       ", "       ", "       "],
	",": ["", "   ", "   ", "   ", "   ", "▄█╗", "╚═╝", "   "],
	"-": ["", "      ", "      ", "█████╗", "╚════╝", "      ", "      ", "      "],
	".": ["", "   ", "   ", "   ", "   ", "██╗", "╚═╝", "   "],
	"/": ["", "    ██╗", "   ██╔╝", "  ██╔╝ ", " ██╔╝  ", "██╔╝   ", "╚═╝    ", "       "],
	":": ["", "   ", "██╗", "╚═╝", "██╗", "╚═╝", "   ", "   "],
	";": ["", "   ", "██╗", "╚═╝", "▄█╗", "▀═╝", "   ", "   "],
	"<": ["", "  ██╗", " ██╔╝", "██╔╝ ", "╚██╗ ", " ╚██╗", "  ╚═╝", "     "],
	"=": ["", "      ", "███████╗", "╚══════╝", "███████╗", "╚══════╝", "      ", "      "],
	">": ["", "██╗  ", "╚██╗ ", " ╚██╗", " ██╔╝", "██╔╝ ", "╚═╝  ", "     "],
	"?": ["", "██████╗ ", "╚════██╗", "  ▄███╔╝", "  ▀▀══╝ ", "  ██╗   ", "  ╚═╝   ", "        "],
	"@": ["", " ██████╗ ", "██╔═══██╗", "██║██╗██║", "██║██║██║", "╚█║████╔╝", " ╚╝╚═══╝ ", "         "],
	"A": ["", " █████╗ ", "██╔══██╗", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝", "        "],
	"B": ["", "██████╗ ", "██╔══██╗", "██████╔╝", "██╔══██╗", "██████╔╝", "╚═════╝ ", "        "],
	"C": ["", " ██████╗", "██╔════╝", "██║     ", "██║     ", "╚██████╗", " ╚═════╝", "        "],
	"D": ["", "██████╗ ", "██╔══██╗", "██║  ██║", "██║  ██║", "██████╔╝", "╚═════╝ ", "        "],
	"E": ["", "███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "███████╗", "╚══════╝", "        "],
	"F": ["", "███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "██║     ", "╚═╝     ", "        "],
	"G": ["", " ██████╗ ", "██╔════╝ ", "██║  ███╗", "██║   ██║", "╚██████╔╝", " ╚═════╝ ", "         "],
	"H": ["", "██╗  ██╗", "██║  ██║", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝", "        "],
	"I": ["", "██╗", "██║", "██║", "██║", "██║", "╚═╝", "   "],
	"J": ["", "     ██╗", "     ██║", "     ██║", "██   ██║", "╚█████╔╝", " ╚════╝ ", "        "],
	"K": ["", "██╗  ██╗", "██║ ██╔╝", "█████╔╝ ", "██╔═██╗ ", "██║  ██╗", "╚═╝  ╚═╝", "        "],
	"L": ["", "██╗     ", "██║     ", "██║     ", "██║     ", "███████╗", "╚══════╝", "        "],
	"M": ["", "███╗   ███╗", "████╗ ████║", "██╔████╔██║", "██║╚██╔╝██║", "██║ ╚═╝ ██║", "╚═╝     ╚═╝", "           "],
	"N": ["", "███╗   ██╗", "████╗  ██║", "██╔██╗ ██║", "██║╚██╗██║", "██║ ╚████║", "╚═╝  ╚═══╝", "          "],
	"O": ["", " ██████╗ ", "██╔═══██╗", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ ", "         "],
	"P": ["", "██████╗ ", "██╔══██╗", "██████╔╝", "██╔═══╝ ", "██║     ", "╚═╝     ", "        "],
	"Q": ["", " ██████╗ ", "██╔═══██╗", "██║   ██║", "██║▄▄ ██║", "╚██████╔╝", " ╚══▀▀═╝ ", "         "],
	"R": ["", "██████╗ ", "██╔══██╗", "██████╔╝", "██╔══██╗", "██║  ██║", "╚═╝  ╚═╝", "        "],
	"S": ["", "███████╗", "██╔════╝", "███████╗", "╚════██║", "███████║", "╚══════╝", "        "],
	"T": ["", "████████╗", "╚══██╔══╝", "   ██║   ", "   ██║   ", "   ██║   ", "   ╚═╝   ", "         "],
	"U": ["", "██╗   ██╗", "██║   ██║", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ ", "         "],
	"V": ["", "██╗   ██╗", "██║   ██║", "██║   ██║", "╚██╗ ██╔╝", " ╚████╔╝ ", "  ╚═══╝  ", "         "],
	"W": ["", "██╗    ██╗", "██║    ██║", "██║ █╗ ██║", "██║███╗██║", "╚███╔███╔╝", " ╚══╝╚══╝ ", "          "],
	"X": ["", "██╗  ██╗", "╚██╗██╔╝", " ╚███╔╝ ", " ██╔██╗ ", "██╔╝ ██╗", "╚═╝  ╚═╝", "        "],
	"Y": ["", "██╗   ██╗", "╚██╗ ██╔╝", " ╚████╔╝ ", "  ╚██╔╝  ", "   ██║   ", "   ╚═╝   ", "         "],
	"Z": ["", "███████╗", "╚══███╔╝", "  ███╔╝ ", " ███╔╝  ", "███████╗", "╚══════╝", "        "],
	"[": ["", "███╗", "██╔╝", "██║ ", "██║ ", "███╗", "╚══╝", "    "],
	"\\": ["", "██╗    ", "╚██╗   ", " ╚██╗  ", "  ╚██╗ ", "   ╚██╗", "    ╚═╝", "       "],
	"]": ["", "███╗", "╚██║", " ██║", " ██║", "███║", "╚══╝", "    "],
	"^": ["", " ███╗ ", "██╔██╗", "╚═╝╚═╝", "      ", "      ", "      ", "      "],
	"_": ["", "        ", "        ", "        ", "        ", "███████╗", "╚══════╝", "        "],
	"`": ["", "██╗", "╚═╝", "   ", "   ", "   ", "   ", "   "],
	"a": ["", " █████╗ ", "██╔══██╗", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝", "        "],
	"b": ["", "██████╗ ", "██╔══██╗", "██████╔╝", "██╔══██╗", "██████╔╝", "╚═════╝ ", "        "],
	"c": ["", " ██████╗", "██╔════╝", "██║     ", "██║     ", "╚██████╗", " ╚═════╝", "        "],
	"d": ["", "██████╗ ", "██╔══██╗", "██║  ██║", "██║  ██║", "██████╔╝", "╚═════╝ ", "        "],
	"e": ["", "███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "███████╗", "╚══════╝", "        "],
	"f": ["", "███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "██║     ", "╚═╝     ", "        "],
	"g": ["", " ██████╗ ", "██╔════╝ ", "██║  ███╗", "██║   ██║", "╚██████╔╝", " ╚═════╝ ", "         "],
	"h": ["", "██╗  ██╗", "██║  ██║", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝", "        "],
	"i": ["", "██╗", "██║", "██║", "██║", "██║", "╚═╝", "   "],
	"j": ["", "     ██╗", "     ██║", "     ██║", "██   ██║", "╚█████╔╝", " ╚════╝ ", "        "],
	"k": ["", "██╗  ██╗", "██║ ██╔╝", "█████╔╝ ", "██╔═██╗ ", "██║  ██╗", "╚═╝  ╚═╝", "        "],
	"l": ["", "██╗     ", "██║     ", "██║     ", "██║     ", "███████╗", "╚══════╝", "        "],
	"m": ["", "███╗   ███╗", "████╗ ████║", "██╔████╔██║", "██║╚██╔╝██║", "██║ ╚═╝ ██║", "╚═╝     ╚═╝", "           "],
	"n": ["", "███╗   ██╗", "████╗  ██║", "██╔██╗ ██║", "██║╚██╗██║", "██║ ╚████║", "╚═╝  ╚═══╝", "          "],
	"o": ["", " ██████╗ ", "██╔═══██╗", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ ", "         "],
	"p": ["", "██████╗ ", "██╔══██╗", "██████╔╝", "██╔═══╝ ", "██║     ", "╚═╝     ", "        "],
	"q": ["", " ██████╗ ", "██╔═══██╗", "██║   ██║", "██║▄▄ ██║", "╚██████╔╝", " ╚══▀▀═╝ ", "         "],
	"r": ["", "██████╗ ", "██╔══██╗", "██████╔╝", "██╔══██╗", "██║  ██║", "╚═╝  ╚═╝", "        "],
	"s": ["", "███████╗", "██╔════╝", "███████╗", "╚════██║", "███████║", "╚══════╝", "        "],
	"t": ["", "████████╗", "╚══██╔══╝", "   ██║   ", "   ██║   ", "   ██║   ", "   ╚═╝   ", "         "],
	"u": ["", "██╗   ██╗", "██║   ██║", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ ", "         "],
	"v": ["", "██╗   ██╗", "██║   ██║", "██║   ██║", "╚██╗ ██╔╝", " ╚████╔╝ ", "  ╚═══╝  ", "         "],
	"w": ["", "██╗    ██╗", "██║    ██║", "██║ █╗ ██║", "██║███╗██║", "╚███╔███╔╝", " ╚══╝╚══╝ ", "          "],
	"x": ["", "██╗  ██╗", "╚██╗██╔╝", " ╚███╔╝ ", " ██╔██╗ ", "██╔╝ ██╗", "╚═╝  ╚═╝", "        "],
	"y": ["", "██╗   ██╗", "╚██╗ ██╔╝", " ╚████╔╝ ", "  ╚██╔╝  ", "   ██║   ", "   ╚═╝   ", "         "],
	"z": ["", "███████╗", "╚══███╔╝", "  ███╔╝ ", " ███╔╝  ", "███████╗", "╚══════╝", "        "],
	"{": ["", " ██╗ ", "██╔╝ ", "██║  ", "██║  ", "██╔╝ ", " ╚═╝ ", "     "],
	"|": ["", "██╗", "██║", "██║", "██║", "██║", "╚═╝", "   "],
	"}": ["", " ██╗", " ╚██╗", "  ██║", "  ██║", " ╚██╗", "  ╚═╝", "     "],
	"~": ["", "       ", "       ", " ▄▄╗ ▄▄╗", "╚═╝ ╚═╝", "       ", "       ", "       "],
	"á": ["   ██╗  ", " █████╗ ", "██╔══██╗", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝", "        "],
	"é": ["  ██╗   ", "███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "███████╗", "╚══════╝", "        "],
	"í": ["██╗", "██╗", "██║", "██║", "██║", "██║", "╚═╝", "   "],
	"ó": ["    ██╗  ", " ██████╗ ", "██╔═══██╗", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ ", "         "],
	"ú": ["   ██╗   ", "██╗   ██╗", "██║   ██║", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ ", "         "],
	"ñ": ["  ▄▄╗ ▄▄╗ ", "███╗   ██╗", "████╗  ██║", "██╔██╗ ██║", "██║╚██╗██║", "██║ ╚████║", "╚═╝  ╚═══╝", "          "],
	"Á": ["   ██╗  ", " █████╗ ", "██╔══██╗", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝", "        "],
	"É": ["  ██╗   ", "███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "███████╗", "╚══════╝", "        "],
	"Í": ["██╗", "██╗", "██║", "██║", "██║", "██║", "╚═╝", "   "],
	"Ó": ["    ██╗  ", " ██████╗ ", "██╔═══██╗", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ ", "         "],
	"Ú": ["   ██╗   ", "██╗   ██╗", "██║   ██║", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ ", "         "],
	"Ñ": ["  ▄▄╗ ▄▄╗ ", "███╗   ██╗", "████╗  ██║", "██╔██╗ ██║", "██║╚██╗██║", "██║ ╚████║", "╚═╝  ╚═══╝", "          "],
	"Ü": ["  ██ ██  ", "██╗   ██╗", "██║   ██║", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ ", "         "],
	"ü": ["  ██ ██  ", "██╗   ██╗", "██║   ██║", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ ", "         "],
	"¿": ["", "  ██╗   ", "  ╚═╝   ", " ▄▄══╗  ", "╚███▄╝  ", "██╔════╝", "███████╗", "        "],
	"¡": ["", "██╗", "╚═╝", "██║", "██║", "██║", "╚═╝", "   "],
	"€": ["", " ██████╗", "██╔════╝", "███████╗", "██╔════╝", "███████╗", "██╔════╝", " ╚═════╝"],
	"—": ["", "        ", "        ", "████████╗", "╚═══════╝", "        ", "        ", "        "],
	"–": ["", "      ", "      ", "█████╗", "╚════╝", "      ", "      ", "      "],
};
