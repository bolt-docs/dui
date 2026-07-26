/**
 * Accessibility layer for `@bdocs/dui` (and `@dui-toolkit/plugin-notify`).
 *
 * Hosts a single source of truth for "should this CLI emit ANSI / paint
 * a styled box / ring the bell?" so every widget and backend in the
 * catalogue can early-return into a text-only fallback without
 * re-implementing the detection logic.
 *
 * Heuristics layered together (any one triggers plain mode):
 *
 *   1. **NO_COLOR** env var — the cross-tool standard for "user
 *      explicitly opted out of color". Honoured regardless of TTY
 *      state.
 *   2. **TERM=dumb** — declares the terminal emulator can't render
 *      escape sequences; classic for piped-to-file, non-interactive
 *      shells, emacs comint buffers, etc.
 *   3. **Non-TTY stdout** — pipe consumers (CI logs, systemd journal,
 *      `tee`, `less` in raw mode) can't interpret `\x1b[...m`, so we
 *      skip ANSI by default. The existing `isColorSupported` already
 *      encodes this; we read it as a fallback input.
 *   4. **Screen-reader presence** — `brltty` (Linux), VoiceOver (macOS),
 *      NVDA / JAWS (Windows). Probed via one short-lived `spawn`
 *      per platform on first call, then cached for the CLI's lifetime.
 *   5. **Reduced-motion preference** — `PREFERS_REDUCED_MOTION=1` or
 *      `REDUCE_MOTION=1`. Distinct from plain mode (a reduced-motion
 *      user still benefits from color and box drawing; they only
 *      want animation suppressed).
 *
 * Forced plain mode wins over everything: pass `plain: true` via
 * `configure({ plain: true })` for global opt-in, or `plain: true`
 * via `notify({ ..., plain: true })` for per-call opt-in.
 *
 * @example
 * import { configure, isPlainMode } from "@bdocs/dui";
 *
 * configure({ plain: true, prefix: "bolt-docs" });
 * console.log(isPlainMode()); // true
 *
 * @example Plain output from a notify call:
 * ```text
 * notify.error: CI failed for PR #1421
 *   body: Vitest surfaced 3 failing tests.
 *
 * actions:
 *   [open-logs] Open logs
 *   [rerun] Re-run CI
 * ```
 */

import type { DuiConfig } from "./config";

export interface AccessibilityInfo {
	/** NO_COLOR env var set to a non-empty value. */
	noColor: boolean;
	/** TERM=dumb. */
	dumbTerm: boolean;
	/** brltty (Linux) / VoiceOver (macOS) / NVDA or JAWS (Windows). */
	screenReader: boolean;
	/** `PREFERS_REDUCED_MOTION=1` / `REDUCE_MOTION=1` / `prefers-reduced-motion: reduce`. */
	reducedMotion: boolean;
	/** Forced by `configure({ plain: true })` or per-call `plain: true`. */
	plainOverride: boolean;
}

// The only cached value is the expensive screenReader spawn result.
// Env probes (NO_COLOR / TERM / reducedMotion) are read LIVE from
// process.env on every call to `getAccessibilityInfo` so mutations
// mid-run (tests, scripts that shell-out and read the result back)
// propagate without needing `refreshAccessibility()`. The cached
// screenReader survives for the CLI's lifetime so callers don't pay
// the `pgrep` / `defaults` / `Get-Process` cost on every widget render.
let screenReaderCache: boolean | null = null;

function getScreenReader(): boolean {
	if (screenReaderCache === null) {
		screenReaderCache = probeScreenReader();
	}
	return screenReaderCache;
}

// Probe helpers — each platform gets exactly one process spawn with
// a 100ms hard timeout. If the probe throws or times out, treat the
// detector as "absent" (treat the device as one without a screen
// reader). Errors are swallowed so an absent `pgrep`/`brltty`/
// `defaults` binary is not a hard failure.

import { spawnSync } from "node:child_process";

function spawnQuick(
	cmd: string,
	args: string[],
	timeoutMs = 100,
): { present: boolean } {
	try {
		const proc = spawnSync(cmd, args, {
			encoding: "utf8",
			timeout: timeoutMs,
			stdio: ["ignore", "pipe", "ignore"],
		});
		// exit code 0 + non-empty stdout → match.
		if (proc.status === 0 && proc.stdout && proc.stdout.trim() !== "") {
			return { present: true };
		}
		// `pgrep` returns 1 when no match — that's "absent" (status 1 is
		// not an error for our purposes).
		return { present: false };
	} catch {
		return { present: false };
	}
}

function probeScreenReader(): boolean {
	if (process.platform === "linux") {
		// `pgrep -f brltty` returns 0 when a brltty process is alive.
		// Avoid `which brltty` because the binary may be present but
		// not running, which doesn't help a screen-reader user.
		return spawnQuick("pgrep", ["-f", "brltty"]).present;
	}
	if (process.platform === "darwin") {
		// `defaults read` returns "1" when VoiceOver is on, otherwise
		// a non-numeric error on stderr and exits non-zero. The probe
		// returns `present: true` only when the read succeeds AND
		// contains `1` (the canonical "on" sentinel).
		try {
			const proc = spawnSync(
				"defaults",
				["read", "com.apple.universalaccess", "voiceOverOn"],
				{ encoding: "utf8", timeout: 100, stdio: ["ignore", "pipe", "ignore"] },
			);
			return proc.status === 0 && (proc.stdout ?? "").trim() === "1";
		} catch {
			return false;
		}
	}
	if (process.platform === "win32") {
		// PowerShell resolves `(Get-Process -Name NVDA -ErrorAction SilentlyContinue)`
		// to a multi-line table on stdout when NVDA is alive; otherwise
		// it writes nothing and exits 0 (the `-ErrorAction SilentlyContinue`
		// swallowing the not-found path). Use stderr for JAWS via its
		// process name `jfw`.
		const nvda = spawnQuick("powershell.exe", [
			"-NoProfile",
			"-Command",
			"(Get-Process -Name NVDA -ErrorAction SilentlyContinue) -ne $null",
		]);
		if (nvda.present) return true;
		return spawnQuick("powershell.exe", [
			"-NoProfile",
			"-Command",
			"(Get-Process -Name jfw -ErrorAction SilentlyContinue) -ne $null",
		]).present;
	}
	return false;
}

function readEnv(...names: string[]): boolean {
	for (const name of names) {
		const v = process.env[name];
		// RFC NO_COLOR: any non-empty value means "off"; "0" usually
		// means "explicit off" too. Empty → unset.
		if (v !== undefined && v !== "") return true;
	}
	return false;
}

function buildAccessibilityInfo(plainOverride: boolean): AccessibilityInfo {
	// `nonTty` is intentionally NOT a plain-mode trigger here. The
	// existing `isColorSupported` flow already drops SGR when stdout
	// isn't a TTY — adding it to the plain-mode heuristic would fire
	// in every vitest / CI / `npm test` process that doesn't have a
	// pty, breaking the styled output for the 99% case. Plain-mode is
	// reserved for explicit accessibility opt-ins (NO_COLOR, TERM=dumb,
	// screen-reader, forced override). Pipe-detection is a separate
	// concern handled by `isColorSupported`.
	//
	// Env probes (NO_COLOR, TERM, reducedMotion) are read LIVE from
	// process.env every call so mutations mid-run (tests, scripts)
	// propagate without calling refreshAccessibility(). Only the
	// expensive screenReader spawn result is cached.
	return {
		noColor: readEnv("NO_COLOR"),
		dumbTerm: process.env.TERM === "dumb",
		screenReader: getScreenReader(),
		reducedMotion:
			readEnv("PREFERS_REDUCED_MOTION", "REDUCE_MOTION", "DUIPREFERS_REDUCED_MOTION"),
		plainOverride,
	};
}

/**
 * Build and return a fresh accessibility info struct. Env probes are
 * read from `process.env` on every call — only the expensive
 * `screenReader` spawn is cached across calls. Call this function
 * directly rather than maintaining a stale cache.
 */
export function getAccessibilityInfo(
	plainOverride?: boolean,
): AccessibilityInfo {
	const override = plainOverride ?? false;
	return buildAccessibilityInfo(override);
}

/**
 * Re-evaluate the heuristics, clearing the screenReader spawn cache.
 * Useful for tests, scripts that change env mid-run, and watcher-style
 * code that wants to react to the user's `$TERM` change.
 */
export function refreshAccessibility(): AccessibilityInfo {
	// Clears the screenReader spawn cache so the next call re-probes
	// from scratch (e.g. after a screen reader is toggled at runtime).
	screenReaderCache = null;
	return getAccessibilityInfo(false);
}

/**
 * `true` when the CLI should emit text-only output. Auto-detects the
 * env heuristics OR honours a forced override via `configure({ plain: true })`
 * or `notify({ ..., plain: true })`.
 */
export function isPlainMode(
	opts?: { plain?: boolean },
	config?: Pick<DuiConfig, "plain">,
): boolean {
	const override = !!opts?.plain || !!config?.plain;
	const info = getAccessibilityInfo(override);
	return (
		info.plainOverride || info.noColor || info.dumbTerm || info.screenReader
	);
}

/**
 * `true` when the CLI should suppress animation cadences
 * (spinner `setInterval` ticks, progress-bar re-renders). Distinct
 * from `isPlainMode` because reduced-motion users want color and
 * box drawing — only the rapid paint is harmful.
 */
export function isReducedMotion(
	config?: Pick<DuiConfig, "plain">,
): boolean {
	if (config?.plain === true) return true;
	const info = getAccessibilityInfo();
	return info.reducedMotion;
}
