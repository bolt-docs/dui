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
 * Unknown status values gracefully fall back to `"neutral"` so JS
 * consumers don't crash at runtime with a cryptic TypeError.
 *
 * @example
 * badge({ label: "PASS", status: "success" });    // [green] PASS[/green]
 * badge({ label: "ERR", status: "error" });      // white on red
 * badge({ label: "draft", status: "neutral", colors: { bg: "#222" } });
 */
import { isPlainMode } from "./accessibility";
import { getConfig } from "./config";
import { applyStyle, type ColorInput } from "./color";
import { formatBadgePlain } from "./plain";
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
}

const BADGE_DEFAULTS: Record<string, { fg: ColorInput; bg: ColorInput }> = {
	info: { fg: "white", bg: "blue" },
	success: { fg: "white", bg: "green" },
	warning: { fg: "black", bg: "yellow" },
	error: { fg: "white", bg: "red" },
	neutral: { fg: "white", bg: "gray" },
};

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
	// Normalize unknown status to "neutral" so BADGE_DEFAULTS lookup never
	// returns undefined, preventing a runtime TypeError in JS consumers.
	const rawStatus: string = optsStatus ?? "neutral";
	const status: BadgeStatus = BADGE_DEFAULTS[rawStatus] !== undefined
		? (rawStatus as BadgeStatus)
		: "neutral";

	const themeEntry = theme?.badge?.[status];

	let fg: ColorInput | undefined;
	let bg: ColorInput | undefined;

	// 1. Per-call opts.colors overrides (highest priority — evaluated last
	//    so they overwrite theme and defaults).
	// 2. We process opts first, then fall through theme → defaults.

	// Check per-call opts.colors.text first (priority #1).
	if (optsText !== undefined) {
		if (typeof optsText === "string") {
			fg = optsText;
		} else if (typeof optsText === "object") {
			fg = optsText.fg ?? fg;
			bg = optsText.bg ?? bg;
		}
	}

	// Check per-call opts.colors.bg (priority #1, bg-only).
	if (optsBg !== undefined) {
		if (typeof optsBg === "string") {
			bg = optsBg;
		} else if (typeof optsBg === "object") {
			bg = optsBg.bg ?? bg;
		}
	}

	// 2. Theme override layer (priority #2) — only applies when per-call
	//    overrides DIDN'T set the value.
	if (typeof themeEntry === "string") {
		fg ??= themeEntry;
	} else if (themeEntry && typeof themeEntry === "object") {
		fg ??= themeEntry.fg;
		bg ??= themeEntry.bg;
	}

	// 3. Hardcoded defaults (priority #3) — final fallback.
	const defaults = BADGE_DEFAULTS[status];
	return {
		fg: (fg ?? defaults.fg) as ColorInput,
		bg: (bg ?? defaults.bg) as ColorInput,
	};
}

/** Strip ANSI escape sequences from a string. */
function stripAnsi(s: string): string {
	return s.replace(/\x1b\[[0-9;]*m/g, "");
}

export function badge(opts: BadgeOptions): string {
	// Strip ANSI from label to prevent malformed compound SGR output
	// when the label itself contains escape sequences.
	const cleanLabel = stripAnsi(opts.label);

	// Plain-mode fallback — strip colour, emit `[ <label> ]` with
	// the status as a preceding prefix. No SGR.
	const cfg = getConfig();
	if (isPlainMode(undefined, cfg)) {
		return formatBadgePlain(cleanLabel, opts.status);
	}
	const theme = cfg.theme;
	const { fg, bg } = resolveBadgeColor(
		opts.status,
		opts.colors?.text,
		opts.colors?.bg,
		theme,
	);
	return applyStyle(` ${cleanLabel} `, fg, bg);
}
