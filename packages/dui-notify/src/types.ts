/**
 * Public type surface for `@dui-toolkit/plugin-notify`.
 *
 * Exposing types from a separate file lets `index.ts` re-export the
 * symbols without dragging the implementation files into the public
 * bundle.
 */

/** Severity buckets that map 1:1 to the `badge({ status })` shape. */
export type NotifyLevel =
	| "success"
	| "info"
	| "warning"
	| "error"
	| "neutral";

/**
 * Notification transport — auto-selected by `chooseBackend()` based on
 * the host environment, overridable via `force` for tests / CI.
 *
 * - `os`      — child_process spawn of `osascript` / `notify-send` / `powershell.exe` (real desktop notification).
 * - `osc`     — runs the OSC 99 (Kitty) / OSC 9 (iTerm2) / OSC 777 (foot/ConEmu) ANSI escape to the active terminal emulator.
 * - `terminal` — renders a `box({ style: "round", title })` toast via `box` + `badge` + `section` to `process.stderr`.
 * - `bell`    — silent path that emits `BEL` for `error`/`warning` only; last-resort fallback for headless / non-TTY / CI envs.
 */
export type NotifyBackend = "os" | "osc" | "terminal" | "bell";

/** Structured action surface — clickable inline tokens in the toast footer. */
export interface NotifyAction {
	id: string;
	label: string;
}

/**
 * Options accepted by `notify()`.
 *
 * - `title` and `body` are independent so a CLI can pin a short subject
 *   alongside a longer description. Both flow into the OS / OSC string
 *   verbatim; only `body` becomes the multi-line body when the toast
 *   is rendered by the `terminal` backend.
 * - `level` cascades to badge color + OS urgency (Linux `-u low|critical`)
 *   + bell (`error`/`warning` ring it unless `sound: false`).
 * - `ttl` is the auto-dismiss window in milliseconds; the `terminal`
 *   backend erases the rendered toast after `ttl`; OS / OSC paths
 *   ignore it (those systems handle their own dismissal).
 * - `force: "auto"` (default) lets `chooseBackend()` pick; set
 *   `force: "os"` / `"osc"` / `"terminal"` / `"bell"` to force a
 *   specific transport (used by tests).
 */
export interface NotifyOptions {
	title?: string;
	body?: string;
	level?: NotifyLevel;
	ttl?: number;
	sound?: boolean;
	force?: NotifyBackend | "auto";
	icon?: string;
	actions?: NotifyAction[];
	/**
	 * Force text-only output (no ANSI, no box drawing, no
	 * `notify-send` / `osascript` / PowerShell spawn, no
	 * `\x07` bell). Composes with the auto-detected `isPlainMode()`
	 * heuristic in `router.ts` so a per-call opt-in is short-circuit
	 * — when `plain: true` is set, even `force: "terminal"` /
	 * `force: "os"` collapses into the plain text path.
	 *
	 * Output format:
	 *
	 *     notify.error: <title>
	 *       body: <body line>
	 *     actions:
	 *       [<id>] <label>
	 *
	 * Use when:
	 * - host stderr is being scraped by a log collector that doesn't
	 *   interpret ANSI,
	 * - the user prefers screen-reader / reduced-motion output,
	 * - the developer wants deterministic plain text for snapshot
	 *   tests / golden-file comparisons.
	 */
	plain?: boolean;
}

/**
 * Return shape from `notify()`. The `id` is opaque but stable:
 * `<backend-short-code>:<uuid>` so callers can correlate logs.
 */
export interface NotifyResult {
	id: string;
	backend: NotifyBackend;
	/** Resolves on TTL expiry (terminal) or backend close (OS/osc/bell). */
	dismissed: Promise<void>;
	/**
	 * Resolves to the pressed action `id` if the user clicked a toast
	 * chip in the inline terminal backend; resolves to `undefined`
	 * when the toast expires on TTL or the user's keypress didn't
	 * match any chip. Always resolves (never rejects) so consumers
	 * can `Promise.race`-style await it.
	 */
	action: Promise<string | undefined>;
}
