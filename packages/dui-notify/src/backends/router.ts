/**
 * Backend selection.
 *
 * `chooseBackend()` parses the host environment once per `notify()` call.
 * It is intentionally conservative in non-TTY / CI / SSH contexts so
 * noise doesn't leak into tooling that expects stderr to be a log stream.
 *
 * Order of preference when `force` is unset AND plain mode is off:
 *
 *   1. `os`      — real desktop notification center. macOS / Windows
 *                  rely on built-in tools; Linux requires `notify-send`
 *                  on the PATH.
 *   2. `osc`     — Kitty / iTerm2 / WezTerm / foot / Ghostty pick up
 *                  the OSC payload and surface a system toast through
 *                  the terminal emulator.
 *   3. `terminal` — drop a `box({ style: "round" })` toast to stderr.
 *                  Reliable inside any TTY but clutters scrollback.
 *   4. `bell`    — silent fallback that rings the bell for `error`
 *                  and `warning` only.
 *
 * **Plain-mode override**: when `opts.plain === true` OR the global
 * accessibility heuristic (`isPlainMode(opts)`) returns true, every
 * backend collapses to multi-line text written to stderr by
 * `bellNotify`'s plain path. The result.backend still reflects
 * "what would have been chosen" so trace logs make sense; the
 * actual fiscal rendering went through plain text.
 */
import { getConfig } from "@bdocs/dui";
import { isPlainMode } from "../accessibility.js";
import type { NotifyBackend, NotifyOptions } from "../types.js";

function isCI(): boolean {
	if (!process.env) return false;
	const v =
		process.env.CI === "true" ||
		process.env.GITHUB_ACTIONS === "true" ||
		process.env.TF_BUILD === "True" ||
		process.env.BUILDKITE === "true";
	return v || !process.stdout?.isTTY;
}

function hasIt2Term(): boolean {
	return (
		!!process.env.KITTY_PID ||
		process.env.TERM === "xterm-kitty" ||
		!!process.env.ITERM_SESSION_ID ||
		!!process.env.WEZTERM_EXECUTABLE ||
		process.env.TERM_PROGRAM === "ghostty" ||
		process.env.TERM === "foot" ||
		process.env.TERM === "foot-extra"
	);
}

function hasNotifySendHint(): boolean {
	// Cheap check: if DISPLAY is set on linux we assume X11 libnotify
	// is around. A `which` probe is skipped because spawning at module
	// load would block the host.
	if (process.platform !== "linux") return false;
	if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) return false;
	return true;
}

export function chooseBackend(opts: NotifyOptions): NotifyBackend {
	// Forced plain mode wins over `force: "os" / "terminal"` — an
	// explicit accessibility opt-in is more important than the
	// user's transport preference. The bell path renders multi-line
	// text to stderr with no ANSI / no bell, exactly what a
	// screen-reader or non-TTY host expects.
	if (isPlainMode({ plain: opts.plain }, getConfig())) return "bell";

	if (opts.force && opts.force !== "auto") return opts.force;

	if (isCI()) {
		// Auto-skip OS / OSC paths in CI; prefer silent bell.
		return opts.sound ? "bell" : "bell";
	}

	if (process.platform === "darwin" || process.platform === "win32") {
		return "os";
	}

	if (process.platform === "linux" && hasNotifySendHint()) {
		return "os";
	}

	if (hasIt2Term() && process.stderr?.isTTY) {
		return "osc";
	}

	if (process.stderr?.isTTY) {
		return "terminal";
	}

	return "bell";
}
