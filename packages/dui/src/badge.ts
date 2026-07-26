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

const BADGE_DEFAULTS: Record<BadgeStatus, { fg: ColorInput; bg: ColorInput }> = {
	info: { fg: "white", bg: "blue" },
	success: { fg: "white", bg: "green" },
	warning: { fg: "black", bg: "yellow" },
	error: { fg: "white", bg: "red" },
	neutral: { fg: "white", bg: "gray" },
};

function resolveBadgeColor(
	optsStatus: BadgeStatus | undefined,
	optsText: ColorStyle | undefined,
	optsBg: ColorStyle | undefined,
	theme: ReturnType<typeof getConfig>["theme"],
): { fg: ColorInput; bg: ColorInput } {
	const status: BadgeStatus = optsStatus ?? "neutral";
	const themeEntry = theme?.badge?.[status];

	let fg: ColorInput | undefined;
	let bg: ColorInput | undefined;

	// Theme override layer (slots map on theme).
	if (typeof themeEntry === "string") {
		fg = themeEntry;
	} else if (themeEntry && typeof themeEntry === "object") {
		fg = themeEntry.fg;
		bg = themeEntry.bg;
	}

	// opts.colors.text overrides fg (and optionally bg).
	if (optsText !== undefined) {
		if (typeof optsText === "string") {
			fg = optsText;
		} else if (typeof optsText === "object") {
			fg = optsText.fg ?? fg;
			bg = optsText.bg ?? bg;
		}
	}

	// opts.colors.bg overrides bg only.
	if (optsBg !== undefined) {
		if (typeof optsBg === "string") {
			bg = optsBg;
		} else if (typeof optsBg === "object") {
			bg = optsBg.bg ?? bg;
		}
	}

	// Fall back to defaults so every (fg, bg) pair is defined.
	const defaults = BADGE_DEFAULTS[status];
	return {
		fg: (fg ?? defaults.fg) as ColorInput,
		bg: (bg ?? defaults.bg) as ColorInput,
	};
}

export function badge(opts: BadgeOptions): string {
	// Plain-mode fallback — strip colour, emit `[ <label> ]` with
	// the status as a preceding prefix. No SGR.
	const cfg = getConfig();
	if (isPlainMode(undefined, cfg)) {
		return formatBadgePlain(opts.label, opts.status);
	}
	const theme = cfg.theme;
	const { fg, bg } = resolveBadgeColor(
		opts.status,
		opts.colors?.text,
		opts.colors?.bg,
		theme,
	);
	return applyStyle(` ${opts.label} `, fg, bg);
}
