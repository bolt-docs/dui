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
const CSI_RE = /\x1b\[[0-9;:<=>?]*[ -\/]*[@-~]/;

/**
 * Skip past a single escape sequence starting at `rest[0]`.
 * Returns the length of the escape sequence, or 0 if `rest` does not start
 * with a recognised escape.
 */
function escapeLength(rest: string): number {
	if (!rest.startsWith("\x1b")) return 0;
	// 1. CSI: \x1b[ ... @-~  (variable length, terminated by a byte in @-~)
	const csi = CSI_RE.exec(rest);
	if (csi && csi[0].length > 0) return csi[0].length;
	// 2. OSC: \x1b] ... (\x07 | \x1b\\)
	if (rest.length >= 2) {
		if (rest[1] === "]") {
			// Scan for BEL (\x07) or ST (\x1b\\)
			for (let i = 2; i < rest.length; i++) {
				if (rest[i] === "\x07") return i + 1;
				if (rest[i] === "\x1b" && rest[i + 1] === "\\") return i + 2;
			}
			// Unterminated OSC — consume everything after \x1b]
			return rest.length;
		}
		// 3. Other two-byte escapes (e.g. \x1bM, \x1b=, \x1b7, \x1b8, \x1bP, \x1b_)
		return 2;
	}
	return 1;
}

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
	let pos = 0;
	while (pos < text.length && used < target) {
		const escLen = escapeLength(text.slice(pos));
		if (escLen > 0) {
			out += text.slice(pos, pos + escLen);
			pos += escLen;
			continue;
		}
		const ch = text.charAt(pos);
		const w = visibleLength(ch);
		if (used + w > target) break;
		out += ch;
		used += w;
		pos++;
	}
	return out + "\u2026";
}

/** Pad `text` to exactly `maxCells` cells using trailing spaces. */
export function fitCells(text: string, maxCells: number): string {
	const used = visibleLength(stripAnsi(text));
	if (used >= maxCells) return text;
	return text + " ".repeat(maxCells - used);
}
