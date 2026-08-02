/**
 * Keyboard shortcut hint primitive.
 *
 * Renders an array of key tokens normalized for the active platform
 * via the `PLATFORM_KEY_MAP` table below. The MVP reads `process.platform`
 * automatically (`darwin` → `"mac"`, `win32` → `"win"`, anything else
 * → `"linux"`). Pass `platform: "mac" | "win" | "linux"` to override
 * for tests, docs, or cross-platform hint bars in your CLI.
 *
 * Rendering is a single styled string — each token is painted with the
 * `kbd.text` theme color. The reserved `kbd.border` slot is left for a
 * future boxed variant (per-key chip with its own frame).
 *
 * Tokens are sanitized before rendering (ANSI stripped, newlines
 * collapsed) so injected escape sequences can't corrupt the hint's own
 * SGR output. Unknown platform values fall back to auto-detection, and
 * invalid color strings degrade gracefully (unstyled + `emitWarning`)
 * instead of crashing the caller.
 *
 * @example
 * kbd({ keys: ["Cmd", "K"] });                       // "⌘ K" on macOS
 * kbd({ keys: ["Ctrl", "C"], platform: "win" });    // "Ctrl C"
 * kbd({ keys: ["Esc"], colors: { text: "red" } });  // red "Esc"
 * kbd({ keys: ["Ctrl", "Shift", "P"], maxWidth: 8 }); // "Ctrl S…"
 */
import { getConfig } from "./config";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";
import { stripAnsi, truncateByCells } from "./utils";

export type KbdPlatform = "mac" | "win" | "linux" | "auto";

export interface KbdOptions {
	keys: string | string[];
	/** Separator between tokens. Default `" "` (mac-friendly visual). */
	separator?: string;
	platform?: KbdPlatform;
	colors?: {
		text?: ColorStyle;
		border?: ColorStyle;
	};
	/**
	 * Cap the hint's visible width in terminal cells (CJK-aware).
	 * Hints longer than `maxWidth` are truncated with a trailing `…`.
	 */
	maxWidth?: number;
}

const PLATFORM_KEY_MAP: Record<
	"mac" | "win" | "linux",
	Record<string, string>
> = {
	mac: {
		Cmd: "⌘",
		Command: "⌘",
		Option: "⌥",
		Alt: "⌥",
		Shift: "⇧",
		Ctrl: "⌃",
		Control: "⌃",
		Enter: "↵",
		Return: "↵",
		Esc: "⎋",
		Escape: "⎋",
		Tab: "⇥",
		Up: "↑",
		Down: "↓",
		Left: "←",
		Right: "→",
		Backspace: "⌫",
		Delete: "⌦",
	},
	win: {
		Cmd: "Ctrl",
		Command: "Ctrl",
		Option: "Alt",
		Alt: "Alt",
		Shift: "Shift",
		Ctrl: "Ctrl",
		Control: "Ctrl",
		Enter: "Enter",
		Return: "Enter",
		Esc: "Esc",
		Escape: "Esc",
		Tab: "Tab",
		Up: "↑",
		Down: "↓",
		Left: "←",
		Right: "→",
		Backspace: "Backspace",
		Delete: "Delete",
	},
	linux: {
		Cmd: "Ctrl",
		Command: "Ctrl",
		Option: "Alt",
		Alt: "Alt",
		Shift: "Shift",
		Ctrl: "Ctrl",
		Control: "Ctrl",
		Enter: "Enter",
		Return: "Enter",
		Esc: "Esc",
		Escape: "Esc",
		Tab: "Tab",
		Up: "↑",
		Down: "↓",
		Left: "←",
		Right: "→",
		Backspace: "Backspace",
		Delete: "Delete",
	},
};

function detectPlatform(): "mac" | "win" | "linux" {
	if (typeof process !== "undefined" && process.platform) {
		if (process.platform === "darwin") return "mac";
		if (process.platform === "win32") return "win";
		return "linux";
	}
	return "linux";
}

/**
 * Resolve the active platform, honoring `platform: "auto"` (the
 * default), explicit valid platforms, and — for JS consumers passing
 * loose strings — an unknown value that falls back to auto-detection
 * instead of crashing the `PLATFORM_KEY_MAP` lookup.
 */
function resolvePlatform(
	platform: KbdPlatform | undefined,
): "mac" | "win" | "linux" {
	if (platform === "mac" || platform === "win" || platform === "linux") {
		return platform;
	}
	// `undefined`, `"auto"`, or any loose JS-consumer string → detect.
	return detectPlatform();
}

/**
 * Sanitize a single key token:
 *  - coerce non-strings (JS consumers) via `String(...)`.
 *  - strip ALL ANSI escapes (SGR + OSC + CSI) so injected escape
 *    sequences can't corrupt the hint's own SGR output.
 *  - collapse newlines / tabs so each token stays a single cell token.
 *  - trim surrounding whitespace.
 */
function sanitizeToken(raw: string): string {
	return stripAnsi(String(raw ?? ""))
		.replace(/[\r\n\t]+/g, " ")
		.trim();
}

/**
 * Paint a token. Never lets a bad color string crash the caller — an
 * invalid color renders the token unstyled and surfaces a warning.
 */
function paintToken(text: string, style: (s: string) => string): string {
	try {
		return style(text);
	} catch (err) {
		process.emitWarning(
			`[dui] kbd: invalid color (${(err as Error).message}) — rendering unstyled`,
		);
		return text;
	}
}

export function kbd(opts: KbdOptions): string {
	const platform = resolvePlatform(opts.platform);
	const map = PLATFORM_KEY_MAP[platform];

	const keys = Array.isArray(opts.keys) ? opts.keys : [opts.keys];
	const separator = opts.separator ?? " ";
	const maxWidth = opts.maxWidth;

	const theme = getConfig().theme;
	const { apply: textStyle } = resolveColor(
		"kbd.text",
		theme,
		opts.colors?.text,
	);

	// Sanitize each token once, then map it through the platform table.
	// Empty tokens (blank keys, or keys that were only ANSI / whitespace)
	// are dropped so they can't leave stray separator gaps in the hint.
	const tokens = keys
		.map((token) => {
			const clean = sanitizeToken(token);
			return clean ? (map[clean] ?? clean) : "";
		})
		.filter((token) => token !== "");

	// Cell-aware truncation of the *joined* hint so maxWidth caps the
	// total visible width (CJK-safe) rather than per-token width.
	// Truncation happens before styling so ANSI never interferes with
	// cell counting (matches badge's maxWidth semantics: <= 0 → "").
	const joined = tokens.join(separator);
	const display =
		maxWidth !== undefined
			? truncateByCells(joined, maxWidth)
			: joined;

	// Style the JOINED hint in one pass (not per token). Intentional:
	// truncation above must run on clean text so ANSI never skews cell
	// counting, and a single SGR wrap gives the hint the same contiguous
	// chip look as badge. For fg-only colors this is visually identical
	// to per-token styling; for compound `{fg, bg}` the background now
	// spans the separators too (the desired chip-like result).
	return display === "" ? "" : paintToken(display, textStyle);
}
