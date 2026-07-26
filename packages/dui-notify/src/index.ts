/**
 * `@dui-toolkit/plugin-notify`
 *
 * Cross-platform desktop notifications for the terminal. Auto-routes
 * between:
 *
 *   - **OS spawn** — `osascript` (macOS) / `notify-send` (Linux, with
 *     `$DISPLAY` / `$WAYLAND_DISPLAY`) / `powershell.exe` (Windows).
 *   - **OSC escape** — Kitty (`\x1b]99;…` / iTerm2 (`\x1b]9;…`) /
 *     WezTerm / foot / Ghostty (`\x1b]777;notify;…`).
 *   - **Inline TUI toast** — `box({ style: "round" })` rendered through
 *     the existing @bdocs/dui widget palette with auto-dismiss after `ttl`.
 *   - **Bell** — fallback that rings `\x07` for `error` / `warning`.
 *
 * The plugin registers 25 theme slots (`notify.<level>.{border, bg, fg, icon}`)
 * so toasts automatically inherit whatever palette the host CLI is using.
 */

export { notifyApi as notify } from "./notify.js";
export type { NotifyApi, NotifyEvent } from "./notify.js";
export { notifyPlugin } from "./plugin.js";
export { chooseBackend } from "./backends/router.js";
export { osNotify } from "./backends/os.js";
export { oscNotify } from "./backends/osc.js";
export { terminalNotify } from "./backends/terminal.js";
export { bellNotify } from "./backends/bell.js";

export type {
	NotifyAction,
	NotifyBackend,
	NotifyLevel,
	NotifyOptions,
	NotifyResult,
} from "./types.js";
