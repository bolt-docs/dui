import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PassThrough } from "node:stream";
import readline from "node:readline";
import { select, resetConfig } from "../src/index";

const ORIG_STDIN_IS_TTY = process.stdin.isTTY;
const ORIG_STDOUT_IS_TTY = process.stdout.isTTY;

describe("select", () => {
	beforeEach(() => {
		resetConfig();
	});

	afterEach(() => {
		process.stdin.isTTY = ORIG_STDIN_IS_TTY as any;
		process.stdout.isTTY = ORIG_STDOUT_IS_TTY as any;
		vi.restoreAllMocks();
	});

	describe("non-TTY", () => {
		it("resolves with the selected value by number", async () => {
			const input = new PassThrough();
			const origStdin = process.stdin;

			Object.defineProperty(process, "stdin", {
				value: input,
				writable: true,
				configurable: true,
			});
			process.stdin.isTTY = false;
			process.stdout.isTTY = false;
			vi.spyOn(console, "log").mockImplementation(() => {});

			const promise = select("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green" },
					{ label: "Blue", value: "blue" },
				],
			});

			input.write("2\n");

			await expect(promise).resolves.toBe("green");

			Object.defineProperty(process, "stdin", {
				value: origStdin,
				writable: true,
				configurable: true,
			});
			input.destroy();
		});

		it("resolves with first choice on invalid input", async () => {
			const input = new PassThrough();
			const origStdin = process.stdin;

			Object.defineProperty(process, "stdin", {
				value: input,
				writable: true,
				configurable: true,
			});
			process.stdin.isTTY = false;
			process.stdout.isTTY = false;
			vi.spyOn(console, "log").mockImplementation(() => {});

			const promise = select("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green" },
				],
			});

			input.write("99\n");

			await expect(promise).resolves.toBe("red");

			Object.defineProperty(process, "stdin", {
				value: origStdin,
				writable: true,
				configurable: true,
			});
			input.destroy();
		});

		it("resolves with first enabled choice on disabled selection", async () => {
			const input = new PassThrough();
			const origStdin = process.stdin;

			Object.defineProperty(process, "stdin", {
				value: input,
				writable: true,
				configurable: true,
			});
			process.stdin.isTTY = false;
			process.stdout.isTTY = false;
			vi.spyOn(console, "log").mockImplementation(() => {});

			const promise = select("Pick", {
				choices: [
					{ label: "Red", value: "red", disabled: true },
					{ label: "Green", value: "green" },
				],
			});

			input.write("1\n");

			await expect(promise).resolves.toBe("green");

			Object.defineProperty(process, "stdin", {
				value: origStdin,
				writable: true,
				configurable: true,
			});
			input.destroy();
		});

		it("resolves with first enabled on empty input", async () => {
			const input = new PassThrough();
			const origStdin = process.stdin;

			Object.defineProperty(process, "stdin", {
				value: input,
				writable: true,
				configurable: true,
			});
			process.stdin.isTTY = false;
			process.stdout.isTTY = false;
			vi.spyOn(console, "log").mockImplementation(() => {});

			const promise = select("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green" },
				],
			});

			input.write("\n");

			await expect(promise).resolves.toBe("red");

			Object.defineProperty(process, "stdin", {
				value: origStdin,
				writable: true,
				configurable: true,
			});
			input.destroy();
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

		function press(key: string, ctrl?: boolean) {
			keypressHandler!("", { name: key, ctrl });
		}

		it("selects the first choice on enter", async () => {
			const promise = select("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green" },
				],
			});

			press("enter");

			await expect(promise).resolves.toBe("red");
		});

		it("navigates down and selects", async () => {
			const promise = select("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green" },
					{ label: "Blue", value: "blue" },
				],
			});

			press("down");
			press("enter");

			await expect(promise).resolves.toBe("green");
		});

		it("navigates up and wraps around", async () => {
			const promise = select("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green" },
				],
			});

			press("up");
			press("enter");

			await expect(promise).resolves.toBe("green");
		});

		it("skips disabled choices when navigating down", async () => {
			const promise = select("Pick", {
				choices: [
					{ label: "Red", value: "red", disabled: true },
					{ label: "Green", value: "green" },
					{ label: "Blue", value: "blue" },
				],
			});

			press("down");
			press("enter");

			await expect(promise).resolves.toBe("green");
		});

		it("skips disabled choices when navigating up", async () => {
			const promise = select("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green", disabled: true },
					{ label: "Blue", value: "blue" },
				],
			});

			press("up");
			press("enter");

			await expect(promise).resolves.toBe("blue");
		});

		it("skips multiple consecutive disabled choices when navigating down", async () => {
			const promise = select("Pick", {
				choices: [
					{ label: "Red", value: "red", disabled: true },
					{ label: "Green", value: "green", disabled: true },
					{ label: "Blue", value: "blue" },
				],
			});

			press("down");
			press("enter");

			await expect(promise).resolves.toBe("blue");
		});

		it("skips multiple consecutive disabled choices when navigating up", async () => {
			const promise = select("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green", disabled: true },
					{ label: "Blue", value: "blue", disabled: true },
				],
			});

			press("up");
			press("enter");

			await expect(promise).resolves.toBe("red");
		});

		it("navigates with all disabled choices", async () => {
			const promise = select("Pick", {
				choices: [
					{ label: "Red", value: "red", disabled: true },
					{ label: "Green", value: "green", disabled: true },
				],
			});

			press("down");
			press("down");
			press("escape");

			await expect(promise).rejects.toThrow("Cancelled");
		});

		it("rejects on escape", async () => {
			const promise = select("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green" },
				],
			});

			press("escape");

			await expect(promise).rejects.toThrow("Cancelled");
		});

		it("throws on empty choices", async () => {
			await expect(
				select("Pick", { choices: [] }),
			).rejects.toThrow("Select requires at least one choice");
		});

		it("supports non-string values", async () => {
			const promise = select("Pick", {
				choices: [
					{ label: "One", value: 1 },
					{ label: "Two", value: 2 },
				],
			});

			press("down");
			press("enter");

			await expect(promise).resolves.toBe(2);
		});

		it("sets raw mode on stdin", async () => {
			select("Pick", {
				choices: [{ label: "A", value: "a" }],
			});

			expect(stdinSetRawMode).toHaveBeenCalledWith(true);
		});

		it("restores raw mode on finalize", async () => {
			const promise = select("Pick", {
				choices: [{ label: "A", value: "a" }],
			});

			press("enter");
			await promise;

			expect(stdinSetRawMode).toHaveBeenCalledWith(false);
		});

		it("restores raw mode on cancel", async () => {
			const promise = select("Pick", {
				choices: [{ label: "A", value: "a" }],
			});

			press("escape");
			await expect(promise).rejects.toThrow("Cancelled");

			expect(stdinSetRawMode).toHaveBeenCalledWith(false);
		});
	});
});
