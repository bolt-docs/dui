import readline from "node:readline";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { input, resetConfig } from "../src/index";

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
	});
});
