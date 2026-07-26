/**
 * OS-level notification backend.
 *
 * Spawns native notification tooling via `child_process.spawn` with
 * **exact argv arrays** — NO `shell: true`, no shell-string interpolation.
 *
 * Action capture across platforms:
 *
 * | Platform    | Capture path                                                            | Status |
 * | ----------- | ----------------------------------------------------------------------- | ------ |
 * | Linux       | `notify-send -A id:label ... -w`; chosen action id is written to stdout | ✅ ship |
 * | Windows     | `[System.Windows.Forms.MessageBox]::Show(...)` returns DialogResult; stdout maps result → action | ✅ ship (best-effort, max 2 actions) |
 * | macOS       | `osascript -e 'display notification ...'`                                | ❌ Apple removed click capture from AppleScript years ago |
 * |            |                                                                          | `result.action` resolves to `undefined` honestly. |
 *
 * Errors from the OS tools are swallowed: a missing `notify-send`,
 * unparseable DialogResult, or any spawn failure routes the
 * `result.action` to `undefined` and resolves `dismissed` on proc
 * close. The notify dispatcher wraps each OS call in a `try`-`catch`
 * so a thrown synchronous error falls back to `bellNotify` entirely.
 *
 * Plain-mode override: when `isPlainMode(opts)` returns true, this
 * backend skips the spawn entirely and falls through to `bellNotify`,
 * which renders the multi-line `prefix:` text straight to stderr.
 * That keeps `notify({ force: "os" })` honest in test/CI: the
 * accessibility preference still wins, but no `notify-send` /
 * `osascript` / `powershell.exe` is invoked.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import type {
	NotifyLevel,
	NotifyOptions,
	NotifyResult,
} from "../types.js";

// Urgency mapping for `notify-send -u` (libnotify).
const URGENCY: Record<NotifyLevel, "low" | "normal" | "critical"> = {
	success: "low",
	info: "normal",
	warning: "normal",
	error: "critical",
	neutral: "normal",
};

function escapeAppleString(s: string): string {
	return s
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\n/g, " ");
}

function escapePwshString(s: string): string {
	return s
		.replace(/`/g, "``")
		.replace(/"/g, '""')
		.replace(/\n/g, "; ");
}

/**
 * One-stop cleanup for any OS backend: a single `teardown()` runs
 * the defer guards across `dismissed` + `action`, so callers never
 * observe double-resolve and never see a stranded promise.
 */
function makeOsResult(
	id: string,
): {
	dismissed: Promise<void>;
	action: Promise<string | undefined>;
	teardown(actionId?: string): void;
	dismissOnly(): void;
} {
	let resolveDismiss: () => void = () => {};
	let resolveAction: (id: string | undefined) => void = () => {};
	const dismissed = new Promise<void>((r) => (resolveDismiss = r));
	const action = new Promise<string | undefined>((r) => (resolveAction = r));
	let cleaned = false;
	return {
		dismissed,
		action,
		teardown(actionId?: string) {
			if (cleaned) return;
			cleaned = true;
			resolveAction(actionId);
			resolveDismiss();
		},
		dismissOnly() {
			if (cleaned) return;
			cleaned = true;
			resolveAction(undefined);
			resolveDismiss();
		},
	};
}

/**
 * Pull the first non-empty trimmed line + everything after it out
 * of a stdout chunk. notify-send (PowerShell) may emit partial
 * lines across chunk boundaries, so we buffer internally and the
 * caller loops until either a non-empty line lands or no terminator
 * is present.
 *
 * Returns `null` if the chunk doesn't yet contain a complete line
 * (no `\n` or `\r\n` terminator found). Callers should re-feed the
 * same chunk on the next `data` event.
 */
function firstLineOf(
	chunk: string,
): { line: string; remainder: string } | null {
	const idx = chunk.search(/\r?\n/);
	if (idx === -1) return null;
	return {
		line: chunk.slice(0, idx).trim(),
		remainder: chunk.slice(idx + (chunk[idx] === "\r" ? 2 : 1)),
	};
}

/**
 * Wire stdout-capture → teardown for any OS action-capture backend.
 * Buffers partial lines, feeds each complete `\r?\n`-terminated line
 * through `map(line)`, and resolves the lifecycle via `teardown` on
 * the first non-empty mapping result (or `dismissOnly` on proc
 * close / error if no line ever arrives).
 */
function tryCaptureAction(
	proc: ReturnType<typeof spawn>,
	teardown: (actionId?: string) => void,
	dismissOnly: () => void,
	map: (line: string) => string | undefined,
): void {
	let captureBuf = "";
	let resolved = false;

	function feed(raw: string): void {
		if (resolved) return;
		let remainder = captureBuf + raw;
		while (remainder.length > 0) {
			const parsed = firstLineOf(remainder);
			if (parsed === null) {
				captureBuf = remainder;
				return;
			}
			remainder = parsed.remainder;
			if (parsed.line.length === 0) continue;
			captureBuf = "";
			resolved = true;
			teardown(map(parsed.line));
			return;
		}
	}

	if (proc.stdout) {
		proc.stdout.on("data", (chunk: Buffer) =>
			feed(chunk.toString("utf8")),
		);
	}
	proc.on("error", () => {
		if (!resolved) dismissOnly();
	});
	proc.on("close", () => {
		if (!resolved) dismissOnly();
	});
}

export function macosNotify(
	opts: NotifyOptions,
	bodyText: string,
	titleText: string,
): NotifyResult {
	const title = escapeAppleString(titleText);
	const subtitle = opts.icon ? escapeAppleString(opts.icon) : "";
	const body = escapeAppleString(bodyText);
	const script = subtitle
		? `display notification "${body}" with title "${title}" subtitle "${subtitle}"`
		: `display notification "${body}" with title "${title}"`;
	const proc = spawn("osascript", ["-e", script], { stdio: "ignore" });
	proc.unref();
	const id = `osx:${randomUUID()}`;
	const { dismissed, dismissOnly } = makeOsResult(id);
	proc.on("error", () => dismissOnly());
	proc.on("close", () => dismissOnly());
	// AppleScript can't capture click events (Apple removed support).
	// Action IDs are not reachable through the OS layer on macOS —
	// `dismissOnly` resolves `action: undefined` consistently.
	// Future: a Swift/ObjC helper plugging UNUserNotificationCenter
	// (or a `terminal`-force opt-in) for action capture on macOS.
	void opts;
	return { id, backend: "os", dismissed, action: Promise.resolve(undefined) };
}

/**
 * Linux libnotify action capture.
 *
 * `notify-send -A id:label ... -w` (libnotify ≥ 0.7.9) registers each
 * action with the notification daemon, blocks until the user picks
 * one (or dismisses), and writes the chosen action `id` to stdout
 * before exiting. The proc stays alive for as long as the toast is
 * on screen, so `dismissed` resolves meaningfully across the toast's
 * actual lifetime instead of immediately after daemon-acceptance.
 *
 * If multiple stdout chunks arrive (multi-line or partial-line) we
 * take the FIRST non-empty trimmed line as the action id, drop any
 * extra chunks, and resolve the lifecycle.
 *
 * If the proc errors out (missing notify-send, X11/Wayland daemon
 * not running, libnotify too old) `result.action` resolves to
 * `undefined` and `result.dismissed` resolves on proc close.
 * `dismissed` always resolves even on error so callers can `await`
 * it without hanging.
 */
export function linuxNotify(
	opts: NotifyOptions,
	bodyText: string,
	titleText: string,
): NotifyResult {
	const args: string[] = [
		"-u",
		URGENCY[opts.level ?? "info"],
		"-t",
		String(opts.ttl ?? 5000),
	];
	if (opts.icon) args.push("-i", opts.icon);
	// Declare one `-A "id:label"` arg pair per NotifyAction. The pairs
	// are pushed atomically so they stay grouped.
	if (opts.actions && opts.actions.length > 0) {
		for (const a of opts.actions) args.push("-A", `${a.id}:${a.label}`);
	}
	// `-w` makes notify-send block until the toast is dismissed or an
	// action is invoked. Without it, notify-send exits as soon as the
	// daemon accepts the toast and we'd resolve `dismissed` before the
	// user even sees the toast.
	args.push("-w");
	// Title is positional at the end of flags; body follows title.
	// Note: when `-A` flags are passed, notify-send treats <title> as
	// the summary and <body> as the body. With empty body, libnotify
	// collapses to title-only. We always pass title; body is appended
	// only if non-empty so we don't end up with an empty trailing arg.
	args.push(titleText);
	if (bodyText.length > 0) args.push(bodyText);

	const proc = spawn("notify-send", args, {
		stdio: ["ignore", "pipe", "ignore"],
	});
	proc.unref();

	const id = `nse:${randomUUID()}`;
	const { dismissed, action, teardown, dismissOnly } = makeOsResult(id);
	// First non-empty trimmed stdout line is the chosen action id.
	tryCaptureAction(proc, teardown, dismissOnly, (line) => line);

	return { id, backend: "os", dismissed, action };
}

/**
 * Windows MessageBox DialogResult capture.
 *
 * Native Windows GUI dialog. `[System.Windows.Forms.MessageBox]::Show(...)`
 * returns a `DialogResult` enum (`OK` / `Cancel` / `Yes` / `No` /
 * `Abort` / `Retry` / `Ignore`). We capture the result with
 * `$r = ...; Write-Output $r` and read stdout.
 *
 * Button-style mapping (best-effort parity with `NotifyAction[]`):
 * - 0 actions  → `OK`            (info toast)
 * - 1 action   → `OKCancel`      (OK ≡ action[0].id, Cancel ≡ undefined)
 * - 2 actions  → `YesNo`         (Yes ≡ action[0].id, No ≡ action[1].id)
 * - 3+ actions → degraded to `YesNo` so the dialog still closes
 *
 * `result.dismissed` resolves when the user closes the dialog or the
 * proc closes (e.g. PowerShell closed by the OS error reporter).
 */
export function windowsNotify(
	opts: NotifyOptions,
	bodyText: string,
	titleText: string,
): NotifyResult {
	const title = escapePwshString(titleText);
	const body = escapePwshString(bodyText);
	const actions = opts.actions ?? [];
	// Pick MessageBox style based on action count.
	let buttonStyle: "OK" | "OKCancel" | "YesNo";
	if (actions.length >= 2) buttonStyle = "YesNo";
	else if (actions.length === 1) buttonStyle = "OKCancel";
	else buttonStyle = "OK";

	const script = `[reflection.assembly]::loadwithpartialname('System.Windows.Forms') | Out-Null; $r = [System.Windows.Forms.MessageBox]::Show('${body}', '${title}', '${buttonStyle}'); Write-Output $r`;
	const proc = spawn("powershell.exe", ["-Command", script], {
		stdio: ["ignore", "pipe", "ignore"],
	});
	proc.unref();

	const id = `ps:${randomUUID()}`;
	const { dismissed, action, teardown, dismissOnly } = makeOsResult(id);

	function resolveActionIdFromResult(result: string): string | undefined {
		// 0 actions → no mapping; any close is just a dismissal.
		if (actions.length === 0) return undefined;
		if (actions.length === 1) {
			// OKCancel → OK ≡ action[0].id, Cancel ≡ undefined (no action).
			if (result === "OK") return actions[0]?.id;
			return undefined;
		}
		// 2+ actions: YesNo mapping. We use the FIRST action as the
		// "Yes"/positive choice and the LAST as the "No"/negative.
		// Callers can pass `[ {id:"yes"}, {id:"no"} ]` for natural mapping.
		if (actions.length >= 3) {
			// Degraded: all 3+ collapse to YesNo. First wins as Yes,
			// last wins as No; middle ones become unreachable. Document
			// the limitation in the docs page.
		}
		if (result === "Yes") return actions[0]?.id;
		if (result === "No") return actions[actions.length - 1]?.id;
		return undefined;
	}

	tryCaptureAction(proc, teardown, dismissOnly, resolveActionIdFromResult);

	return { id, backend: "os", dismissed, action };
}

/**
 * Surface the resolved text + title for the OS layer. The terminal
 * backend collapses title into the box border; here we keep title
 * and body as separate args because OS notification centers treat
 * them as independent fields.
 */
function payload(opts: NotifyOptions): { title: string; body: string } {
	const title = (opts.title ?? "Notification").trim();
	const body = (opts.body ?? "").trim();
	return { title, body };
}

export function osNotify(opts: NotifyOptions): NotifyResult {
	// Plain-mode routing is centralised in `router.ts` —
	// `chooseBackend()` returns `"bell"` whenever `isPlainMode()` is
	// true, so this function only runs in styled mode. If you need
	// plain output here, call `notify(opts)` instead so the
	// routing invariant holds (and no `notify-send` / `osascript`
	// / `powershell.exe` is spawned).
	const { title, body } = payload(opts);
	if (process.platform === "darwin") return macosNotify(opts, body, title);
	if (process.platform === "win32") return windowsNotify(opts, body, title);
	return linuxNotify(opts, body, title);
}
