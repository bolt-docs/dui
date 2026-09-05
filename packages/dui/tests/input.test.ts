import readline from "node:readline";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { input, resetConfig, visibleLength } from "../src/index";

const ORIG_STDIN_IS_TTY = process.stdin.isTTY;
const ORIG_STDOUT_IS_TTY = process.stdout.isTTY;

describe("input", () => {
	beforeEach(() => {
		resetConfig();
	});

	afterEach(() => {
		process.stdin.isTTY = ORIG_STDIN_IS_TTY as any;
		process.stdout.isTTY = ORIG_STDOUT_IS_TTY as any;
		vi.restoreAllMocks();
	});

	describe("non-TTY", () => {
		it("resolves with typed input", async () => {
			const inputStream = new PassThrough();
			const origStdin = process.stdin;

			Object.defineProperty(process, "stdin", {
				value: inputStream,
				writable: true,
				configurable: true,
			});
			process.stdin.isTTY = false;
			process.stdout.isTTY = false;
			vi.spyOn(console, "log").mockImplementation(() => {});

			const promise = input("Enter:");

			inputStream.write("hello\n");

			await expect(promise).resolves.toBe("hello");

			Object.defineProperty(process, "stdin", {
				value: origStdin,
				writable: true,
				configurable: true,
			});
			inputStream.destroy();
		});

		it("resolves with default value on empty input", async () => {
			const inputStream = new PassThrough();
			const origStdin = process.stdin;

			Object.defineProperty(process, "stdin", {
				value: inputStream,
				writable: true,
				configurable: true,
			});
			process.stdin.isTTY = false;
			process.stdout.isTTY = false;
			vi.spyOn(console, "log").mockImplementation(() => {});

			const promise = input("Enter:", { default: "default_val" });

			inputStream.write("\n");

			await expect(promise).resolves.toBe("default_val");

			Object.defineProperty(process, "stdin", {
				value: origStdin,
				writable: true,
				configurable: true,
			});
			inputStream.destroy();
		});

		it("resolves with empty string when no default", async () => {
			const inputStream = new PassThrough();
			const origStdin = process.stdin;

			Object.defineProperty(process, "stdin", {
				value: inputStream,
				writable: true,
				configurable: true,
			});
			process.stdin.isTTY = false;
			process.stdout.isTTY = false;
			vi.spyOn(console, "log").mockImplementation(() => {});

			const promise = input("Enter:");

			inputStream.write("\n");

			await expect(promise).resolves.toBe("");

			Object.defineProperty(process, "stdin", {
				value: origStdin,
				writable: true,
				configurable: true,
			});
			inputStream.destroy();
		});

		it("validates input and still resolves", async () => {
			const inputStream = new PassThrough();
			const origStdin = process.stdin;

			Object.defineProperty(process, "stdin", {
				value: inputStream,
				writable: true,
				configurable: true,
			});
			process.stdin.isTTY = false;
			process.stdout.isTTY = false;
			vi.spyOn(console, "log").mockImplementation(() => {});

			const promise = input("Enter:", {
				validate: (v) => (v.length >= 3 ? true : "Too short"),
			});

			inputStream.write("ab\n");

			await expect(promise).resolves.toBe("ab");

			Object.defineProperty(process, "stdin", {
				value: origStdin,
				writable: true,
				configurable: true,
			});
			inputStream.destroy();
		});
	});

	describe("interactive (TTY)", () => {
		let keypressHandler:
			| ((str: string, key: { name?: string; ctrl?: boolean }) => void)
			| undefined;
		let stdinSetRawMode: any;

		beforeEach(() => {
			process.stdin.isTTY = true;
			process.stdout.isTTY = true;
			keypressHandler = undefined;

			vi.spyOn(process.stdin, "on").mockImplementation(
				(event: any, handler: any) => {
					if (event === "keypress") {
						keypressHandler = handler;
					}
					return process.stdin;
				},
			);

			if (typeof (process.stdin as any).setRawMode !== "function") {
				(process.stdin as any).setRawMode = vi.fn();
			}
			stdinSetRawMode = vi
				.spyOn(process.stdin as any, "setRawMode")
				.mockImplementation(() => {});

			vi.spyOn(process.stdout, "write").mockImplementation(() => true);
			vi.spyOn(readline, "emitKeypressEvents").mockImplementation(() => {});
			vi.spyOn(readline, "cursorTo").mockImplementation(() => {});
			vi.spyOn(readline, "moveCursor").mockImplementation(() => {});
			vi.spyOn(readline, "clearScreenDown").mockImplementation(() => {});
		});

		function typeChar(ch: string) {
			keypressHandler!(ch, { name: ch });
		}

		function press(key: string, ctrl?: boolean) {
			keypressHandler!("", { name: key, ctrl });
		}

		it("resolves with typed text on enter", async () => {
			const promise = input("Name:");

			typeChar("A");
			typeChar("l");
			typeChar("i");
			press("enter");

			await expect(promise).resolves.toBe("Ali");
		});

		it("resolves with default value on empty input", async () => {
			const promise = input("Name:", { default: "default" });

			press("enter");

			await expect(promise).resolves.toBe("default");
		});

		it("handles backspace", async () => {
			const promise = input("Name:");

			typeChar("A");
			typeChar("B");
			typeChar("C");
			press("backspace");
			press("enter");

			await expect(promise).resolves.toBe("AB");
		});

		it("handles cursor movement with left/right", async () => {
			const promise = input("Name:");

			typeChar("A");
			typeChar("B");
			typeChar("C");
			press("left");
			press("left");
			typeChar("X");
			press("end");
			typeChar("Y");
			press("enter");

			await expect(promise).resolves.toBe("AXBCY");
		});

		it("handles Ctrl+U to clear line", async () => {
			const promise = input("Name:");

			typeChar("A");
			typeChar("B");
			press("u", true);
			press("enter");

			await expect(promise).resolves.toBe("");
		});

		it("handles Ctrl+K to delete from cursor", async () => {
			const promise = input("Name:");

			typeChar("A");
			typeChar("B");
			typeChar("C");
			press("left");
			press("left");
			press("k", true);
			press("enter");

			await expect(promise).resolves.toBe("A");
		});

		it("validates and blocks invalid input on enter", async () => {
			const validate = vi.fn((v: string) =>
				v.length >= 3 ? true : "Too short",
			);
			const promise = input("Name:", { validate });

			typeChar("A");
			typeChar("B");
			press("enter"); // blocked (too short)
			typeChar("C");
			press("enter"); // accepted

			await expect(promise).resolves.toBe("ABC");
			expect(validate).toHaveBeenCalled();
		});

		it("renders placeholder when buf is empty", async () => {
			const promise = input("Name:", { placeholder: "your name" });

			// Just verify it resolves correctly with default empty
			press("enter");

			// With no default and empty buf, placeholder is shown
			await expect(promise).resolves.toBe("");
		});

		it("handles delete key", async () => {
			const promise = input("Name:");

			typeChar("A");
			typeChar("B");
			typeChar("C");
			press("left"); // cursor at 2 (after B)
			press("delete"); // deletes C
			press("enter");

			await expect(promise).resolves.toBe("AB");
		});

		it("handles right arrow from middle", async () => {
			const promise = input("Name:");

			typeChar("A");
			typeChar("B");
			typeChar("C");
			press("left"); // cursor at 2
			press("right"); // cursor at 3
			typeChar("D");
			press("enter");

			await expect(promise).resolves.toBe("ABCD");
		});

		it("handles home key", async () => {
			const promise = input("Name:");

			typeChar("A");
			typeChar("B");
			typeChar("C");
			press("home"); // cursor at 0
			typeChar("X");
			press("enter");

			await expect(promise).resolves.toBe("XABC");
		});

		// The interactive render() positions the caret with
		// `readline.cursorTo(stdout, col)`. `col` must count terminal
		// CELLS before the caret — a CJK ideograph is 2 cells wide but
		// only 1 UTF-16 code unit, so a `.length`-based column lands
		// mid-text for CJK input (and for CJK in the prompt message).
		// cursorTo emits `\x1b[<col+1>G`, so we read the last such
		// escape off the (mocked) stdout writes instead of relying on
		// a readline spy — the widget sees its own namespace import of
		// `node:readline`, which a default-import spy can miss.
		function lastCursorColumn(): number {
			const writes = vi
				.mocked(process.stdout.write)
				.mock.calls.map((c) => String(c[0]))
				.join("");
			const matches = [...writes.matchAll(/\x1b\[(\d+)G/g)];
			const last = matches[matches.length - 1];
			return last ? Number(last[1]) - 1 : -1;
		}

		it("positions the caret by visible cells (CJK = 2 cells/char)", async () => {
			const promise = input("Name:");

			typeChar("你");
			typeChar("好");

			// Caret must sit 1 column past "你好": 4 visible cells, not
			// its 2 code units.
			const expected = visibleLength("? Name: ") + visibleLength("你好");
			expect(lastCursorColumn()).toBe(expected);

			press("enter");
			await expect(promise).resolves.toBe("你好");
		});

		it("keeps the caret aligned when editing before CJK text", async () => {
			const promise = input("Name:");

			typeChar("你");
			typeChar("好");
			press("left"); // caret between 你 and 好
			typeChar("x");

			const expected =
				visibleLength("? Name: ") + visibleLength("你x");
			expect(lastCursorColumn()).toBe(expected);

			press("enter");
			await expect(promise).resolves.toBe("你x好");
		});

		it("measures a CJK prompt message in cells, not code units", async () => {
			const promise = input("名字?");

			typeChar("a");

			// "? 名字? " is 8 cells (名字 = 4) — the caret lands at 9.
			const expected = visibleLength("? 名字? ") + 1;
			expect(lastCursorColumn()).toBe(expected);

			press("enter");
			await expect(promise).resolves.toBe("a");
		});

		it("password masks one bullet per code unit and aligns the caret", async () => {
			const promise = input("Secret:", { type: "password" });

			typeChar("你");
			typeChar("好");

			// Two bullets are rendered (one per unit); the caret sits
			// right after them.
			const expected = visibleLength("? Secret: ") + 2;
			expect(lastCursorColumn()).toBe(expected);

			press("enter");
			await expect(promise).resolves.toBe("你好");
		});

		it("rejects on escape", async () => {
			const promise = input("Name:");

			press("escape");

			await expect(promise).rejects.toThrow("Cancelled");
		});

		it("sets and restores raw mode", async () => {
			const promise = input("Name:");

			expect(stdinSetRawMode).toHaveBeenCalledWith(true);

			press("enter");
			await promise;

			expect(stdinSetRawMode).toHaveBeenCalledWith(false);
		});

		it("restores raw mode on cancel", async () => {
			const promise = input("Name:");

			press("escape");
			await expect(promise).rejects.toThrow("Cancelled");

			expect(stdinSetRawMode).toHaveBeenCalledWith(false);
		});

		describe("password type", () => {
			it("returns the real value while rendering bullets", async () => {
				const spy = vi.spyOn(process.stdout, "write");
				const promise = input("Secret:", { type: "password" });

				typeChar("h");
				typeChar("u");
				typeChar("n");
				typeChar("t");
				press("enter");

				await expect(promise).resolves.toBe("hunt");

				const written = spy.mock.calls.map((c) => String(c[0])).join("");
				// The secret never appears in the rendered output.
				expect(written).not.toContain("hunt");
				// Bullets are rendered instead.
				expect(written).toContain("\u2022\u2022\u2022\u2022");
			});

			it("masks the default value too", async () => {
				const spy = vi.spyOn(process.stdout, "write");
				const promise = input("Secret:", {
					type: "password",
					default: "sekret",
				});

				press("enter");

				await expect(promise).resolves.toBe("sekret");
				const written = spy.mock.calls.map((c) => String(c[0])).join("");
				expect(written).not.toContain("sekret");
			});
		});
	});
});
