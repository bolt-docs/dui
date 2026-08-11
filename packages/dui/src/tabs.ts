/**
 * Segmented control / nav bar primitive.
 *
 * Renders an array of tab labels with one marked active. Three visual
 * styles are supported:
 *
 *  - `"underline"` (default): flat single-line strip where the active tab
 *    gets its color plus an SGR underline (`4` on / `24` off). Inactive
 *    tabs use `tabs.inactive` color.
 *  - `"pill"`: rounded boxes `[ label ]` with color applied to label.
 *  - `"boxed"`: rounded-corner frames `╭─label─╮` with `tabs.border`
 *    color on the strokes and active/inactive color on the label.
 *
 * All three layouts are joined with a single-space gap (underline/pill)
 * or a tight border-mesh (boxed). The widget is non-interactive —
 * consumer code wires `active` index to navigation state (e.g. via
 * `select({ choices: items, initialIndex: active })`).
 *
 * @example
 * tabs({ items: ["Home", "Docs", "Blog"], active: 1, style: "underline" });
 */
import { isPlainMode } from "./accessibility";
import { getConfig } from "./config";
import { formatTabsPlain } from "./plain";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";
import { stripAnsi } from "./utils";

export type TabsStyle = "underline" | "pill" | "boxed";

export interface TabsOptions {
	items: string[];
	/** Index of the active tab (0-based). */
	active: number;
	style?: TabsStyle;
	colors?: {
		active?: ColorStyle;
		inactive?: ColorStyle;
		border?: ColorStyle;
	};
}

const SGR_UNDERLINE_OPEN = "\u001b[4m";
const SGR_UNDERLINE_CLOSE = "\u001b[24m";

function paintUnderline(paint: (s: string) => string, label: string): string {
	return `${SGR_UNDERLINE_OPEN}${paint(label)}${SGR_UNDERLINE_CLOSE}`;
}

function paintBoxed(
	paint: (s: string) => string,
	border: (s: string) => string,
	label: string,
): string {
	return `${border("\u256D\u2500")}${paint(label)}${border("\u2500\u256E")}`;
}

function sanitizeLabel(raw: string): string {
	return stripAnsi(String(raw ?? ""))
		.replace(/[\r\n\t]+/g, " ")
		.trim();
}

export function tabs(opts: TabsOptions): string {
	const cfg = getConfig();

	// Plain-mode fallback — one `[*]`/`[ ]` entry per tab, no SGR, no
	// box-drawing strokes.
	if (isPlainMode(undefined, cfg)) {
		return formatTabsPlain(
			opts.items.map((label, i) => ({
				label: sanitizeLabel(label),
				active: i === opts.active,
			})),
		);
	}

	const theme = cfg.theme;

	const { apply: activePaint } = resolveColor(
		"tabs.active",
		theme,
		opts.colors?.active,
	);
	const { apply: inactivePaint } = resolveColor(
		"tabs.inactive",
		theme,
		opts.colors?.inactive,
	);
	const { apply: borderPaint } = resolveColor(
		"tabs.border",
		theme,
		opts.colors?.border,
	);

	const style = opts.style ?? "underline";
	const joiner = style === "boxed" ? "" : " ";

	return opts.items
		.map((label, i) => {
			const clean = sanitizeLabel(label);
			const paint = i === opts.active ? activePaint : inactivePaint;
			if (style === "underline") return paintUnderline(paint, clean);
			if (style === "pill") return `[ ${paint(clean)} ]`;
			return paintBoxed(paint, borderPaint, clean);
		})
		.join(joiner);
}
