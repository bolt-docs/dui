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
 * @example
 * kbd({ keys: ["Cmd", "K"] });                       // "⌘ K" on macOS
 * kbd({ keys: ["Ctrl", "C"], platform: "win" });    // "Ctrl C"
 * kbd({ keys: ["Esc"], colors: { text: "red" } });  // red "Esc"
 */
import { getConfig } from "./config";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";

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

export function kbd(opts: KbdOptions): string {
	const platform =
		opts.platform === undefined || opts.platform === "auto"
			? detectPlatform()
			: opts.platform;

	const theme = getConfig().theme;
	const { apply: textStyle } = resolveColor(
		"kbd.text",
		theme,
		opts.colors?.text,
	);

	const keys = Array.isArray(opts.keys) ? opts.keys : [opts.keys];
	const separator = opts.separator ?? " ";

	const map = PLATFORM_KEY_MAP[platform];
	return keys
		.map((token) => {
			const mapped = map[token] ?? token;
			return textStyle(mapped);
		})
		.join(separator);
}
