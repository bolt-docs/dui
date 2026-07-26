/**
 * Bell + plain-text fallback backend.
 *
 * Three jobs, picked from context:
 *
 *   1. **Bell** — emit `\x07` to stderr when `sound` is forced-on or
 *      when the level is `error` / `warning` *and* the caller did
 *      not opt out. Used in CI / non-TTY / disconnected envs when
 *      OS spawn and OSC delivery are off the table.
 *   2. **Plain text** — when `isPlainMode(opts, getConfig())`
 *      returns true (forced per-call `plain: true`, configure
 *      `plain: true`, OR auto-detected heuristic), write the
 *      multi-line prefix-annotated text representation straight to
 *      stderr. No ANSI, no `\x07`, no box drawing. Used by host
 *      consumers that pipe stderr into log scrapers or screen readers.
 *   3. **Dual** — when both conditions hold (plain-mode TRUE and
 *      caller asked for the bell), the plain text path runs and the
 *      audible bell is suppressed. The accessibility preference
 *      always wins over the audible cue.
 */
import { getConfig } from "@bdocs/dui";
import { randomUUID } from "node:crypto";
import { isPlainMode, plainEmit } from "../accessibility.js";
import type { NotifyOptions, NotifyResult } from "../types.js";

export function bellNotify(opts: NotifyOptions): NotifyResult {
	const plain = isPlainMode({ plain: opts.plain }, getConfig());

	if (plain) {
		// Plain-text path: multi-line prefix text to stderr, no `\x07`.
		// The noise from real stdout cannot afford ANSI because the
		// host may be a CI log, log scraper, or screen reader.
		try {
			process.stderr.write(plainEmit(opts) + "\n");
		} catch {
			/* ignore — stderr closed */
		}
		return {
			id: `pln:${randomUUID()}`,
			backend: "bell",
			dismissed: Promise.resolve(),
			action: Promise.resolve(undefined),
		};
	}

	const ringByDefault = opts.level === "error" || opts.level === "warning";
	const ring = opts.sound ?? ringByDefault;
	if (ring) {
		try {
			process.stderr.write("\x07");
		} catch {
			// ignored — best-effort
		}
	}
	return {
		id: `bl:${randomUUID()}`,
		backend: "bell",
		dismissed: Promise.resolve(),
		// Bell never captures an input event — the bell is a
		// fire-and-forget surface, so `action` resolves immediately
		// to `undefined` so the dispatcher can `await result.action`
		// uniformly across all four backends.
		action: Promise.resolve(undefined),
	};
}
