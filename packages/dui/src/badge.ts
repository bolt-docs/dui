/**
 * Status pill / chip primitive.
 *
 * Renders a single-line chip suitable for dense dashboards, command
 * palettes, and CLI status indicators. The chip is padded with a
 * single space on each side (` label `) so it reads as a distinct
 * inline token against surrounding text.
 *
 * Status → color resolution priority (highest wins first):
 *
 *  1. `opts.colors.text` / `opts.colors.bg` — per-call override.
 *  2. `theme.badge[status]` — global theme override registered via
 *     `configure({ theme: { badge: { success: { fg, bg } } } })`.
 *  3. Hardcoded defaults (`badge.success` → `{ fg: white, bg: green }`,
 *     etc.) — fall back so chips render recognizable without config.
 *
 * Both `colors.text` and the theme slot accept either a plain string
 * (fg-only chip, no background) or a `{ fg, bg }` compound (chip with
 * its own background). Passing `colors.bg` independently is also
 * supported for the common case of keeping the default fg but
 * overriding the chip's background.
 *
 * Unknown or mis-cased status values normalize case-insensitively to
 * the nearest known status and fall back to `"neutral"`, so JS
 * consumers never crash at runtime with a cryptic TypeError. Invalid
 * color strings degrade gracefully: the chip renders unstyled and a
 * `process.emitWarning` surfaces the problem instead of throwing.
 *
 * @example
 * badge({ label: "PASS", status: "success" });    // [green] PASS[/green]
 * badge({ label: "ERR", status: "error" });      // white on red
 * badge({ label: "draft", status: "neutral", colors: { bg: "#222" } });
 * badge({ label: "abcdef", maxWidth: 5 });       // "abcd…" (cell-aware)
 */
import { isPlainMode } from "./accessibility";
import { getConfig } from "./config";
import { applyStyle, type ColorInput } from "./color";
import { formatBadgePlain } from "./plain";
import { stripAnsi, truncateByCells } from "./utils";
import type { ColorStyle } from "./theme";

export type BadgeStatus = "info" | "success" | "warning" | "error" | "neutral";

export interface BadgeOptions {
	label: string;
	status?: BadgeStatus;
	colors?: {
		/** Override fg (string), or both fg+bg (compound `{ fg, bg }`). */
		text?: ColorStyle;
		/** Override bg only (string, or compound). */
		bg?: ColorStyle;
	};
	/**
	 * Cap the chip's visible width in terminal cells (CJK-aware).
	 * Labels longer than `maxWidth` are truncated with a trailing `…`.
	 * Applies to both color and plain-mode output.
	 */
	maxWidth?: number;
}

const BADGE_DEFAULTS: Record<string, { fg: ColorInput; bg: ColorInput }> = {
	info: { fg: "white", bg: "blue" },
	success: { fg: "white", bg: "green" },
	warning: { fg: "black", bg: "yellow" },
	error: { fg: "white", bg: "red" },
	neutral: { fg: "white", bg: "gray" },
};

/**
 * Normalize a caller-provided status to a known key:
 *  - `undefined` stays `undefined` (plain mode falls back to the
 *    literal `badge:` prefix, matching `formatBadgePlain`).
 *  - known keys pass through as-is.
 *  - unknown / mis-cased keys collapse to `"neutral"` so both render
 *    paths (color + plain) agree on the same status.
 */
function normalizeStatus(
	raw: BadgeStatus | undefined,
): BadgeStatus | undefined {
	if (raw === undefined) return undefined;
	const key = String(raw).toLowerCase();
	return Object.prototype.hasOwnProperty.call(BADGE_DEFAULTS, key)
		? (key as BadgeStatus)
		: "neutral";
}

/**
 * Sanitize the label for chip rendering:
 *  - coerce non-strings (JS consumers) via `String(...)`.
 *  - strip ALL ANSI escapes (SGR + OSC + CSI) so injected escape
 *    sequences can't corrupt the chip's own SGR output.
 *  - collapse newlines / tabs so the chip stays a single line.
 *  - trim so the ` label ` padding stays exactly one space per side.
 */
function sanitizeLabel(raw: string): string {
	return stripAnsi(String(raw ?? ""))
		.replace(/[\r\n\t]+/g, " ")
		.trim();
}

/**
 * Paint the chip. Never lets a bad color string crash the caller —
 * an invalid color renders the label unstyled and surfaces a warning.
 */
function paint(text: string, fg: ColorInput, bg: ColorInput): string {
	try {
		return applyStyle(` ${text} `, fg, bg);
	} catch (err) {
		process.emitWarning(
			`[dui] badge: invalid color (${(err as Error).message}) — rendering unstyled`,
		);
		return ` ${text} `;
	}
}

/**
 * Resolve the fg/bg colors for a badge, honoring:
 *   1. Per-call `opts.colors.text` / `opts.colors.bg` (highest priority)
 *   2. Global theme override via `configure({ theme: { badge: { ... } } })`
 *   3. Hardcoded `BADGE_DEFAULTS` (fallback)
 *
 * Unknown statuses gracefully fall back to `"neutral"`.
 */
function resolveBadgeColor(
	optsStatus: BadgeStatus | undefined,
	optsText: ColorStyle | undefined,
	optsBg: ColorStyle | undefined,
	theme: ReturnType<typeof getConfig>["theme"],
): { fg: ColorInput; bg: ColorInput } {
	// Normalize unknown status to "neutral" so the BADGE_DEFAULTS lookup
	// never returns undefined, preventing a runtime TypeError in JS
	// consumers. `hasOwnProperty` guards against prototype pollution
	// (e.g. a JS caller passing status: "constructor").
	const rawStatus: string = optsStatus ?? "neutral";
	const status: BadgeStatus = Object.prototype.hasOwnProperty.call(
		BADGE_DEFAULTS,
		rawStatus,
	)
		? (rawStatus as BadgeStatus)
		: "neutral";

	const themeEntry = theme?.badge?.[status];

	let fg: ColorInput | undefined;
	let bg: ColorInput | undefined;

	// 1. Per-call opts.colors.text — fg string, or compound `{ fg, bg }`.
	if (optsText !== undefined) {
		if (typeof optsText === "string") {
			fg = optsText;
		} else {
			fg = optsText.fg ?? fg;
			bg = optsText.bg ?? bg;
		}
	}

	// 1b. Per-call opts.colors.bg — bg-only override (keeps the default
	//     fg when only the background is overridden).
	if (optsBg !== undefined) {
		if (typeof optsBg === "string") {
			bg = optsBg;
		} else {
			bg = optsBg.bg ?? bg;
		}
	}

	// 2. Theme override layer — only fills gaps the per-call opts left.
	if (typeof themeEntry === "string") {
		fg ??= themeEntry;
	} else if (themeEntry && typeof themeEntry === "object") {
		fg ??= themeEntry.fg;
		bg ??= themeEntry.bg;
	}

	// 3. Hardcoded defaults — final fallback.
	const defaults = BADGE_DEFAULTS[status];
	return {
		fg: (fg ?? defaults.fg) as ColorInput,
		bg: (bg ?? defaults.bg) as ColorInput,
	};
}

export function badge(opts: BadgeOptions): string {
	const label = sanitizeLabel(opts.label);
	if (!label) return "";

	// Normalize once so color mode and plain mode agree on the status.
	const status = normalizeStatus(opts.status);

	const cfg = getConfig();

	// Optional cell-aware truncation — applies to both render paths.
	const display =
		opts.maxWidth !== undefined
			? truncateByCells(label, opts.maxWidth)
			: label;

	// Plain-mode fallback — strip colour, emit `[ <label> ]` with
	// the status as a preceding prefix. No SGR.
	if (isPlainMode(undefined, cfg)) {
		return formatBadgePlain(display, status);
	}

	const { fg, bg } = resolveBadgeColor(
		status,
		opts.colors?.text,
		opts.colors?.bg,
		cfg.theme,
	);
	return paint(display, fg, bg);
}
