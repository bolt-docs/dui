import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PassThrough } from "node:stream";
import { multiselect, resetConfig } from "../src/index";

// Node 22+ exposes `isTTY` as a getter-only inherited property. Override
// with Object.defineProperty and undo with `delete` so the prototype getter
// takes over again after the test ends.
function setTTY(value: boolean): void {
	Object.defineProperty(process.stdin, "isTTY", {
		value,
		writable: true,
		configurable: true,
	});
	Object.defineProperty(process.stdout, "isTTY", {
		value,
		writable: true,
		configurable: true,
	});
}

function clearTTYOverride(): void {
	delete (process.stdin as { isTTY?: boolean }).isTTY;
	delete (process.stdout as { isTTY?: boolean }).isTTY;
}

describe("multiselect", () => {
	beforeEach(() => {
		resetConfig();

		if (typeof (process.stdin as any).setRawMode !== "function") {
			(process.stdin as any).setRawMode = vi.fn();
		}
	});

	afterEach(() => {
		clearTTYOverride();
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
			setTTY(false);
			vi.spyOn(console, "log").mockImplementation(() => {});

			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b" },
					{ label: "C", value: "c" },
				],
			});

			input.write("1,3\n");

			await expect(promise).resolves.toEqual(["a", "c"]);

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
			setTTY(false);
			vi.spyOn(console, "log").mockImplementation(() => {});

			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a", disabled: true },
					{ label: "B", value: "b" },
				],
			});

			input.write("1,2\n");

			await expect(promise).resolves.toEqual(["b"]);

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
			setTTY(false);
			vi.spyOn(console, "log").mockImplementation(() => {});

			const promise = multiselect("Pick", {
				choices: [{ label: "A", value: "a" }],
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
			setTTY(false);
			vi.spyOn(console, "log").mockImplementation(() => {});

			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b" },
				],
				required: true,
			});

			input.write("\n");

			await expect(promise).resolves.toEqual(["a"]);

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
			setTTY(true);
			dataHandler = undefined;

			vi.spyOn(process.stdin, "on").mockImplementation(
				(event: any, handler: any) => {
					if (event === "data") {
						dataHandler = handler;
					}
					return process.stdin;
				},
			);

			stdinSetRawMode = vi
				.spyOn(process.stdin as any, "setRawMode")
				.mockImplementation(() => {});

			vi.spyOn(process.stdout, "write").mockImplementation(() => true);
			vi.spyOn(process.stdout, "isTTY", "get").mockReturnValue(true);
		});

		function writeData(str: string) {
			if (dataHandler) {
				dataHandler(Buffer.from(str, "utf8"));
			}
		}

		it("returns empty array on enter with no selection", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b" },
				],
			});

			writeData("\r");

			await expect(promise).resolves.toEqual([]);
		});

		it("toggles selection with space", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b" },
				],
			});

			writeData(" ");
			writeData("\r");

			await expect(promise).resolves.toEqual(["a"]);
		});

		it("toggles off with space on already selected", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a", checked: true },
					{ label: "B", value: "b" },
				],
			});

			writeData(" ");
			writeData("\r");

			await expect(promise).resolves.toEqual([]);
		});

		it("respects initial checked state", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a", checked: true },
					{ label: "B", value: "b", checked: true },
				],
			});

			writeData("\r");

			await expect(promise).resolves.toEqual(["a", "b"]);
		});

		it("respects required and prevents empty submission", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b" },
				],
				required: true,
			});

			writeData("\r");
			writeData(" ");
			writeData("\r");

			await expect(promise).resolves.toEqual(["a"]);
		});

		it("allows deselect when required and more than one selected", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a", checked: true },
					{ label: "B", value: "b", checked: true },
				],
				required: true,
			});

			writeData(" ");
			writeData("\r");

			await expect(promise).resolves.toEqual(["b"]);
		});

		it("prevents deselecting last item when required", async () => {
			const promise = multiselect("Pick", {
				choices: [{ label: "A", value: "a", checked: true }],
				required: true,
			});

			writeData(" ");
			writeData("\r");

			await expect(promise).resolves.toEqual(["a"]);
		});

		it("navigates down and wraps around", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b" },
					{ label: "C", value: "c" },
				],
			});

			writeData("\x1b[B");
			writeData(" ");
			writeData("\r");

			await expect(promise).resolves.toEqual(["b"]);
		});

		it("skips multiple consecutive disabled choices when navigating down", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a", disabled: true },
					{ label: "B", value: "b", disabled: true },
					{ label: "C", value: "c" },
				],
			});

			writeData("\x1b[B");
			writeData(" ");
			writeData("\r");

			await expect(promise).resolves.toEqual(["c"]);
		});

		it("skips multiple consecutive disabled choices when navigating up", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b", disabled: true },
					{ label: "C", value: "c", disabled: true },
				],
			});

			writeData("\x1b[A");
			writeData(" ");
			writeData("\r");

			await expect(promise).resolves.toEqual(["a"]);
		});

		it("navigates with all disabled choices", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a", disabled: true },
					{ label: "B", value: "b", disabled: true },
				],
			});

			writeData("\x1b[B");
			writeData("\x1b[B");
			writeData("\x1b");

			await expect(promise).rejects.toThrow("Cancelled");
		});

		it("rejects on escape", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b" },
				],
			});

			writeData("\x1b");

			await expect(promise).rejects.toThrow("Cancelled");
		});

		it("throws on empty choices", async () => {
			await expect(multiselect("Pick", { choices: [] })).rejects.toThrow(
				"Multiselect requires at least one choice",
			);
		});

		it("sets and restores raw mode", async () => {
			const promise = multiselect("Pick", {
				choices: [{ label: "A", value: "a" }],
			});

			expect(stdinSetRawMode).toHaveBeenCalledWith(true);

			writeData("\r");
			await promise;

			expect(stdinSetRawMode).toHaveBeenCalledWith(false);
		});

		it("restores raw mode on cancel", async () => {
			const promise = multiselect("Pick", {
				choices: [{ label: "A", value: "a" }],
			});

			writeData("\x1b");
			await expect(promise).rejects.toThrow("Cancelled");

			expect(stdinSetRawMode).toHaveBeenCalledWith(false);
		});

		describe("mouse", () => {
			it("toggles a row on click", async () => {
				const promise = multiselect("Pick", {
					choices: [
						{ label: "A", value: "a" },
						{ label: "B", value: "b" },
						{ label: "C", value: "c" },
					],
				});

				// Row 2 → choiceIndex 2 (C). Bounds: choice i → y = 2 + i.
				writeData("\x1b[<0;1;4M");
				writeData("\x1b[<0;1;4m");
				writeData("\r");

				await expect(promise).resolves.toEqual(["c"]);
			});

			it("toggles a previously-checked row off on click", async () => {
				const promise = multiselect("Pick", {
					choices: [
						{ label: "A", value: "a", checked: true },
						{ label: "B", value: "b" },
					],
				});

				// Click row 1 → unchecks A (y = 2 + 0 = 2)
				writeData("\x1b[<0;1;2M");
				writeData("\x1b[<0;1;2m");
				writeData("\r");

				await expect(promise).resolves.toEqual([]);
			});

			it("respects required when a click would leave the list empty", async () => {
				const promise = multiselect("Pick", {
					choices: [{ label: "A", value: "a", checked: true }],
					required: true,
				});

				// Click row 1 (y = 2) → would uncheck the only selection.
				writeData("\x1b[<0;1;2M");
				writeData("\x1b[<0;1;2m");
				writeData("\r");

				await expect(promise).resolves.toEqual(["a"]);
			});

			it("ignores clicks on disabled rows", async () => {
				const promise = multiselect("Pick", {
					choices: [
						{ label: "A", value: "a", checked: true },
						{ label: "B", value: "b", disabled: true },
					],
				});

				// Disabled B is at y = 3. Click should be ignored; A's check sticks.
				writeData("\x1b[<0;1;3M");
				writeData("\x1b[<0;1;3m");
				writeData("\r");

				await expect(promise).resolves.toEqual(["a"]);
			});

			it("emits the SGR enable sequences on entry", () => {
				const spy = vi.spyOn(process.stdout, "write");
				multiselect("Pick", { choices: [{ label: "A", value: "a" }] });
				expect(spy).toHaveBeenCalledWith("\x1b[?1000h");
				expect(spy).toHaveBeenCalledWith("\x1b[?1006h");
			});

			it("emits the SGR disable sequences on finalize", async () => {
				const promise = multiselect("Pick", {
					choices: [{ label: "A", value: "a" }],
				});

				const spy = vi.spyOn(process.stdout, "write");
				writeData("\r");
				await promise;

				expect(spy).toHaveBeenCalledWith("\x1b[?1006l");
				expect(spy).toHaveBeenCalledWith("\x1b[?1000l");
			});

			// Regression: tmux/screen/embedded terminals don't honor
			// `\x1b[u` (DEC restore cursor), so each render was stacking
			// below the previous one. We use `\x1b[H` on first render and
			// `\x1b[{n}A` (move up N lines) on subsequent renders instead.
			it("uses \\x1b[H on first render and \\x1b[{n}A on re-renders, never \\x1b[u", async () => {
				const spy = vi.spyOn(process.stdout, "write");
				const promise = multiselect("Pick", {
					choices: [
						{ label: "Red", value: "red" },
						{ label: "Green", value: "green" },
					],
				});

				// Trigger a re-render with an arrow key.
				writeData("\x1b[B");
				// Toggle with space (re-renders again).
				writeData(" ");
				// Finalize.
				writeData("\r");
				await promise;

				const written = spy.mock.calls.map((c) => String(c[0])).join("");

				// First render positions cursor at row 1.
				expect(written).toContain("\x1b[H");
				// Subsequent render moves cursor UP N lines instead of using
				// the unreliable `\x1b[u` DEC restore-cursor sequence.
				expect(written).toMatch(/\x1b\[\d+A/);
				expect(written).not.toContain("\x1b[u");
			});

			it("enables motion tracking on entry", () => {
				const spy = vi.spyOn(process.stdout, "write");
				multiselect("Pick", { choices: [{ label: "A", value: "a" }] });
				expect(spy).toHaveBeenCalledWith("\x1b[?1003h");
			});

			it("disables motion tracking on finalize", async () => {
				const promise = multiselect("Pick", {
					choices: [{ label: "A", value: "a" }],
				});

				const spy = vi.spyOn(process.stdout, "write");
				writeData("\r");
				await promise;

				expect(spy).toHaveBeenCalledWith("\x1b[?1003l");
			});

			it("re-renders on hover move event", async () => {
				const promise = multiselect("Pick", {
					choices: [
						{ label: "A", value: "a" },
						{ label: "B", value: "b" },
					],
				});

				const spy = vi.spyOn(process.stdout, "write");
				writeData("\x1b[<32;1;3M");

				expect(spy.mock.calls.length).toBeGreaterThan(0);

				writeData("\x1b");
				await expect(promise).rejects.toThrow("Cancelled");
			});

			it("does not re-render when hovering same item", async () => {
				const promise = multiselect("Pick", {
					choices: [
						{ label: "A", value: "a" },
						{ label: "B", value: "b" },
					],
				});

				writeData("\x1b[<32;1;3M");

				const spy = vi.spyOn(process.stdout, "write");
				const initialCalls = spy.mock.calls.length;

				writeData("\x1b[<32;1;3M");

				expect(spy.mock.calls.length).toBe(initialCalls);

				writeData("\x1b");
				await expect(promise).rejects.toThrow("Cancelled");
			});

			it("renders hover class output on motion", async () => {
				const promise = multiselect("Pick", {
					choices: [
						{ label: "A", value: "a" },
						{ label: "B", value: "b" },
					],
				});

				const spy = vi.spyOn(process.stdout, "write");
				writeData("\x1b[<32;1;3M");

				const written = spy.mock.calls.map((c) => String(c[0])).join("");
				expect(written).toContain("\x1b[48");

				writeData("\x1b");
				await expect(promise).rejects.toThrow("Cancelled");
			});
		});
	});
});
