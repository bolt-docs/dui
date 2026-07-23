/**
 * Pure helpers for cell sizing, label formatting, and per-row SGR scoping.
 *
 * Why per-line background-color SGR scoping?
 *   - Wrapping the whole body in a single bg SGR leaves `\x1b[48;2;…m`
 *     active across newlines. Modern terminals (Alacritty, Kitty, GNOME
 *     Terminal, Windows Terminal, …) then apply Background-Color-Erase
 *     (BCE) and paint the rest of each visual line with the active bg —
 *     producing large horizontal bands to the right of every QR row.
 *   - Scoping bg SGR per row (`<fg><bg><chars>\x1b[0m` then `\n`) means
 *     no bg is active at newline time, so BCE cannot fire.
 *
 * Why two cell sizes (`██`/`  ` vs `█`/` `)?
 *   - Natural: two chars per module keep modules square on typical
 *     1w:2h terminal cells.
 *   - Narrow: one char per module halves width when the caller caps
 *     `width`. Modules become slightly taller-than-wide but remain
 *     scannable.
 */

/** Max length of the auto-generated (encoded-text) label before ellipsis. */
export const LABEL_MAX_LENGTH = 40;

export type CellChars = { dark: string; light: string };

/**
 * Choose natural (2-char) vs narrow (1-char) cells from a width cap.
 * Caps below `moduleCount` clamp back to natural — never subsample.
 */
export function resolveCellChars(
	moduleCount: number,
	targetWidth?: number,
): CellChars {
	const naturalCols = moduleCount * 2;
	const wantNarrow =
		typeof targetWidth === "number" &&
		targetWidth < naturalCols &&
		targetWidth >= moduleCount;

	return wantNarrow ? { dark: "█", light: " " } : { dark: "██", light: "  " };
}

/**
 * Format the optional label line content.
 * Returns `null` when no label should be rendered.
 */
export function formatLabel(opts: {
	text: string;
	label: boolean | string;
	showVersion: boolean;
	version: number;
	errorCorrection: string;
}): string | null {
	const { text, label, showVersion, version, errorCorrection } = opts;

	if (label === false) return null;

	if (showVersion) {
		return `QR v${version} | ${errorCorrection}`;
	}

	if (typeof label === "string") {
		return label;
	}

	// Default: encoded payload, truncated for column hygiene
	if (text.length > LABEL_MAX_LENGTH) {
		return `${text.slice(0, LABEL_MAX_LENGTH - 3)}...`;
	}
	return text;
}

const RESET_SGR = "\x1b[0m";

/**
 * Wrap a row (or label) with per-line fg/bg SGR so the reset always
 * precedes the next newline. Never emit `\x1b[K` (EL) — that also
 * triggers BCE bands on modern terminals.
 */
export function wrapRowSgr(
	content: string,
	fgSgr: string,
	bgSgr: string,
): string {
	return `${fgSgr}${bgSgr}${content}${RESET_SGR}`;
}
