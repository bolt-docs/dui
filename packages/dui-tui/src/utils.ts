/**
 * Layout helpers shared by the TUI widgets.
 *
 * Widgets render ANSI strings whose visible width must fit inside a box /
 * bar region. Naïve `String#slice` indexes by UTF‑16 code units and breaks
 * when the string carries ANSI escape sequences (a trimmed escape code
 * corrupts terminal state) or wide glyphs (CJK / emoji). These helpers stay
 * cell-aware and never split an escape sequence.
 */

import { stripAnsi, visibleLength } from "@bdocs/dui";

// Matches a CSI escape sequence (`\x1b[ ... @-~`), e.g. `\x1b[7m`, `\x1b[38;2;…m`.
const CSI_RE = /\x1b\[[0-9;:<=>?]*[ -/]*[@-~]/;

/**
 * Truncate an ANSI-wrapped string to `maxCells` terminal cells.
 *
 * Copies whole escape sequences through untouched so a truncation can never
 * split a `\x1b[...m` code mid-way (which would leak styling into the rest
 * of the screen). Reserves 1 cell for a `…` ellipsis when truncation occurs,
 * mirroring `truncateByCells` from `@bdocs/dui`. If the input fits within
 * `maxCells` it is returned verbatim.
 */
export function truncateAnsi(text: string, maxCells: number): string {
	if (visibleLength(stripAnsi(text)) <= maxCells) return text;
	if (maxCells <= 0) return "";
	const target = Math.max(0, maxCells - 1); // 1 cell for the ellipsis
	let out = "";
	let used = 0;
	let rest = text;
	while (rest.length > 0 && used < target) {
		if (rest.startsWith("\x1b")) {
			const m = CSI_RE.exec(rest);
			if (m && m[0].length > 0) {
				out += m[0];
				rest = rest.slice(m[0].length);
				continue;
			}
		}
		const ch = rest.charAt(0);
		const w = visibleLength(ch);
		if (used + w > target) break;
		out += ch;
		used += w;
		rest = rest.slice(1);
	}
	return out + "\u2026";
}

/** Pad `text` to exactly `maxCells` cells using trailing spaces. */
export function fitCells(text: string, maxCells: number): string {
	const used = visibleLength(stripAnsi(text));
	if (used >= maxCells) return text;
	return text + " ".repeat(maxCells - used);
}