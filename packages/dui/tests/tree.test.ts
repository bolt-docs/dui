import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PassThrough } from "node:stream";
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
		let dataHandler: ((data: string | Buffer) => void) | undefined;
		let stdinSetRawMode: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			process.stdin.isTTY = true;
			process.stdout.isTTY = true;
			dataHandler = undefined;

			vi.spyOn(process.stdin, "on").mockImplementation(
				(event: any, handler: any) => {
					if (event === "data") {
						dataHandler = handler;
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
		});

		function writeData(str: string) {
			if (dataHandler) {
				dataHandler(Buffer.from(str, "utf8"));
			}
		}

		it("selects a leaf on enter", async () => {
			const promise = tree("Pick", { tree: SAMPLE_TREE });

			writeData("\x1b[B"); // down past Fruits (branch) → Colors (branch)
			writeData("\x1b[B"); // down past Colors (branch) → Plain (leaf)
			writeData("\r");

			await expect(promise).resolves.toBe("plain");
		});

		it("expands a collapsed branch with right arrow", async () => {
			const promise = tree("Pick", { tree: SAMPLE_TREE });

			writeData("\x1b[C"); // right → expand Fruits
			writeData("\x1b[B"); // down → Apple
			writeData("\r");

			await expect(promise).resolves.toBe("apple");
		});

		it("collapses an expanded branch with left arrow", async () => {
			const promise = tree("Pick", {
				tree: SAMPLE_TREE,
				initialExpanded: true,
			});

			writeData("\x1b[D"); // left → collapse Fruits
			writeData("\x1b[B"); // down → Colors
			writeData("\x1b[C"); // right → expand Colors
			writeData("\x1b[B"); // down → Red
			writeData("\r");

			await expect(promise).resolves.toBe("red");
		});

		it("toggles branch with space", async () => {
			const promise = tree("Pick", { tree: SAMPLE_TREE });

			writeData(" "); // space → expand Fruits
			writeData("\x1b[B"); // down → Apple
			writeData("\r");

			await expect(promise).resolves.toBe("apple");
		});

		it("collapses expanded branch with space", async () => {
			const promise = tree("Pick", {
				tree: SAMPLE_TREE,
				initialExpanded: true,
			});

			writeData(" "); // space → collapse Fruits
			writeData(" "); // space → expand Fruits again
			writeData("\x1b[B"); // down → Apple
			writeData("\r");

			await expect(promise).resolves.toBe("apple");
		});

		it("toggles branch with enter", async () => {
			const promise = tree("Pick", { tree: SAMPLE_TREE });

			writeData("\r"); // enter → toggle Fruits (expand)
			writeData("\x1b[B"); // down → Apple (now visible)
			writeData("\r"); // enter → select Apple

			await expect(promise).resolves.toBe("apple");
		});

		it("collapses expanded branch with enter", async () => {
			const promise = tree("Pick", {
				tree: SAMPLE_TREE,
				initialExpanded: true,
			});

			writeData("\r"); // enter → collapse Fruits
			writeData("\r"); // enter → expand Fruits
			writeData("\x1b[B"); // down → Apple
			writeData("\r"); // enter → select Apple

			await expect(promise).resolves.toBe("apple");
		});

		it("navigates up and down through flat list", async () => {
			const promise = tree("Pick", {
				tree: SAMPLE_TREE,
				initialExpanded: true,
			});

			// Fruits(d0), Apple(d1), Banana(d1), Colors(d0), Red(d1), Green(d2,disabled), Blue(d1), Plain(d0)
			writeData("\x1b[B"); // down → Apple
			writeData("\x1b[B"); // down → Banana
			writeData("\x1b[B"); // down → Colors
			writeData("\x1b[B"); // down → Red (leaf)
			writeData("\r");

			await expect(promise).resolves.toBe("red");
		});

		it("navigates up with arrow", async () => {
			const promise = tree("Pick", {
				tree: SAMPLE_TREE,
				initialExpanded: true,
			});

			writeData("\x1b[B"); // down → Apple
			writeData("\x1b[B"); // down → Banana
			writeData("\x1b[B"); // down → Colors
			writeData("\x1b[B"); // down → Red
			writeData("\x1b[A"); // up → Colors
			writeData("\x1b[A"); // up → Banana
			writeData("\x1b[A"); // up → Apple
			writeData("\x1b[A"); // up → Fruits
			writeData("\x1b[C"); // right → nothing (Fruits already expanded)
			writeData("\x1b[B"); // down → Apple
			writeData("\r"); // enter → select Apple

			await expect(promise).resolves.toBe("apple");
		});

		it("rejects on escape", async () => {
			const promise = tree("Pick", { tree: SAMPLE_TREE });

			writeData("\x1b");

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

			writeData("\x1b[C"); // right → expand Numbers
			writeData("\x1b[B"); // down → One
			writeData("\x1b[B"); // down → Two
			writeData("\r"); // enter → select Two

			await expect(promise).resolves.toBe(2);
		});

		it("respects initialExpanded option", async () => {
			const promise = tree("Pick", {
				tree: SAMPLE_TREE,
				initialExpanded: true,
			});

			// All branches expanded by default
			writeData("\x1b[B"); // down → Apple (depth 1)
			writeData("\x1b[B"); // down → Banana (depth 1)
			writeData("\r"); // enter → select Banana

			await expect(promise).resolves.toBe("banana");
		});

		it("sets and restores raw mode", async () => {
			const promise = tree("Pick", { tree: SAMPLE_TREE });

			expect(stdinSetRawMode).toHaveBeenCalledWith(true);

			writeData("\x1b[B");
			writeData("\x1b[B");
			writeData("\r");
			await promise;

			expect(stdinSetRawMode).toHaveBeenCalledWith(false);
		});

		it("restores raw mode on cancel", async () => {
			const promise = tree("Pick", { tree: SAMPLE_TREE });

			writeData("\x1b");
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
			writeData("\x1b[B"); // down → Red
			writeData("\x1b[B"); // down → Green (can't select via enter)
			writeData("\x1b[B"); // down → Blue
			writeData("\r"); // enter → select Blue

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

			writeData("\x1b[B"); // down → Plain
			writeData("\r"); // enter → select Plain

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
			writeData("\x1b[B"); // down → Nested
			writeData("\x1b[B"); // down → Deep
			writeData("\r"); // enter → select Deep

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

			writeData("\x1b[B"); // down → Apple
			writeData("\x1b[D"); // left → collapse Fruits, cursor moves to Fruits
			writeData("\x1b[B"); // down → Done
			writeData("\r"); // enter → select Done

			await expect(promise).resolves.toBe("done");
		});
	});
});
