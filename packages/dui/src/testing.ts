/**
 * Testing utilities for `@bdocs/dui` widgets.
 *
 * Widgets paint to `process.stdout` with cursor tricks (move-up,
 * clear-screen-down, in-place overwrites) that are useless in unit
 * tests. These helpers give you a **mock TTY** — a fake write stream
 * with `isTTY: true`, configurable `columns`/`rows`, and captured
 * output — so you can snapshot a widget's rendered text, or swap
 * `process.stdout` for the mock while an interactive widget runs and
 * inspect exactly what it wrote.
 *
 * @example
 * ```ts
 * import { describe, it, expect } from "vitest"
 * import { snapshotWidget } from "../src/testing"
 *
 * it("renders a box", async () => {
 *   const { plain } = await snapshotWidget(() => {
 *     process.stdout.write(box(["hi"], { width: 10 }))
 *   })
 *   expect(plain).toContain("┌")
 * })
 * ```
 */

import { stripAnsi } from "./utils";

export interface MockTtyOptions {
	/** Fake terminal width in columns. @default 80 */
	columns?: number;
	/** Fake terminal height in rows. @default 24 */
	rows?: number;
}

export interface MockTtyStream {
	/** The fake stream — pass it to widget options that accept a `stream`. */
	stream: NodeJS.WriteStream;
	/** Everything written since creation or the last `clear()`, as one string. */
	output: string;
	/** The output with ANSI sequences stripped — a pure text snapshot. */
	plain: string;
	/** Return the accumulated output as one string. */
	getOutput(): string;
	/** Return the ANSI-stripped output. */
	getPlainOutput(): string;
	/** Forget everything written so far. */
	clear(): void;
}

export interface MockTty extends MockTtyStream {
	/** Restore `process.stdout`/`process.stderr` if `patchProcess` was used. */
	restore(): void;
}

/** Build a fake TTY write stream that captures everything written to it. */
export function createMockTty(
	options: MockTtyOptions = {},
): MockTtyStream {
	const chunks: string[] = [];
	const stream = {
		isTTY: true,
		columns: options.columns ?? 80,
		rows: options.rows ?? 24,
		writable: true,
		write: (...args: unknown[]) => {
			const first = args[0];
			if (typeof first === "string") {
				chunks.push(first);
			} else if (first instanceof Uint8Array) {
				chunks.push(Buffer.from(first).toString("utf8"));
			}
			const last = args[args.length - 1];
			if (typeof last === "function") {
				(last as () => void)();
			}
			return true;
		},
		// Event-emitter no-ops so readline/mouse plumbing never throws.
		on: function on() {
			return this;
		},
		once: function once() {
			return this;
		},
		off: function off() {
			return this;
		},
		addListener: function addListener() {
			return this;
		},
		removeListener: function removeListener() {
			return this;
		},
		emit: function emit() {
			return true;
		},
	} as unknown as NodeJS.WriteStream;

	return {
		stream,
		get output() {
			return chunks.join("");
		},
		get plain() {
			return stripAnsi(chunks.join(""));
		},
		getOutput: () => chunks.join(""),
		getPlainOutput: () => stripAnsi(chunks.join("")),
		clear: () => {
			chunks.length = 0;
		},
	};
}

let stdoutPatched = false;
let stderrPatched = false;
let originalStdout: NodeJS.WriteStream | undefined;
let originalStderr: NodeJS.WriteStream | undefined;

function patchProcess(stream: NodeJS.WriteStream): void {
	if (!stdoutPatched) {
		originalStdout = process.stdout;
		Object.defineProperty(process, "stdout", {
			value: stream,
			configurable: true,
		});
		stdoutPatched = true;
	}
	if (!stderrPatched) {
		originalStderr = process.stderr;
		Object.defineProperty(process, "stderr", {
			value: stream,
			configurable: true,
		});
		stderrPatched = true;
	}
}

function restoreProcess(): void {
	if (stdoutPatched && originalStdout) {
		Object.defineProperty(process, "stdout", {
			value: originalStdout,
			configurable: true,
		});
		stdoutPatched = false;
	}
	if (stderrPatched && originalStderr) {
		Object.defineProperty(process, "stderr", {
			value: originalStderr,
			configurable: true,
		});
		stderrPatched = false;
	}
}

/**
 * Run `render` with `process.stdout`/`process.stderr` swapped for a
 * mock TTY and return both the widget's result and everything it wrote.
 *
 * - `output` — raw bytes including cursor/render escape sequences.
 * - `plain` — the same text with ANSI stripped, ready for snapshots
 *   and string assertions.
 *
 * ```ts
 * const { result, plain } = await snapshotWidget(() => {
 *   process.stdout.write(box(["Ready"], { title: "Setup" }))
 *   return "ok"
 * })
 * ```
 */
export async function snapshotWidget<T>(
	render: (stream: NodeJS.WriteStream) => T | Promise<T>,
	options: MockTtyOptions = {},
): Promise<{ result: T; output: string; plain: string }> {
	const mock = createMockTty(options);
	patchProcess(mock.stream);
	try {
		const result = await render(mock.stream);
		return {
			result,
			output: mock.getOutput(),
			plain: mock.getPlainOutput(),
		};
	} finally {
		restoreProcess();
	}
}

/**
 * Synchronous variant of `snapshotWidget` for pure string-returning
 * renders (box, table, banner, richtext, …) that don't await anything.
 */
export function snapshotStatic<T>(
	render: (stream: NodeJS.WriteStream) => T,
	options: MockTtyOptions = {},
): { result: T; output: string; plain: string } {
	const mock = createMockTty(options);
	patchProcess(mock.stream);
	try {
		const result = render(mock.stream);
		return {
			result,
			output: mock.getOutput(),
			plain: mock.getPlainOutput(),
		};
	} finally {
		restoreProcess();
	}
}

/**
 * Create a mock TTY with `process.stdout`/`process.stderr` already
 * patched to it. Call `restore()` when done (it is safe to call more
 * than once). Useful for interactive prompt tests where the widget
 * hardcodes `process.stdout`.
 */
export function withMockTty(
	options: MockTtyOptions = {},
): MockTty {
	const mock = createMockTty(options);
	patchProcess(mock.stream);
	return {
		stream: mock.stream,
		output: mock.output,
		plain: mock.plain,
		getOutput: mock.getOutput,
		getPlainOutput: mock.getPlainOutput,
		clear: mock.clear,
		restore: restoreProcess,
	};
}
