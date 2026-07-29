/**
 * Section header / labeled divider primitive.
 *
 * Renders a single-line divider with the title inline, e.g.:
 *
 * ```
 * ── Settings ───────────────────
 * ──────── Settings ──────────
 * ```
 *
 * The styled output matches the conventions used by tools like GNU
 * `tap` output, `make` rule separators, and most CLI log splitters —
 * a dense, recognizable breakpoint that lays flat in any terminal
 * width without wrapping.
 *
 * Behavior when the title is wider than `width`:
 *
 * - The title is **truncated** with an ellipsis (`…`) so the divider
 *   stays strictly one line. Multi-line section headers break
 *   surrounding layouts that assume a single-row gap.
 *
 * Behavior when even the truncated title would overflow:
 *
 * - The divider degrades to a pure line of `─` of `width` cells so the
 *   consumer's vertical geometry is preserved (one row tall) even
 *   when there's no room for the title.
 *
 * @example
 * section({ title: "Configuration", width: 60 });
 * section({ title: "Defaults", align: "center" });
 */
import { isPlainMode } from "./accessibility";
import { getConfig } from "./config";
import { formatSectionPlain } from "./plain";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";
import { terminalWidth, truncateByCells, visibleLength } from "./utils";

export type SectionAlign = "left" | "center";

export interface SectionOptions {
	title: string;
	/** Total divider width; defaults to `min(terminalWidth(), 80)`. */
	width?: number;
	align?: SectionAlign;
	colors?: {
		title?: ColorStyle;
		line?: ColorStyle;
	};
}


export function section(opts: SectionOptions): string {
	// Plain-mode fallback — emit a single-line `section: -- <title>
	// --` annotation with no SGR. Skip width / alignment math
	// entirely; the format is width-stable in scrollback regardless
	// of terminal width.
	const cfg = getConfig();
	if (isPlainMode(undefined, cfg)) {
		return formatSectionPlain(opts.title ?? "");
	}
	const theme = cfg.theme;
	const { apply: titleStyle } = resolveColor(
		"section.title",
		theme,
		opts.colors?.title,
	);
	const { apply: lineStyle } = resolveColor(
		"section.line",
		theme,
		opts.colors?.line,
	);

	const width = opts.width ?? Math.min(terminalWidth(), 80);
	const align = opts.align ?? "left";

	// Empty width: nothing to render at all. Negative width: clamp to 0
	// before the pure-dash fallback so we never ask `String#repeat` for
	// a fractional/negative count.
	if (width <= 0) return "";

	// Below the 5-cell minimum (`<dash> <title> <dash>` with a 1-cell
	// title), the divider can't fit a title at all. Same fallback
	// applies when the title is empty *after trim* — a headingless
	// divider is still expected to read as a horizontal rule, so emit
	// a pure dashed line of exactly `width` cells so callers' vertical
	// geometry (a single row) holds. `opts.title?.trim() === ""`
	// catches both empty strings AND whitespace-only titles.
	if (width < 5 || opts.title?.trim() === "") {
		return lineStyle("─".repeat(width));
	}

	// 4 = the 2 leading dashes + 2 separator spaces (one around title).
	const maxTitleLen = Math.max(0, width - 4);
	const title = truncateByCells(opts.title, maxTitleLen);
	const titleLen = visibleLength(title);

	if (align === "center") {
		// Center: dash splits symmetrically around title + 2 spaces.
		const allDashes = Math.max(0, width - titleLen - 2);
		const left = Math.floor(allDashes / 2);
		const right = allDashes - left;
		return (
			lineStyle("─".repeat(left)) +
			" " +
			titleStyle(title) +
			" " +
			lineStyle("─".repeat(right))
		);
	}

	// left-aligned: exactly two dashes lead, then title, then the
	// remaining dashes fill out the right edge (`width - titleLen - 4`
	// adjusts for the leading "── " prefix of width 4).
	const trailing = Math.max(0, width - titleLen - 4);
	return (
		lineStyle("─".repeat(2)) +
		" " +
		titleStyle(title) +
		" " +
		lineStyle("─".repeat(trailing))
	);
}
