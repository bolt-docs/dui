import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PassThrough } from "node:stream";
import readline from "node:readline";
import { tree, resetConfig } from "../src/index";

const ORIG_STDIN_IS_TTY = process.stdin.isTTY;
const ORIG_STDOUT_IS_TTY = process.stdout.isTTY;

const SAMPLE_TREE = [
	{
		label: "Fruits",
		children: [
			{ label: "Apple", value: "apple" },
			{ label: "Banana", value: "banana" },
		],
	},
	{
		label: "Colors",
		children: [
			{ label: "Red", value: "red" },
			{ label: "Green", value: "green", disabled: true },
			{ label: "Blue", value: "blue" },
		],
	},
	{
		label: "Plain", value: "plain",
	},
];

describe("tree", () => {
	beforeEach(() => {
		resetConfig();
	});

	afterEach(() => {
		process.stdin.isTTY = ORIG_STDIN_IS_TTY as any;
		process.stdout.isTTY = ORIG_STDOUT_IS_TTY as any;
		vi.restoreAllMocks();
	});

	describe("non-TTY", () => {
		it("resolves with the selected leaf value by number", async () => {
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

			const promise = tree("Pick", { tree: SAMPLE_TREE });

			input.write("2\n");

			await expect(promise).resolves.toBe("banana");

			Object.defineProperty(process, "stdin", {
				value: origStdin,
				writable: true,
				configurable: true,
			});
			input.destroy();
		});

		it("resolves with first leaf on invalid input", async () => {
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

			const promise = tree("Pick", { tree: SAMPLE_TREE });

			input.write("99\n");

			await expect(promise).resolves.toBe("apple");

			Object.defineProperty(process, "stdin", {
				value: origStdin,
				writable: true,
				configurable: true,
			});
			input.destroy();
		});

		it("skips disabled leaf by number", async () => {
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

			const promise = tree("Pick", { tree: SAMPLE_TREE });

			input.write("4\n"); // "Green" is disabled, falls back to first

			await expect(promise).resolves.toBe("apple");

			Object.defineProperty(process, "stdin", {
				value: origStdin,
				writable: true,
				configurable: true,
			});
			input.destroy();
		});

		it("resolves with first leaf on empty input", async () => {
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

			const promise = tree("Pick", { tree: SAMPLE_TREE });

			input.write("\n");

			await expect(promise).resolves.toBe("apple");

			Object.defineProperty(process, "stdin", {
				value: origStdin,
				writable: true,
				configurable: true,
			});
			input.destroy();
		});

		it("resolves with value on numbered leaf from deeply nested tree", async () => {
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

			const promise = tree("Pick", {
				tree: [
					{
						label: "A",
						children: [
							{
								label: "B",
								children: [
									{ label: "C", value: "deep" },
								],
							},
						],
					},
				],
			});

			input.write("1\n");

			await expect(promise).resolves.toBe("deep");

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

		it("selects a leaf on enter", async () => {
			const promise = tree("Pick", { tree: SAMPLE_TREE });

			press("down"); // skip Fruits (branch) → Colors (branch)
			press("down"); // skip Colors (branch) → Plain (leaf)
			press("enter");

			await expect(promise).resolves.toBe("plain");
		});

		it("expands a collapsed branch with right arrow", async () => {
			const promise = tree("Pick", { tree: SAMPLE_TREE });

			press("right"); // expand Fruits
			press("down"); // Apple
			press("enter");

			await expect(promise).resolves.toBe("apple");
		});

		it("collapses an expanded branch with left arrow", async () => {
			const promise = tree("Pick", {
				tree: SAMPLE_TREE,
				initialExpanded: true,
			});

			press("left"); // collapse Fruits
			press("down"); // Colors
			press("right"); // expand Colors
			press("down"); // Red
			press("enter");

			await expect(promise).resolves.toBe("red");
		});

		it("toggles branch with space", async () => {
			const promise = tree("Pick", { tree: SAMPLE_TREE });

			press("space"); // expand Fruits
			press("down"); // Apple
			press("enter");

			await expect(promise).resolves.toBe("apple");
		});

		it("collapses expanded branch with space", async () => {
			const promise = tree("Pick", {
				tree: SAMPLE_TREE,
				initialExpanded: true,
			});

			press("space"); // collapse Fruits
			press("space"); // expand Fruits again
			press("down"); // Apple
			press("enter"); // select Apple

			await expect(promise).resolves.toBe("apple");
		});

		it("toggles branch with enter", async () => {
			const promise = tree("Pick", { tree: SAMPLE_TREE });

			press("enter"); // toggle Fruits (expand)
			press("down"); // Apple (now visible)
			press("enter"); // select Apple

			await expect(promise).resolves.toBe("apple");
		});

		it("collapses expanded branch with enter", async () => {
			const promise = tree("Pick", {
				tree: SAMPLE_TREE,
				initialExpanded: true,
			});

			press("enter"); // collapse Fruits
			press("enter"); // expand Fruits
			press("down"); // Apple
			press("enter"); // select Apple

			await expect(promise).resolves.toBe("apple");
		});

		it("navigates up and down through flat list", async () => {
			const promise = tree("Pick", {
				tree: SAMPLE_TREE,
				initialExpanded: true,
			});

			// Fruits (d0), Apple (d1), Banana (d1), Colors (d0), Red (d1), Green (d2, disabled), Blue (d1), Plain (d0)
			press("down"); // Apple
			press("down"); // Banana
			press("down"); // Colors
			press("down"); // Red (leaf)
			press("enter");

			await expect(promise).resolves.toBe("red");
		});

		it("navigates up with arrow", async () => {
			const promise = tree("Pick", {
				tree: SAMPLE_TREE,
				initialExpanded: true,
			});

			press("down"); // Apple
			press("down"); // Banana
			press("down"); // Colors
			press("down"); // Red
			press("up"); // Colors
			press("up"); // Banana
			press("up"); // Apple
			press("up"); // Fruits
			press("right"); // nothing (Fruits already expanded)
			press("down"); // Apple
			press("enter"); // select Apple

			await expect(promise).resolves.toBe("apple");
		});

		it("rejects on escape", async () => {
			const promise = tree("Pick", { tree: SAMPLE_TREE });

			press("escape");

			await expect(promise).rejects.toThrow("Cancelled");
		});

		it("throws on empty tree", async () => {
			await expect(
				tree("Pick", { tree: [] }),
			).rejects.toThrow("Tree requires at least one node");
		});

		it("supports non-string values", async () => {
			const promise = tree("Pick", {
				tree: [
					{
						label: "Numbers",
						children: [
							{ label: "One", value: 1 },
							{ label: "Two", value: 2 },
						],
					},
				],
			});

			press("right"); // expand Numbers
			press("down"); // One
			press("down"); // Two
			press("enter"); // select Two

			await expect(promise).resolves.toBe(2);
		});

		it("respects initialExpanded option", async () => {
			const promise = tree("Pick", {
				tree: SAMPLE_TREE,
				initialExpanded: true,
			});

			// All branches expanded by default
			press("down"); // Apple (depth 1)
			press("down"); // Banana (depth 1)
			press("enter"); // select Banana

			await expect(promise).resolves.toBe("banana");
		});

		it("sets and restores raw mode", async () => {
			const promise = tree("Pick", { tree: SAMPLE_TREE });

			expect(stdinSetRawMode).toHaveBeenCalledWith(true);

			press("down");
			press("down");
			press("enter");
			await promise;

			expect(stdinSetRawMode).toHaveBeenCalledWith(false);
		});

		it("restores raw mode on cancel", async () => {
			const promise = tree("Pick", { tree: SAMPLE_TREE });

			press("escape");
			await expect(promise).rejects.toThrow("Cancelled");

			expect(stdinSetRawMode).toHaveBeenCalledWith(false);
		});

		it("skips disabled leaves", async () => {
			const promise = tree("Pick", {
				tree: [
					{
						label: "Colors",
						children: [
							{ label: "Red", value: "red" },
							{ label: "Green", value: "green", disabled: true },
							{ label: "Blue", value: "blue" },
						],
					},
				],
				initialExpanded: true,
			});

			// Red, Green(disabled), Blue — Green is visible but can't be selected
			press("down"); // Red
			press("down"); // Green (disabled — can't select via enter)
			press("down"); // Blue
			press("enter"); // select Blue

			await expect(promise).resolves.toBe("blue");
		});

		it("does not expand disabled branches", async () => {
			const promise = tree("Pick", {
				tree: [
					{
						label: "Disabled Branch",
						disabled: true,
						children: [
							{ label: "Hidden", value: "hidden" },
						],
					},
					{ label: "Plain", value: "plain" },
				],
			});

			press("down"); // Plain
			press("enter"); // select Plain

			await expect(promise).resolves.toBe("plain");
		});

		it("allows selecting leaf at depth when branch expanded", async () => {
			const promise = tree("Pick", {
				tree: [
					{
						label: "Root",
						children: [
							{
								label: "Nested",
								children: [
									{ label: "Deep", value: "deep" },
								],
							},
						],
					},
				],
				initialExpanded: true,
			});

			// Root, Nested, Deep
			press("down"); // Nested
			press("down"); // Deep
			press("enter"); // select Deep

			await expect(promise).resolves.toBe("deep");
		});

		it("handles collapsing parent branch when cursor is inside it", async () => {
			const promise = tree("Pick", {
				tree: [
					{
						label: "Fruits",
						children: [
							{ label: "Apple", value: "apple" },
							{ label: "Banana", value: "banana" },
						],
					},
					{ label: "Done", value: "done" },
				],
				initialExpanded: true,
			});

			press("down"); // Apple
			press("left"); // collapse Fruits — cursor moves to Fruits
			press("down"); // Done
			press("enter");

			await expect(promise).resolves.toBe("done");
		});
	});
});
