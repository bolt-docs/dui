import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PassThrough } from "node:stream";
import readline from "node:readline";
import { multiselect, resetConfig } from "../src/index";

const ORIG_STDIN_IS_TTY = process.stdin.isTTY;
const ORIG_STDOUT_IS_TTY = process.stdout.isTTY;

describe("multiselect", () => {
	beforeEach(() => {
		resetConfig();
	});

	afterEach(() => {
		process.stdin.isTTY = ORIG_STDIN_IS_TTY as any;
		process.stdout.isTTY = ORIG_STDOUT_IS_TTY as any;
		vi.restoreAllMocks();
	});

	describe("non-TTY", () => {
		it("resolves with selected values by comma-separated numbers", async () => {
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

			const promise = multiselect("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green" },
					{ label: "Blue", value: "blue" },
				],
			});

			input.write("1,3\n");

			await expect(promise).resolves.toEqual(["red", "blue"]);

			Object.defineProperty(process, "stdin", {
				value: origStdin,
				writable: true,
				configurable: true,
			});
			input.destroy();
		});

		it("skips disabled choices by number", async () => {
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

			const promise = multiselect("Pick", {
				choices: [
					{ label: "Red", value: "red", disabled: true },
					{ label: "Green", value: "green" },
				],
			});

			input.write("1,2\n");

			await expect(promise).resolves.toEqual(["green"]);

			Object.defineProperty(process, "stdin", {
				value: origStdin,
				writable: true,
				configurable: true,
			});
			input.destroy();
		});

		it("returns empty array when no input and not required", async () => {
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

			const promise = multiselect("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green" },
				],
			});

			input.write("\n");

			await expect(promise).resolves.toEqual([]);

			Object.defineProperty(process, "stdin", {
				value: origStdin,
				writable: true,
				configurable: true,
			});
			input.destroy();
		});

		it("returns first enabled when required and no input", async () => {
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

			const promise = multiselect("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green" },
				],
				required: true,
			});

			input.write("\n");

			await expect(promise).resolves.toEqual(["red"]);

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

		it("returns empty array on enter with no selection", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green" },
				],
			});

			press("enter");

			await expect(promise).resolves.toEqual([]);
		});

		it("toggles selection with space", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green" },
					{ label: "Blue", value: "blue" },
				],
			});

			press("space");
			press("down");
			press("space");
			press("enter");

			await expect(promise).resolves.toEqual(["red", "green"]);
		});

		it("toggles off with space on already selected", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green" },
				],
			});

			press("space"); // select red
			press("space"); // deselect red
			press("enter");

			await expect(promise).resolves.toEqual([]);
		});

		it("respects initial checked state", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "Red", value: "red", checked: true },
					{ label: "Green", value: "green" },
				],
			});

			press("enter");

			await expect(promise).resolves.toEqual(["red"]);
		});

		it("respects required and prevents empty submission", async () => {
			let resolved = false;
			const promise = multiselect("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green" },
				],
				required: true,
			});

			press("enter");
			// Still not resolved because required
			await new Promise((r) => setTimeout(r, 20));
			expect(resolved).toBe(false);

			press("space");
			press("enter");
			await expect(promise).resolves.toEqual(["red"]);
		});

		it("allows deselect when required and more than one selected", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green" },
				],
				required: true,
			});

			press("space"); // select red
			press("down");
			press("space"); // select green
			press("up");
			press("space"); // deselect red (still has green)
			press("enter");

			await expect(promise).resolves.toEqual(["green"]);
		});

		it("prevents deselecting last item when required", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "Red", value: "red" },
				],
				required: true,
			});

			press("space"); // select red
			press("space"); // try to deselect (blocked)
			press("enter");

			await expect(promise).resolves.toEqual(["red"]);
		});

		it("navigates down and wraps around", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green" },
				],
			});

			press("up"); // wrap to last
			press("space"); // select green
			press("enter");

			await expect(promise).resolves.toEqual(["green"]);
		});

		it("skips multiple consecutive disabled choices when navigating down", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "Red", value: "red", disabled: true },
					{ label: "Green", value: "green", disabled: true },
					{ label: "Blue", value: "blue" },
				],
			});

			press("down");
			press("enter");

			await expect(promise).resolves.toEqual([]);
		});

		it("skips multiple consecutive disabled choices when navigating up", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green", disabled: true },
					{ label: "Blue", value: "blue", disabled: true },
				],
			});

			press("up");
			press("enter");

			await expect(promise).resolves.toEqual([]);
		});

		it("navigates with all disabled choices", async () => {
			const promise = multiselect("Pick", {
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
			const promise = multiselect("Pick", {
				choices: [
					{ label: "Red", value: "red" },
				],
			});

			press("escape");

			await expect(promise).rejects.toThrow("Cancelled");
		});

		it("throws on empty choices", async () => {
			await expect(
				multiselect("Pick", { choices: [] }),
			).rejects.toThrow("Multiselect requires at least one choice");
		});

		it("sets and restores raw mode", async () => {
			const promise = multiselect("Pick", {
				choices: [{ label: "A", value: "a" }],
			});

			expect(stdinSetRawMode).toHaveBeenCalledWith(true);

			press("enter");
			await promise;

			expect(stdinSetRawMode).toHaveBeenCalledWith(false);
		});

		it("restores raw mode on cancel", async () => {
			const promise = multiselect("Pick", {
				choices: [{ label: "A", value: "a" }],
			});

			press("escape");
			await expect(promise).rejects.toThrow("Cancelled");

			expect(stdinSetRawMode).toHaveBeenCalledWith(false);
		});
	});
});
