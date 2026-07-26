/**
 * OSC escape-sequence notification backend.
 *
 * Picked only when `chooseBackend()` decides the host terminal emulator
 * is one of: Kitty, iTerm2, WezTerm, foot / foot-extra, or Ghostty.
 * These terminals intercept the OSC payload and surface it as a real
 * desktop notification through the emulator's own plumbing — no child
 * process, no shell escapes needed.
 *
 * The payload is written to **stderr**, never stdout, so it never
 * pollutes a pipe that the caller expects to be JSON / log lines.
 * Exit-event signalling is not implemented (Kitty returns click
 * notifications via OSC 99 reply, but doesn't carry an action id);
 * `dismissed` resolves immediately after the write so the caller's
 * promise flow doesn't hang.
 *
 * Plain-mode override: `\x1b]99;…` / `\x1b]9;…` / `\x1b]777;…` escape
 * sequences are themselves the kind of ANSI we're trying to avoid in
 * plain mode. When `isPlainMode(opts)` is true, fall back to
 * `bellNotify` so the multi-line `prefix:` text wins. The
 * accessibility preference overrides the user's transport preference.
 */
import { randomUUID } from "node:crypto";
import type { NotifyOptions, NotifyResult } from "../types.js";

/** String Terminator — `ESC \`. Some terminals also accept BEL `\x07`. */
const ST = "\x1b\\";

function oscKitty(opts: NotifyOptions): NotifyResult {
	const title = (opts.title ?? "").replace(/[\x1b\x07\x9c]/g, "");
	const body = (opts.body ?? "").replace(/[\x1b\x07\x9c]/g, "");
	const level = opts.level ?? "info";
	const out = `\x1b]99;i=plugin-notify;l=${level};t=${title};d=${body}${ST}`;
	process.stderr.write(out);
	return {
		id: `kty:${randomUUID()}`,
		backend: "osc",
		dismissed: Promise.resolve(),
		action: Promise.resolve(undefined),
	};
}

function oscITerm(opts: NotifyOptions): NotifyResult {
	const combined = ((opts.title ? `${opts.title}: ` : "") + (opts.body ?? ""))
		.replace(/[\x1b\x07\x9c]/g, "")
		.replace(/;/g, ","); // `;` is the OSC 9 payload separator
	const out = `\x1b]9;${combined}${ST}`;
	process.stderr.write(out);
	return {
		id: `itm:${randomUUID()}`,
		backend: "osc",
		dismissed: Promise.resolve(),
		action: Promise.resolve(undefined),
	};
}

function oscGeneric(opts: NotifyOptions): NotifyResult {
	const title = (opts.title ?? "").replace(/[\x1b\x07\x9c]/g, "");
	const body = (opts.body ?? "").replace(/[\x1b\x07\x9c]/g, "");
	const out = `\x1b]777;notify;title=${title};body=${body}${ST}`;
	process.stderr.write(out);
	return {
		id: `osc:${randomUUID()}`,
		backend: "osc",
		dismissed: Promise.resolve(),
		action: Promise.resolve(undefined),
	};
}

export function oscNotify(opts: NotifyOptions): NotifyResult {
	// Plain-mode routing is centralised in `router.ts` —
	// `chooseBackend()` returns `"bell"` whenever `isPlainMode()` is
	// true, so this function only runs in styled mode. If you need
	// plain output here, call `notify(opts)` instead so the routing
	// invariant holds (and no OSC 99/9/777 escape is written).
	if (process.env.KITTY_PID || process.env.TERM === "xterm-kitty") {
		return oscKitty(opts);
	}
	if (process.env.ITERM_SESSION_ID) {
		return oscITerm(opts);
	}
	// WezTerm / foot / Ghostty use the OSC 777 form.
	return oscGeneric(opts);
}
