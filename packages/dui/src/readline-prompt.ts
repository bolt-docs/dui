import readline from "node:readline";

/**
 * EOF-safe helpers for the non-TTY prompt fallbacks.
 *
 * Every interactive prompt (`input`, `select`, `multiselect`, `tree`,
 * `palette`, `form`) falls back to a numbered / free-text readline
 * question when stdin or stdout is not a TTY, so a CLI stays usable in a
 * pipeline, a script, or CI.
 *
 * The bug these helpers exist to fix: `rl.question()` invokes its
 * callback **only** when a full line arrives. On stdin EOF readline
 * emits `close` and the callback is never called, so the surrounding
 * promise never settled and the process hung forever:
 *
 * ```bash
 * (sleep 30) | node -e 'import("@bdocs/dui").then(m => m.input("Name?"))'
 * # hangs, exit 124
 * ```
 *
 * Wrapping the question in these helpers means EOF resolves with an empty
 * answer, which every call site already treats as "use the default" — the
 * same result the user gets by pressing Enter on a blank line.
 */

/** Why a read settled. `eof` means stdin closed before a line arrived. */
export type ReadOutcome = "answer" | "eof";

/**
 * The stream behind each interface created by `createPromptInterface`.
 *
 * Needed because readline only wires its end handling when the interface
 * is first attached to a stream. A second interface over a stream that has
 * already ended never receives `end` and never emits `close`:
 *
 * ```js
 * const stub = new PassThrough();
 * stub.end();
 * await closed(createInterface(stub));   // consumes the `end`
 * // any new interface on `stub` now hangs forever
 * ```
 *
 * `form()` creates one interface per field, so without this the first
 * field consumed the end and every later field hung. Recording the stream
 * lets the helpers detect that state and settle immediately.
 */
const interfaceInputs = new WeakMap<readline.Interface, NodeJS.ReadableStream>();

/** True when the stream has already delivered its end. */
function alreadyEnded(input: NodeJS.ReadableStream | undefined): boolean {
	if (!input) return false;
	const stream = input as { readableEnded?: boolean; destroyed?: boolean };
	return stream.readableEnded === true || stream.destroyed === true;
}

/**
 * Ask a question and invoke `onAnswer` exactly once, whether the user
 * types a line or stdin hits EOF.
 *
 * The callback receives an empty string on EOF. Callers should treat that
 * as "no input", which for every prompt means falling back to the default.
 */
export function readAnswer(
	rl: readline.Interface,
	query: string,
	onAnswer: (answer: string, outcome: ReadOutcome) => void,
): void {
	let settled = false;

	const finish = (answer: string, outcome: ReadOutcome): void => {
		if (settled) return;
		settled = true;
		onAnswer(answer, outcome);
	};

	// Nothing will ever arrive on this stream, so do not wait for a
	// `close` that readline will not emit.
	if (alreadyEnded(interfaceInputs.get(rl))) {
		finish("", "eof");
		return;
	}

	rl.question(query, (answer) => {
		// `rl.close()` below re-enters through the `close` handler, so the
		// guard is what keeps `onAnswer` from firing twice.
		finish(answer, "answer");
	});

	rl.on("close", () => {
		finish("", "eof");
	});
}

/**
 * Read lines until a blank line, or until stdin hits EOF.
 *
 * The textarea counterpart to `readAnswer`. `onDone` is invoked exactly
 * once; on EOF it receives whatever lines arrived before the close, which
 * lets a partially typed textarea keep its content instead of discarding
 * it the way a blank answer would.
 */
export function readLinesUntilBlank(
	rl: readline.Interface,
	onDone: (lines: string[], outcome: ReadOutcome) => void,
): void {
	const lines: string[] = [];
	let settled = false;

	const finish = (outcome: ReadOutcome): void => {
		if (settled) return;
		settled = true;
		rl.removeListener("line", onLine);
		onDone(lines, outcome);
	};

	function onLine(line: string): void {
		if (line === "") {
			finish("answer");
			return;
		}
		lines.push(line);
	}

	// Same reasoning as readAnswer: a stream that already ended will never
	// emit `close` on a fresh interface.
	if (alreadyEnded(interfaceInputs.get(rl))) {
		finish("eof");
		return;
	}

	rl.on("line", onLine);
	rl.on("close", () => {
		finish("eof");
	});
}

/**
 * Create a readline interface over stdin/stdout for a non-TTY prompt.
 *
 * `terminal: false` is deliberate: without it readline can emit
 * line-editor escapes and cursor moves into a non-TTY output stream,
 * which shows up as garbage in captured output.
 */
export function createPromptInterface(): readline.Interface {
	const input = process.stdin;
	const rl = readline.createInterface({
		input,
		output: process.stdout,
		terminal: false,
	});
	interfaceInputs.set(rl, input);
	return rl;
}
