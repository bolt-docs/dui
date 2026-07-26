import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock node:child_process so the OS backend test is host-side-effect
// free — without this, calling `notify({ force: "os" })` would spawn
// `notify-send` / `osascript` / `powershell.exe` on the test machine.
//
// `FakeChild` exposes writable stdout / stderr EventEmitters so tests
// can drive `proc.stdout.on("data", …)` capture paths in
// `linuxNotify` / `windowsNotify` without needing a real spawn.
// Helpers `__resetMockChildren` / `__getLastChild` are stashed on the
// spawned function so tests can introspect the latest proc and reset
// state between tests without touching read-only function `.length`.
vi.mock("node:child_process", async () => {
	const EventEmitter = (await import("node:events")).EventEmitter;
	class FakeChild extends EventEmitter {
		stdout = new EventEmitter();
		stderr = new EventEmitter();
		stdio = [null, null, null];
		pid = 9999;
		unref = () => {};
		kill = (_signal?: string) => true;
	}
	const fakeChildren: FakeChild[] = [];
	const fakeSpawn = vi.fn((..._args: unknown[]) => {
		const child = new FakeChild();
		fakeChildren.push(child);
		return child as never;
	});
	Object.assign(fakeSpawn, {
		__getChildren: () => fakeChildren,
		__getLastChild: () => fakeChildren.at(-1),
		__resetMockChildren: () => {
			fakeChildren.length = 0;
		},
	});
	return {
		spawn: fakeSpawn,
		default: { spawn: fakeSpawn },
	};
});

import { bellNotify, notify, oscNotify } from "../src/index";
import {
	linuxNotify,
	macosNotify,
	windowsNotify,
} from "../src/backends/os.js";
import { terminalNotify } from "../src/backends/terminal.js";
import * as childProcessMock from "node:child_process";

// Fake TTY stdin for the action-capture tests.
class FakeStdin extends EventEmitter {
	isTTY = true;
	listenerCount(event: string): number {
		return super.listenerCount(event);
	}
	setRawMode = vi.fn((mode: boolean) => mode);
	off(event: string, listener: (...args: unknown[]) => unknown): this {
		super.removeListener(event, listener as never);
		return this;
	}
}

describe("notify()", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	it("exposes shorthand methods", () => {
		expect(notify.success).toBeTypeOf("function");
		expect(notify.info).toBeTypeOf("function");
		expect(notify.warning).toBeTypeOf("function");
		expect(notify.error).toBeTypeOf("function");
		expect(notify.neutral).toBeTypeOf("function");
		expect(notify.subscribe).toBeTypeOf("function");
	});

	it("force: bell routes to bell backend", async () => {
		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		const r = await notify({ body: "test", level: "info", force: "bell" });
		expect(r.backend).toBe("bell");
		expect(r.id.startsWith("bl:")).toBe(true);
		expect(stderrWrite).not.toHaveBeenCalledWith("\x07");
	});

	it("force: bell emits BEL on error level", async () => {
		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		await notify({ body: "BOOM", level: "error", force: "bell" });
		expect(stderrWrite).toHaveBeenCalledWith("\x07");
	});

	it("force: bell emits BEL on warning level", async () => {
		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		await notify({ body: "careful", level: "warning", force: "bell" });
		expect(stderrWrite).toHaveBeenCalledWith("\x07");
	});

	it("force: terminal writes a box-rendered toast to stderr", async () => {
		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		const r = await notify({
			body: "fast task done",
			title: "Build",
			level: "success",
			force: "terminal",
			ttl: 0,
		});
		expect(r.backend).toBe("terminal");
		expect(r.id.startsWith("tmn:")).toBe(true);
		const written = stderrWrite.mock.calls
			.map((args) => String(args[0]))
			.join("");
		expect(written).toMatch(/[╭┌]/);
		const stripped = written.replace(/\u001b\[[0-9;]*m/g, "");
		expect(stripped).toContain("Build");
		expect(stripped).toContain("fast task done");
	});

	it("terminal backend rings bell on warning by default", async () => {
		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		await notify({
			body: "careful",
			level: "warning",
			force: "terminal",
			ttl: 0,
		});
		const written = stderrWrite.mock.calls
			.map((args) => String(args[0]))
			.join("");
		expect(written).toContain("\x07");
	});

	it("terminal backend respects sound: false", async () => {
		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		await notify({
			body: "keep it down",
			level: "error",
			sound: false,
			force: "terminal",
			ttl: 0,
		});
		const written = stderrWrite.mock.calls
			.map((args) => String(args[0]))
			.join("");
		expect(written).not.toContain("\x07");
	});

	it("force: os backend produces PID-stamped id without side-effect spawn (mocked)", async () => {
		const r = await notify({
			body: "real desktop",
			title: "Headline",
			level: "info",
			force: "os",
		});
		expect(r.backend).toBe("os");
		expect(r.id).toMatch(/^(osx|nse|ps):/);
	});

	it("force: osc with KITTY_PID emits OSC 99 sequence", () => {
		vi.stubEnv("KITTY_PID", "12345");
		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		oscNotify({ body: "to kitty", title: "Hi", level: "info" });
		const written = stderrWrite.mock.calls
			.map((args) => String(args[0]))
			.join("");
		expect(written).toContain("\u001b]99;");
		expect(written).toContain("t=Hi");
		expect(written).toContain("d=to kitty");
	});

	it("force: osc with ITERM_SESSION_ID emits OSC 9 sequence", () => {
		vi.stubEnv("ITERM_SESSION_ID", "abc");
		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		oscNotify({ body: "to iterm", level: "info" });
		const written = stderrWrite.mock.calls
			.map((args) => String(args[0]))
			.join("");
		expect(written).toContain("\u001b]9;");
	});

	it("force: osc with WEZTERM_EXECUTABLE emits OSC 777 sequence", () => {
		vi.stubEnv("WEZTERM_EXECUTABLE", "/usr/bin/wezterm");
		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		oscNotify({ body: "to wez", level: "info" });
		const written = stderrWrite.mock.calls
			.map((args) => String(args[0]))
			.join("");
		expect(written).toContain("\u001b]777;notify;");
	});

	it("shorthand methods stamp level correctly", async () => {
		const a = await notify.success("ok", { force: "bell" });
		const b = await notify.error("BOOM", { force: "bell", sound: false });
		expect(a.backend).toBe("bell");
		expect(b.backend).toBe("bell");
		expect(b.id.startsWith("bl:")).toBe(true);
	});

	it("terminalNotify resolves dismissed immediately when ttl=0", async () => {
		const r = terminalNotify({ body: "fast", force: "terminal", ttl: 0 });
		expect(r.backend).toBe("terminal");
		await r.dismissed;
	});

	it("bellNotify returns a stable backend tag and a resolved action promise", async () => {
		const r = bellNotify({ body: "x", level: "info" });
		expect(r.backend).toBe("bell");
		expect(r.id.startsWith("bl:")).toBe(true);
		// Uniform shape: action promise exists and resolves to undefined.
		expect(await r.action).toBeUndefined();
	});

	it("subscribe receives a dismiss event when notification closes (no action)", async () => {
		const received: { id: string; backend: string; action?: string }[] =
			[];
		const unsub = notify.subscribe((evt) => received.push(evt));
		const r = await notify.info("subscribed", { force: "bell" });
		await r.dismissed;
		await new Promise((res) => setTimeout(res, 0));
		expect(received.length).toBe(1);
		expect(received[0].id).toBe(r.id);
		expect(received[0].backend).toBe("bell");
		expect(received[0].action).toBeUndefined();
		unsub();
	});

	it("subscribe unsubscribe stops further events", async () => {
		const received: { id: string }[] = [];
		const unsub = notify.subscribe((evt) =>
			received.push({ id: evt.id }),
		);
		const r1 = await notify.info("first", { force: "bell" });
		await r1.dismissed;
		await new Promise((res) => setTimeout(res, 0));
		unsub();
		const r2 = await notify.info("second", { force: "bell" });
		await r2.dismissed;
		await new Promise((res) => setTimeout(res, 0));
		expect(received.length).toBe(1);
		expect(received[0].id).toBe(r1.id);
	});
});

// ---------------------------------------------------------------------------
// Plain-mode accessibility tests — verify multi-line `prefix:` text
// output when `configure({ plain: true })` or per-call `plain: true`
// forces the accessibility layer on.
// ---------------------------------------------------------------------------
import {
	configure,
	refreshAccessibility,
	resetConfig,
} from "@bdocs/dui";	describe("notify plain-mode accessibility", () => {
	beforeEach(() => {
		resetConfig();
		// vi.unstubAllEnvs before refreshAccessibility so the cache
		// snapshots the post-cleanup env, not stubbed values from
		// the previous test.
		vi.unstubAllEnvs();
		refreshAccessibility();
	});

	afterEach(() => {
		resetConfig();
		vi.unstubAllEnvs();
		refreshAccessibility();
		vi.restoreAllMocks();
		mockedSpawn.__resetMockChildren();
	});

	it("bellNotify writes multi-line `prefix:` text and skips the bell on plain mode", async () => {
		configure({ plain: true });
		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		const r = await notify.error("CI failed", {
			title: "OpenCode",
			force: "bell",
		});
		// Even with `force: "bell"`, plain mode overrides transport so
		// the id is plain-text (pln: prefix).
		expect(r.id.startsWith("pln:")).toBe(true);
		const written = stderrWrite.mock.calls
			.map((args) => String(args[0]))
			.join("");
		expect(written).toContain("notify.error: OpenCode");
		expect(written).toContain("body: CI failed");
		expect(written).not.toContain("\x07");
		expect(written).not.toMatch(/\x1b\[/);
	});

	it("plain mode routes force:\"terminal\" through bellNotify text path", async () => {
		configure({ plain: true });
		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		const r = await notify.error("build failed", {
			title: "CI",
			force: "terminal",
			actions: [{ id: "open-logs", label: "Open logs" }],
		});
		// router.chooseBackend routes to bell when isPlainMode is true,
		// so r.backend is "bell" + id switches to pln: — even though the
		// caller passed `force: "terminal"`. The accessibility preference
		// wins over the transport preference.
		expect(r.backend).toBe("bell");
		expect(r.id.startsWith("pln:")).toBe(true);
		const written = stderrWrite.mock.calls
			.map((args) => String(args[0]))
			.join("");
		expect(written).toContain("notify.error: CI");
		expect(written).toContain("body: build failed");
		expect(written).toContain("actions:");
		expect(written).toContain("[open-logs] Open logs");
		// No box drawing glyphs.
		expect(written).not.toMatch(/[╭╮╰╯│]/);
		// No SGR sequence.
		expect(written).not.toMatch(/\x1b\[/);
	});

	it("plain mode falls back to plain text even with `force: \"os\"` (no spawn)", async () => {
		configure({ plain: true });
		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		const r = await notify.error("hi", { force: "os" });
		// pickBackend routed through bell because isPlainMode is true,
		// bellNotify wrote text — no `notify-send` / `osascript` / `powershell.exe`.
		expect(r.id.startsWith("pln:")).toBe(true);
		expect(mockedSpawn).not.toHaveBeenCalled();
		const written = stderrWrite.mock.calls
			.map((args) => String(args[0]))
			.join("");
		expect(written).toContain("notify.error:");
	});

	it("chooseBackend routes to `bell` when isPlainMode is true", () => {
		configure({ plain: true });
		const r = bellNotify({ body: "x", level: "info" });
		// chooseBackend returns "bell" so the result.backend is "bell"
		// (the plain-text path, no audible bell).
		expect(r.backend).toBe("bell");
	});

	it("NO_COLOR env var triggers plain mode automatically", async () => {
		vi.stubEnv("NO_COLOR", "1");
		// Refresh so the heuristic cache picks up the new env state —
		// without this, cached `noColor: false` from earlier tests
		// would mask the auto-detect.
		refreshAccessibility();
		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		// Force "terminal" so without the a11y logic the rounded-box
		// would have rendered. Plain-mode override should kick in.
		const r = await notify.error("auto", { force: "terminal" });
		const written = stderrWrite.mock.calls
			.map((args) => String(args[0]))
			.join("");
		expect(written).toContain("notify.error:"); // plain text prefix
		expect(written).not.toMatch(/[╭╮╰╯│]/);
		expect(r.id.startsWith("pln:")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// OS-level action capture tests — Linux libnotify, Windows MessageBox,
// macOS honest gap.
// ---------------------------------------------------------------------------
const mockedSpawn = childProcessMock.spawn as unknown as ((...args: unknown[]) => unknown) & {
	mockClear: () => void;
	__resetMockChildren: () => void;
	__getLastChild: () => FakeChild | undefined;
	__getChildren: () => FakeChild[];
	mock: { calls: unknown[][] };
};

function getLastChild(): FakeChild {
	const child = mockedSpawn.__getLastChild();
	if (!child) throw new Error("no spawned child available");
	return child;
}

describe("OS-level action capture (libnotify on Linux)", () => {
	beforeEach(() => {
		mockedSpawn.mockClear();
		mockedSpawn.__resetMockChildren();
	});

	it("passes `-A id:label` flag pairs and `-w` so notify-send blocks + writes action id to stdout", () => {
		linuxNotify(
			{
				body: "build failed",
				title: "CI",
				level: "error",
				actions: [
					{ id: "logs", label: "Open logs" },
					{ id: "rerun", label: "Re-run CI" },
				],
			} as never,
			"build failed",
			"CI",
		);

		const spawnArgs = mockedSpawn.mock.calls;
		const lastCall = spawnArgs[spawnArgs.length - 1];
		expect(lastCall).toBeDefined();
		// linuxNotify's argv: ["-u", ..., "-t", ..., "-A", "logs:Open logs", "-A", "rerun:Re-run CI", "-w", title, body]
		const argv = lastCall[1] as string[];
		expect(argv).toContain("-w");
		expect(argv).toContain("-A");
		const idxA = argv.indexOf("-A");
		expect(argv[idxA + 1]).toBe("logs:Open logs");
		const idxA2 = argv.indexOf("-A", idxA + 1);
		expect(argv[idxA2 + 1]).toBe("rerun:Re-run CI");
		// Sanity: title + body still positional at the end.
		expect(argv[argv.length - 2]).toBe("CI");
		expect(argv[argv.length - 1]).toBe("build failed");
	});

	it("captures a non-empty stdout line as the action id and resolves `result.action`", async () => {
		const r = linuxNotify(
			{
				body: "build failed",
				title: "CI",
				level: "error",
				actions: [
					{ id: "logs", label: "Open logs" },
					{ id: "rerun", label: "Re-run CI" },
				],
			} as never,
			"build failed",
			"CI",
		);
		const child = getLastChild();
		(child.stdout as EventEmitter).emit(
			"data",
			Buffer.from("\n\nrerun\n", "utf8"),
		);
		child.emit("close", 0);
		await r.dismissed;
		expect(await r.action).toBe("rerun");
	});

	it("resolves action=undefined when stdout is empty (plain dismissal / TTL)", async () => {
		const r = linuxNotify(
			{
				body: "build failed",
				title: "CI",
				level: "error",
				actions: [{ id: "logs", label: "Open logs" }],
			} as never,
			"build failed",
			"CI",
		);
		const child = getLastChild();
		(child.stdout as EventEmitter).emit("data", Buffer.from("\n", "utf8"));
		child.emit("close", 0);
		await r.dismissed;
		expect(await r.action).toBeUndefined();
	});

	it("buffers partial-line stdout chunks across emits", async () => {
		const r = linuxNotify(
			{
				body: "x",
				title: "T",
				level: "info",
				actions: [{ id: "open", label: "Open" }],
			} as never,
			"x",
			"T",
		);
		const child = getLastChild();
		const stdout = child.stdout as EventEmitter;
		// notify-send emits the action id in two chunks: "op" + "en\n"
		stdout.emit("data", Buffer.from("op", "utf8"));
		const stillPending = Symbol("still-pending");
		const result = await Promise.race([
			r.action,
			new Promise((res) => {
				setImmediate(() => res(stillPending));
			}),
		]);
		expect(result).toBe(stillPending);
		stdout.emit("data", Buffer.from("en\n", "utf8"));
		child.emit("close", 0);
		await r.dismissed;
		expect(await r.action).toBe("open");
	});

	it("resolves action=undefined on proc spawn error so the dispatcher falls back to bell", async () => {
		const r = linuxNotify(
			{
				body: "x",
				title: "T",
				level: "info",
				actions: [{ id: "open", label: "Open" }],
			} as never,
			"x",
			"T",
		);
		const child = getLastChild();
		child.emit("error", new Error("ENOENT"));
		await r.dismissed;
		expect(await r.action).toBeUndefined();
	});

	it("does not emit `-A` flags when `opts.actions` is empty, but still includes `-w`", () => {
		linuxNotify(
			{
				body: "x",
				title: "T",
				level: "info",
			} as never,
			"x",
			"T",
		);
		const argv = mockedSpawn.mock.calls.at(-1)![1] as string[];
		expect(argv).not.toContain("-A");
		expect(argv).toContain("-w");
	});
});

describe("OS-level action capture (Windows MessageBox)", () => {
	beforeEach(() => {
		mockedSpawn.mockClear();
		mockedSpawn.__resetMockChildren();
	});

	it("uses `YesNo` button style for 2 actions and maps `Yes` → first action id, `No` → last", async () => {
		mockedSpawn.__resetMockChildren();
		const r = windowsNotify(
			{
				body: "Sure?",
				title: "T",
				level: "warning",
				actions: [
					{ id: "confirm", label: "Yes" },
					{ id: "cancel", label: "No" },
				],
			} as never,
			"Sure?",
			"T",
		);
		const child = getLastChild();
		// Sanity: `YesNo` style was chosen in the PowerShell script argv.
		// spawn signature: (cmd, argv, options) — `argv` is at index 1
		// of the call args, and the script string lives at argv[1].
		const script = (mockedSpawn.mock.calls.at(-1)![1] as string[])?.[1];
		expect(script).toContain("'YesNo'");

		(child.stdout as EventEmitter).emit(
			"data",
			Buffer.from("Yes\r\n", "utf8"),
		);
		child.emit("close", 0);
		await r.dismissed;
		expect(await r.action).toBe("confirm");

		mockedSpawn.__resetMockChildren();
		const r2 = windowsNotify(
			{
				body: "Sure?",
				title: "T",
				level: "warning",
				actions: [
					{ id: "yes", label: "Yes" },
					{ id: "no", label: "No" },
				],
			} as never,
			"Sure?",
			"T",
		);
		const child2 = getLastChild();
		(child2.stdout as EventEmitter).emit(
			"data",
			Buffer.from("No\r\n", "utf8"),
		);
		child2.emit("close", 0);
		await r2.dismissed;
		expect(await r2.action).toBe("no");
	});

	it("uses `OKCancel` for 1 action and maps `OK` → action id", async () => {
		const r = windowsNotify(
			{
				body: "x",
				title: "T",
				level: "info",
				actions: [{ id: "open", label: "Open" }],
			} as never,
			"x",
			"T",
		);
		const script = (mockedSpawn.mock.calls.at(-1)![1] as string[])?.[1];
		expect(script).toContain("'OKCancel'");
		const child = getLastChild();
		(child.stdout as EventEmitter).emit(
			"data",
			Buffer.from("OK\r\n", "utf8"),
		);
		child.emit("close", 0);
		await r.dismissed;
		expect(await r.action).toBe("open");
	});

	it("uses `OK` for 0 actions and resolves action=undefined", async () => {
		const r = windowsNotify(
			{
				body: "x",
				title: "T",
				level: "info",
			} as never,
			"x",
			"T",
		);
		const script = (mockedSpawn.mock.calls.at(-1)![1] as string[])?.[1];
		expect(script).toContain("'OK'");
		const child = getLastChild();
		(child.stdout as EventEmitter).emit(
			"data",
			Buffer.from("OK\r\n", "utf8"),
		);
		child.emit("close", 0);
		await r.dismissed;
		expect(await r.action).toBeUndefined();
	});

	it("falls back to action=undefined when proc spawn errors", async () => {
		const r = windowsNotify(
			{
				body: "x",
				title: "T",
				level: "info",
				actions: [
					{ id: "yes", label: "Yes" },
					{ id: "no", label: "No" },
				],
			} as never,
			"x",
			"T",
		);
		const child = getLastChild();
		child.emit("error", new Error("ENOENT"));
		await r.dismissed;
		expect(await r.action).toBeUndefined();
	});
});

describe("OS-level action capture (macOS AppleScript)", () => {
	beforeEach(() => {
		mockedSpawn.mockClear();
		mockedSpawn.__resetMockChildren();
	});

	it("always resolves action=undefined (Apple removed click capture from osascript)", async () => {
		const r = macosNotify(
			{
				body: "x",
				title: "T",
				level: "info",
				actions: [{ id: "open", label: "Open" }],
			} as never,
			"x",
			"T",
		);
		expect(r.backend).toBe("os");
		// Even when `opts.actions` includes chips, macOS can't capture.
		// proc close still resolves dismissed (AppleScript exits after delivery).
		const child = getLastChild();
		child.emit("close", 0);
		await r.dismissed;
		expect(await r.action).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Action capture tests (terminal-only, with mocked stdin).
// ---------------------------------------------------------------------------
describe("terminalNotify action capture", () => {
	let fakeStdin: FakeStdin;
	beforeEach(() => {
		fakeStdin = new FakeStdin();
		// Install fakeStdin as process.stdin for the duration of
		// notification calls.
		Object.defineProperty(process, "stdin", {
			value: fakeStdin,
			configurable: true,
			writable: true,
		});
	});
	afterEach(() => {
		// Restore original stdin.
		// @ts-expect-error: original may be undefined in non-Node test env
		Object.defineProperty(process, "stdin", {
			value: undefined,
			configurable: true,
			writable: true,
		});
	});

	it("captures a matching keypress and resolves action with the action id", async () => {
		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		// ttl must be > 0 so the setTimeout teardown doesn't fire
		// before the keypress (otherwise teardown() with no args runs
		// first and resolves action=undefined, masking the chip fire).
		const r = terminalNotify({
			body: "click yes",
			level: "info",
			force: "terminal",
			ttl: 60_000,
			actions: [
				{ id: "yes", label: "Yes" },
				{ id: "no", label: "No" },
			],
		});
		// Drive the listener directly: char 'y' matches 'yes'.
		(fakeStdin.emit as unknown as (event: string, ...args: unknown[]) => boolean)(
			"data",
			Buffer.from("y"),
		);
		await r.dismissed;
		expect(await r.action).toBe("yes");
		expect(fakeStdin.setRawMode).toHaveBeenCalledWith(true);
		expect(stderrWrite).toHaveBeenCalled();
	});

	it("ignores escape sequences (arrow keys, alt+key) without firing", async () => {
		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		const r = terminalNotify({
			body: "ignore arrows",
			level: "info",
			force: "terminal",
			ttl: 60_000, // long enough that keypress alone resolves teardown
			actions: [{ id: "ok", label: "OK" }],
		});
		// Arrow up: \x1b[A
		(fakeStdin.emit as unknown as (event: string, ...args: unknown[]) => boolean)(
			"data",
			Buffer.from("\u001b[A"),
		);
		// Expect r.action to still be PENDING — fire escape, then
		// a 1ms timer to check it remained unresolved.
		const stillPending = Symbol("still-pending");
		const result = await Promise.race([
			r.action,
			new Promise((resolve) => setTimeout(() => resolve(stillPending), 30)),
		]);
		expect(result).toBe(stillPending);
		// Cleanup: emit o (matches) so test doesn't leak the listener.
		(fakeStdin.emit as unknown as (event: string, ...args: unknown[]) => boolean)(
			"data",
			Buffer.from("o"),
		);
		await r.dismissed;
		expect(await r.action).toBe("ok");
	});

	it("Ctrl-C aborts the toast even without a matching chip", async () => {
		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		const r = terminalNotify({
			body: "press ctrl-c",
			level: "info",
			force: "terminal",
			ttl: 60_000,
			actions: [{ id: "ok", label: "OK" }],
		});
		(fakeStdin.emit as unknown as (event: string, ...args: unknown[]) => boolean)(
			"data",
			Buffer.from("\u0003"),
		);
		await r.dismissed;
		// Ctrl-C doesn't match a chip — action is undefined.
		expect(await r.action).toBeUndefined();
	});

	it("skips stdin capture when another reader owns process.stdin", async () => {
		// Stub an existing listener — simulates an inquirer-style
		// select / multiselect reading the same stream concurrently.
		const conflicting = new EventEmitter();
		conflicting.on("data", () => {});
		Object.defineProperty(process, "stdin", {
			value: conflicting,
			configurable: true,
			writable: true,
		});
		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		const r = terminalNotify({
			body: "no capture",
			level: "info",
			force: "terminal",
			ttl: 0,
			actions: [{ id: "ok", label: "OK" }],
		});
		await r.dismissed;
		// No chip rendering happens either when stdin is busy.
		expect(await r.action).toBeUndefined();
	});

	it("skips stdin capture when process.stdin is non-TTY", async () => {
		const nonTTY = new EventEmitter();
		Object.defineProperty(nonTTY, "isTTY", { value: false });
		Object.defineProperty(nonTTY, "setRawMode", { value: undefined });
		Object.defineProperty(process, "stdin", {
			value: nonTTY,
			configurable: true,
			writable: true,
		});
		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		const r = terminalNotify({
			body: "no tty",
			level: "info",
			force: "terminal",
			ttl: 0,
			actions: [{ id: "ok", label: "OK" }],
		});
		await r.dismissed;
		expect(await r.action).toBeUndefined();
	});
});
