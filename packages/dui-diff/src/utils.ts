/**
 * Shared helpers used by every diff renderer.
 *
 * Pure functions, zero side effects.
 */

import { visibleLength, colorize } from "@bdocs/dui";
import type { ColorStyle } from "@bdocs/dui";
import type { GutterStyle } from "./types";

// ── Line splitting ────────────────────────────────────────────

/**
 * Normalize CR/CRLF line endings and split into discrete lines.
 *
 * Trailing empty lines (produced by terminating `\n`) are dropped
 * to match the line-counting of git-style diffs.
 */
export function splitLines(text: string): string[] {
	const normalized = text.replace(/\r\n?/g, "\n");
	if (normalized === "") return [];
	const lines = normalized.split("\n");
	if (lines.length > 0 && lines[lines.length - 1] === "") {
		lines.pop();
	}
	return lines;
}

/**
 * Count the number of lines a jsdiff Change carries in its `value`.
 * Works whether the value ends with a newline or not.
 */
export function countLinesInValue(value: string): number {
	if (value === "") return 0;
	const lines = value.split("\n");
	if (lines[lines.length - 1] === "") return lines.length - 1;
	return lines.length;
}

// ── Truncation ────────────────────────────────────────────────

/**
 * Truncate a string so its *visible* length does not exceed `max` columns.
 * Forward ANSI escape sequences verbatim (their visible width is 0),
 * so the truncation preserves the styling of every character that
 * gets included.
 *
 * If the input ends inside an open SGR, we emit `\u001b[0m` immediately
 * before the ellipsis so the suffix is properly closed — the caller
 * can layer additional styling on top via the surrounding SGR chain.
 */
export function truncateTo(s: string, max: number, suffix = "…"): string {
	if (max <= 0) return "";
	if (visibleLength(s) <= max) return s;

	const suffixLen = visibleLength(suffix);
	if (suffixLen >= max) return suffix.slice(0, max);

	const target = max - suffixLen;
	const ansiTokenRegex = /^\u001b\[[0-9;]*m/;
	let out = "";
	let i = 0;
	while (i < s.length && visibleLength(out) <= target) {
		if (s.charCodeAt(i) === 0x1b) {
			const match = ansiTokenRegex.exec(s.slice(i));
			if (match) {
				out += match[0];
				i += match[0].length;
				continue;
			}
		}
		const next = out + s[i];
		if (visibleLength(next) > target) break;
		out = next;
		i++;
	}
	// Close any open SGR before suffix to avoid bleeding the original
	// styling into the ellipsis (which is plain "…" by default).
	return `${out}\u001b[0m${suffix}`;
}

// ── Gutter & line numbers ─────────────────────────────────────

/**
 * Produce the per-row gutter string used by the unified renderer.
 */
export function gutterFor(
	style: GutterStyle,
	kind: "add" | "del" | "context",
): string {
	switch (style) {
		case "bracket":
			if (kind === "context") return " │ │";
			return kind === "add" ? " │+│" : " │-│";
		case "bar":
			if (kind === "context") return " |  ";
			return kind === "add" ? " | +" : " | -";
		case "compact":
			if (kind === "context") return "    ";
			return kind === "add" ? " +  " : " -  ";
		case "arrow":
			if (kind === "context") return " ↔  ";
			return kind === "add" ? " →  " : " ←  ";
	}
}

/**
 * Format a line number padded to a fixed width, or return spaces when null.
 */
export function formatLineNo(n: number | null, width: number): string {
	if (n === null) return " ".repeat(width);
	return n.toString().padStart(width, " ");
}

/**
 * Pad the right side of a string to exactly `width` visible columns.
 */
export function padVisible(s: string, width: number): string {
	const v = visibleLength(s);
	if (v >= width) return s;
	return s + " ".repeat(width - v);
}

// ── ColorStyle resolution (legacy) ─────────────────────────────

/**
 * Convert a `ColorStyle` into a `(s) => string` painter via
 * `colorize()` so any color format DUI supports works (named,
 * hex, rgb()/rgba(), oklch()).
 */
export function resolveStyle(
	style: ColorStyle | undefined,
	fallback: (s: string) => string,
): (s: string) => string {
	if (style === undefined) return fallback;
	if (typeof style === "string") {
		return (s: string) => {
			try {
				return colorize(s, style, "fg");
			} catch {
				return fallback(s);
			}
		};
	}
	if (typeof style === "object" && style !== null) {
		const { fg, bg } = style;
		return (s: string) => {
			let out = fg ? colorize(s, fg, "fg") : fallback(s);
			if (bg) {
				try {
					out = colorize(out, bg, "bg");
				} catch {
					/* swallow: leave fg coloring */
				}
			}
			return out;
		};
	}
	return fallback;
}

