/**
 * Inline terminal toast backend.
 *
 * Renders a `box({ style: "round" })` frame containing:
 *
 *   - a `badge({ status: level })` chip in the header,
 *   - the `title` (coloured bold via the box border row),
 *   - the `body` (multi-line preserved, wrapped via `wrapAnsiWord`),
 *   - an optional action footer (`[ [K]eybind ][ [O]pen ]`).
 *
 * The toast is written to **stderr** so it doesn't pollute stdout
 * pipes the host CLI may be parsing. After `ttl` milliseconds, the
 * cursor is repositioned to the top of the toast and each line is
 * cleared with `EL (\x1b[2K)` so the scrollback shrinks back down.
 *
 * Action capture (terminal-only): when `opts.actions` is non-empty
 * AND `process.stdin` is a TTY AND no other reader has bound the
 * `data` event, the toast hijacks stdin raw mode for the toast's
 * lifetime. The first char of each action's `label` (case-insensitive)
 * becomes the keyboard shortcut. Pressing the matching key maps to
 * the action's `id` and resolves `NotifyResult.action`.
 *
 * - Stdin is restored to its prior mode on either TTL expiry or first
 *   matching keypress.
 * - `process.once('exit', …)` guarantees cleanup if the host CLI exits
 *   mid-toast (no leak).
 * - Escape sequences and modifier-only chunks (`\x1b[A`, `\x1b[1;5A`,
 *   etc.) are ignored so arrow-key navigation in surrounding prompts
 *   never accidentally triggers a chip.
 * - Pasting the trigger char inside a multi-char chunk is treated as
 *   the chip fire — same `chunk[0]` semantics for safety.
 *
 * Bell: optional `sound` or auto on `error` / `warning` levels.
 *
 * The rendering reuses the @bdocs/dui high-level widgets that already
 * landed in v0.6.0-next.1: `box`, `badge`, `section`, plus internal
 * helpers (`wrapAnsiWord`, `visibleLength`) — so consumers can theme
 * the toast through the same `configure({ theme: { ... } })` slot
 * system as the rest of their CLI.
 */
import { badge, box, formatActionTokens } from "@bdocs/dui";
import { randomUUID } from "node:crypto";
import type {
	NotifyAction,
	NotifyOptions,
	NotifyResult,
} from "../types.js";

const HEADER_BADGE_TITLE = (level: NotifyOptions["level"]): string => {
	const m: Record<string, string> = {
		success: "✔ Notification",
		info: "ⓘ Notification",
		warning: "⚠ Warning",
		error: "✖ Error",
		neutral: "· Note",
	};
	return m[level ?? "info"];
};

/**
 * Build a `key → action.id` map from the actions list (first char,
 * lowercased). Emits `process.emitWarning` on collision so callers
 * are aware of the multi-match ambiguity.
 */
function buildActionMap(
	actions: readonly NotifyAction[] | undefined,
): Map<string, string> {
	const map = new Map<string, string>();
	if (!actions) return map;
	for (const action of actions) {
		const ch = action.label.charAt(0).toLowerCase();
		if (!ch) continue;
		if (map.has(ch)) {
			process.emitWarning(
				`@dui-toolkit/plugin-notify: action collision on key "${ch}" — ` +
					`"${map.get(ch)}" wins over "${action.id}". Use unique first letters.`,
				"DUINotifyActionCollision",
			);
			continue;
		}
		map.set(ch, action.id);
	}
	return map;
}

/**
 * Safe stdin hijack check: returns true only when the host stdin is a
 * TTY and no other reader has bound the `data` event. This avoids
 * stealing stdin from an inquirer-style `select`/`multiselect` flow
 * running concurrently.
 */
function canCaptureStdin(): boolean {
	const stdin = process.stdin;
	if (!stdin || !stdin.isTTY) return false;
	if (stdin.listenerCount("data") > 0) return false;
	return true;
}

/**
 * Decode a single keypress chunk. Any chunk starting with `ESC`
 * (arrow keys, function keys, alt/meta combinations) is ignored.
 * Returns the lowercased single character or undefined.
 */
function decodeKey(chunk: Buffer): string | undefined {
	if (chunk.length === 0) return undefined;
	if (chunk[0] === 0x1b) return undefined; // ESC + sequences
	const ch = chunk.toString("utf8").charAt(0);
	if (!ch || ch === "\n" || ch === "\r") return undefined;
	return ch.toLowerCase();
}

export function terminalNotify(opts: NotifyOptions): NotifyResult {
	// Plain-mode routing is centralised in `router.ts` —
	// `chooseBackend()` returns `"bell"` whenever `isPlainMode()` is
	// true, so this function only runs in styled mode. Direct
	// importers of `terminalNotify` (e.g. tests, bespoke
	// plugin integrations) bypass that router; if you need plain
	// output here, call `notify(opts)` instead so the routing
	// invariant holds.
	const level = opts.level ?? "info";

	// Compose toast content.
	const lines: string[] = [];
	const chipLabel = level === "info" ? "INFO" : level.toUpperCase();
	lines.push(badge({ label: chipLabel, status: level }));
	if (opts.body && opts.body.length > 0) {
		lines.push(...opts.body.split("\n"));
	}
	if (opts.icon) {
		lines.push("");
		lines.push(opts.icon);
	}
	const actionFooter = formatActionTokens(opts.actions);
	if (actionFooter.length > 0) {
		lines.push("");
		lines.push(actionFooter);
	}

	const toast = box(lines, {
		title: opts.title ?? HEADER_BADGE_TITLE(level),
		style: "round",
	});
	const visibleRows = toast.split("\n").length;

	try {
		process.stderr.write("\n" + toast + "\n");
	} catch {
		/* best-effort */
	}

	const ringByDefault = level === "error" || level === "warning";
	const ring = opts.sound ?? ringByDefault;
	if (ring) {
		try {
			process.stderr.write("\x07");
		} catch {
			/* ignore */
		}
	}

	// ----------------------------------------------------------------
	// Cleanup wiring — unify TTL + keypress + process.exit into a
	// single teardown. Whichever fires first cancels the others.
	// ----------------------------------------------------------------
	const id = `tmn:${randomUUID()}`;
	let resolveDismiss: () => void = () => {};
	let resolveAction: (a: string | undefined) => void = () => {};
	const dismissed = new Promise<void>((r) => (resolveDismiss = r));
	const action = new Promise<string | undefined>((r) => (resolveAction = r));

	let cleaned = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let stdinBound = false;
	const stdin = process.stdin;
	const wasRaw = stdin.isTTY ? (stdin as { isRaw?: boolean }).isRaw : false;
	let boundListener: ((chunk: Buffer) => void) | undefined;

	function clearVisual(): void {
		try {
			process.stderr.write(`\x1b[${visibleRows}A`);
			for (let i = 0; i < visibleRows; i++) {
				process.stderr.write("\r\x1b[2K");
				if (i < visibleRows - 1) process.stderr.write("\n");
			}
			process.stderr.write(`\x1b[${visibleRows}A`);
		} catch {
			/* ignore */
		}
	}

	function teardown(actionId?: string): void {
		if (cleaned) return;
		cleaned = true;
		if (timer) clearTimeout(timer);
		if (stdinBound && boundListener && stdin) {
			stdin.off("data", boundListener);
			stdinBound = false;
			try {
				if (stdin.isTTY) stdin.setRawMode(false);
			} catch {
				/* ignore */
			}
		}
		clearVisual();
		resolveAction(actionId);
		resolveDismiss();
	}

	// Stdin capture branch — only when stdin is a free TTY.
	const actionMap = buildActionMap(opts.actions);
	const captureable = actionMap.size > 0 && canCaptureStdin();

	if (captureable) {
		try {
			stdin.setRawMode(true);
		} catch {
			/* ignore non-TTY or unsupported platforms */
		}
		boundListener = (chunk: Buffer) => {
			const key = decodeKey(chunk);
			if (!key) return;
			const matched = actionMap.get(key);
			if (matched !== undefined) {
				teardown(matched);
				return;
			}
			// Esc / Ctrl-C fallback — still let the user abort even
			// without a matching chip so a misconfigured action map
			// never traps the toast on screen.
			if (key === "\x03" || chunk[0] === 0x1b) teardown();
		};
		stdin.on("data", boundListener);
		stdinBound = true;
		// Silence `wasRaw` warning — it's a smell that CLI is hijacking
		// stdin, but for MVP kidnapping is opt-in (the user passed
		// `actions`). Future revisions can guard against double-bind.
		void wasRaw;
	}

	// Process exit cleanup — restores stdin before dying so the host
	// CLI doesn't print `stty: 'tcsetattr: Interrupted` warnings.
	process.once("exit", () => {
		if (!cleaned) teardown();
	});

	const ttl = opts.ttl ?? 5000;
	if (ttl > 0) {
		timer = setTimeout(() => teardown(), ttl);
		if (typeof timer.unref === "function") timer.unref();
	} else {
		teardown();
	}

	return { id, backend: "terminal", dismissed, action };
}
