/**
 * Regression tests for the non-TTY EOF deadlock.
 *
 * Every interactive prompt falls back to a readline question when stdin
 * or stdout is not a TTY, so a CLI stays usable in a pipeline or CI.
 * Those fallbacks were built on `rl.question()` with no `close` handler,
 * and readline never invokes the `question` callback on EOF — it only
 * emits `close`. The surrounding promise therefore never settled and the
 * process hung forever:
 *
 * ```bash
 * (sleep 30) | node -e 'import("@bdocs/dui").then(m => m.input("Name?"))'
 * # hangs, exit 124
 * ```
 *
 * These tests drive stdin as a stream that ends immediately, which is
 * exactly the CI case. A regression shows up as a test timeout rather
 * than a hang, because every prompt is raced against a short timer.
 */

import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createPromptInterface,
	readAnswer,
	readLinesUntilBlank,
} from "../src/readline-prompt.ts";
import { form, input, multiselect, palette, select, tree } from "../src/index.ts";

/** Resolve/reject if a promise has not settled within `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) => {
			const timer = setTimeout(
				() => reject(new Error(`prompt did not settle within ${ms}ms`)),
				ms,
			);
			timer.unref?.();
		}),
	]);
}

/** stdin/stdout TTY flags, restored after every test. */
let stdinIsTTY: boolean | undefined;
let stdoutIsTTY: boolean | undefined;
let originalStdin: NodeJS.ReadStream;
let consoleLog: ReturnType<typeof vi.spyOn>;

/**
 * Replace process.stdin with a stream that is not a TTY and ends
 * immediately — the same state as a CLI whose input is piped or closed.
 */
function useClosedStdin(): void {
	const stub = new PassThrough() as unknown as NodeJS.ReadStream;
	stub.isTTY = false;
	// Ending the stream is what produces the EOF that used to hang.
	stub.end();

	Object.defineProperty(process, "stdin", {
		value: stub,
		configurable: true,
		writable: true,
	});
}

beforeEach(() => {
	originalStdin = process.stdin;
	stdinIsTTY = originalStdin.isTTY;
	stdoutIsTTY = process.stdout.isTTY;

	// Force the non-TTY branch. The value is irrelevant — the test asserts
	// on the close-before-line path — but it must be falsy.
	process.stdin.isTTY = false;
	process.stdout.isTTY = false;

	// Swallow the numbered-list output the fallbacks print.
	consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
	Object.defineProperty(process, "stdin", {
		value: originalStdin,
		configurable: true,
		writable: true,
	});
	process.stdin.isTTY = stdinIsTTY;
	process.stdout.isTTY = stdoutIsTTY;
	consoleLog.mockRestore();
});

describe("readAnswer", () => {
	it("settles on EOF when no line ever arrives", async () => {
		useClosedStdin();
		const rl = createPromptInterface();

		const answer = await withTimeout(
			new Promise<string>((resolve) => {
				readAnswer(rl, "Name: ", (a) => {
					rl.close();
					resolve(a);
				});
			}),
			1000,
		);

		// Empty, so callers fall back to their default.
		expect(answer).toBe("");
	});

	it("settles exactly once when a line arrives before EOF", async () => {
		useClosedStdin();
		const rl = createPromptInterface();
		const seen: string[] = [];

		await withTimeout(
			new Promise<void>((resolve) => {
				readAnswer(rl, "Name: ", (a, outcome) => {
					seen.push(`${outcome}:${a}`);
					if (seen.length === 1) {
						rl.close();
						resolve();
					}
				});
				// A real line, then EOF. `rl.close()` inside the callback
				// re-enters through the close handler, which is the
				// double-resolve this asserts against.
				rl.write("Ada\n");
			}),
			1000,
		);

		expect(seen).toEqual(["answer:Ada"]);
	});
});

describe("readLinesUntilBlank", () => {
	it("keeps partial lines when stdin closes before the blank line", async () => {
		useClosedStdin();
		const rl = createPromptInterface();

		const lines = await withTimeout(
			new Promise<string[]>((resolve) => {
				readLinesUntilBlank(rl, (l) => {
					rl.close();
					resolve(l);
				});
				rl.write("first\nsecond\n");
			}),
			1000,
		);

		// A textarea that was mid-entry keeps its content rather than
		// silently reverting to the default.
		expect(lines).toEqual(["first", "second"]);
	});

	it("settles on EOF with no lines at all", async () => {
		useClosedStdin();
		const rl = createPromptInterface();

		const lines = await withTimeout(
			new Promise<string[]>((resolve) => {
				readLinesUntilBlank(rl, (l) => {
					rl.close();
					resolve(l);
				});
			}),
			1000,
		);

		expect(lines).toEqual([]);
	});
});

describe("prompts without a TTY", () => {
	it("input() resolves on stdin EOF", async () => {
		useClosedStdin();
		await expect(withTimeout(input("Name?"), 1000)).resolves.toBe("");
	});

	it("input() falls back to the default on stdin EOF", async () => {
		useClosedStdin();
		await expect(
			withTimeout(input("Name?", { default: "ada" }), 1000),
		).resolves.toBe("ada");
	});

	it("select() resolves to the first choice on stdin EOF", async () => {
		useClosedStdin();
		await expect(
			withTimeout(
				select("Pick", {
					choices: [
						{ label: "one", value: 1 },
						{ label: "two", value: 2 },
					],
				}),
				1000,
			),
		).resolves.toBe(1);
	});

	it("multiselect() resolves on stdin EOF", async () => {
		useClosedStdin();
		await expect(
			withTimeout(
				multiselect("Pick", {
					choices: [
						{ label: "one", value: 1 },
						{ label: "two", value: 2 },
					],
					required: true,
				}),
				1000,
			),
		).resolves.toEqual([1]);
	});

	it("tree() resolves on stdin EOF", async () => {
		useClosedStdin();
		await expect(
			withTimeout(
				tree("Pick", {
					tree: [{ label: "one", value: 1 }],
				}),
				1000,
			),
		).resolves.toBe(1);
	});

	it("palette() resolves on stdin EOF", async () => {
		useClosedStdin();
		await expect(
			withTimeout(
				palette("Go", {
					items: [{ label: "one", value: 1 }],
				}),
				1000,
			),
		).resolves.toBe(1);
	});

	it("form() resolves on stdin EOF rather than hanging", async () => {
		useClosedStdin();
		const result = await withTimeout(
			form({
				fields: [
					{ id: "name", label: "Name", type: "text", default: "ada" },
					{
						id: "env",
						label: "Env",
						type: "select",
						choices: [
							{ label: "prod", value: "prod" },
							{ label: "dev", value: "dev" },
						],
					},
				],
			}),
			2000,
		);

		// Each field takes its default on EOF.
		expect(result).toEqual({ name: "ada", env: "prod" });
	});
});
