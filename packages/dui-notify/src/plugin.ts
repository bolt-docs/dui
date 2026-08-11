/**
 * DUI plugin definition for `@dui-toolkit/plugin-notify`.
 *
 * Setup work:
 *
 *   1. Register 25 theme slots: `notify.<level>.{border, bg, fg, icon}` for each level.
 *   2. Register a `notify` renderer so `renderWith("notify", payload)` returns the toast.
 *   3. Surface the chosen backend list in `api.shared` so dashboards can display "Sent via os / osc / terminal" status.
 */
import type { DuiPlugin } from "@bdocs/dui";
import { notifyApi } from "./notify.js";
import type { NotifyOptions } from "./types.js";

const LEVELS = ["success", "info", "warning", "error", "neutral"] as const;

const DEFAULTS: Record<string, string | { fg: string; bg: string }> = {
	"notify.success.border": "#22c55e",
	"notify.success.bg": { fg: "#0a1f10", bg: "#0a1f10" },
	"notify.success.fg": "#a0e6a0",
	"notify.success.icon": "✓",

	"notify.info.border": "#64c8ff",
	"notify.info.bg": { fg: "#0a1822", bg: "#0a1822" },
	"notify.info.fg": "#a0d8ff",
	"notify.info.icon": "ⓘ",

	"notify.warning.border": "#ffdc50",
	"notify.warning.bg": { fg: "#1f1a08", bg: "#1f1a08" },
	"notify.warning.fg": "#ffe488",
	"notify.warning.icon": "⚠",

	"notify.error.border": "#f86464",
	"notify.error.bg": { fg: "#1f0a0a", bg: "#1f0a0a" },
	"notify.error.fg": "#ffb0b0",
	"notify.error.icon": "✖",

	"notify.neutral.border": "#888888",
	"notify.neutral.bg": { fg: "#1a1a1a", bg: "#1a1a1a" },
	"notify.neutral.fg": "#cccccc",
	"notify.neutral.icon": "·",
};

export const notifyPlugin: DuiPlugin = {
	name: "@dui-toolkit/plugin-notify",
	version: "0.1.0",
	description:
		"Cross-platform desktop notifications — auto-routes between osascript/notify-send/PowerShell, OSC escape sequences (Kitty/iTerm2/WezTerm), and box-rendered TUI toasts depending on the host environment, with theme slots for every severity level.",
	tags: ["renderer", "notify", "notification", "toast", "bell", "osc", "ansi"],
	homepage: "https://github.com/bdocs/dui/tree/main/packages/dui-notify",
	author: "DUI Toolkit",
	peerDependencies: { dui: "^0.6.0" },
	setup(api) {
		for (const [slot, def] of Object.entries(DEFAULTS)) {
			api.registerThemeSlot(slot, def as never);
		}

		// Built-in renderer — the host can call
		// `await renderWith("notify", JSON.stringify(opts))` to fire a
		// toast without directly importing the package.
		// NOTE: registerRenderer already handles the notify dispatch.
		// A separate registerRenderHook was removed to prevent
		// double-firing when renderWith("notify", ...) is called.
		api.registerRenderer("notify", async (input, options) => {
			let opts: NotifyOptions;
			try {
				opts = JSON.parse(input) as NotifyOptions;
			} catch {
				opts = { body: input, ...((options as Partial<NotifyOptions>) ?? {}) };
			}
			opts = { ...opts, ...((options as Partial<NotifyOptions>) ?? {}) };
			const result = await notifyApi(opts);
			return JSON.stringify(result);
		});

		api.shared.set("renderer", "notify");
		api.shared.set("backends", [
			"os",
			"osc",
			"terminal",
			"bell",
		] as const);

		return () => {
			// No persistent resources to tear down.
		};
	},
};
