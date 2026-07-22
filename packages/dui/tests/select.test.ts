import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PassThrough } from "node:stream";
import { resetConfig, select } from "../src/index";

// Node 22+ exposes `isTTY` as a getter-only inherited property, so direct
// assignment throws. Override safely with Object.defineProperty and undo
// the override in afterEach via `delete` so the prototype getter takes over.
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

describe("select", () => {
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
		it("resolves with the selected value by number", async () => {
			const input = new PassThrough();
			const origStdin = process.stdin;

			Object.defineProperty(process, "stdin", {
				value: input,
				writable: true,
				configurable: true,
			});
			setTTY(false);
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
			setTTY(false);
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
			setTTY(false);
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
			setTTY(false);
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

		it("selects the first choice on enter", async () => {
			const promise = select("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green" },
				],
			});

			writeData("\r");

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

			writeData("\x1b[B");
			writeData("\r");

			await expect(promise).resolves.toBe("green");
		});

		it("navigates up and wraps around", async () => {
			const promise = select("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green" },
				],
			});

			writeData("\x1b[A");
			writeData("\r");

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

			writeData("\x1b[B");
			writeData("\r");

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

			writeData("\x1b[A");
			writeData("\r");

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

			writeData("\x1b[B");
			writeData("\r");

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

			writeData("\x1b[A");
			writeData("\r");

			await expect(promise).resolves.toBe("red");
		});

		it("navigates with all disabled choices", async () => {
			const promise = select("Pick", {
				choices: [
					{ label: "Red", value: "red", disabled: true },
					{ label: "Green", value: "green", disabled: true },
				],
			});

			writeData("\x1b[B");
			writeData("\x1b[B");
			writeData("\x1b");

			await expect(promise).rejects.toThrow("Cancelled");
		});

		it("rejects on escape", async () => {
			const promise = select("Pick", {
				choices: [
					{ label: "Red", value: "red" },
					{ label: "Green", value: "green" },
				],
			});

			writeData("\x1b");

			await expect(promise).rejects.toThrow("Cancelled");
		});

		it("throws on empty choices", async () => {
			await expect(select("Pick", { choices: [] })).rejects.toThrow(
				"Select requires at least one choice",
			);
		});

		it("supports non-string values", async () => {
			const promise = select("Pick", {
				choices: [
					{ label: "One", value: 1 },
					{ label: "Two", value: 2 },
				],
			});

			writeData("\x1b[B");
			writeData("\r");

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

			writeData("\r");
			await promise;

			expect(stdinSetRawMode).toHaveBeenCalledWith(false);
		});

		it("restores raw mode on cancel", async () => {
			const promise = select("Pick", {
				choices: [{ label: "A", value: "a" }],
			});

			writeData("\x1b");
			await expect(promise).rejects.toThrow("Cancelled");

			expect(stdinSetRawMode).toHaveBeenCalledWith(false);
		});

		describe("mouse", () => {
			it("selects a row when a valid sgr click arrives", async () => {
				const promise = select("Pick", {
					choices: [
						{ label: "Red", value: "red" },
						{ label: "Green", value: "green" },
						{ label: "Blue", value: "blue" },
					],
				});

				// Row 2 → choiceIndex 2 (Blue). Bounds: y=2+i → choice 2 sits at y=4.
				writeData("\x1b[<0;5;4M");
				writeData("\x1b[<0;5;4m");

				await expect(promise).resolves.toBe("blue");
			});

			it("ignores clicks that fall outside any registered row", async () => {
				const promise = select("Pick", {
					choices: [
						{ label: "Red", value: "red" },
						{ label: "Green", value: "green" },
					],
				});

				writeData("\x1b[<0;5;99M");
				writeData("\x1b[<0;5;99m");

				// Now exit via Escape so the promise settles.
				writeData("\x1b");
				await expect(promise).rejects.toThrow("Cancelled");
			});

			it("ignores clicks on disabled rows", async () => {
				const promise = select("Pick", {
					choices: [
						{ label: "Red", value: "red" },
						{ label: "Green", value: "green", disabled: true },
						{ label: "Blue", value: "blue" },
					],
				});

				// Click the disabled second row (choice 1 → y = 2 + 1 = 3).
				writeData("\x1b[<0;1;3M");
				writeData("\x1b[<0;1;3m");

				// Confirm via Enter → should still be on the first row
				writeData("\r");
				await expect(promise).resolves.toBe("red");
			});

			it("emits the SGR enable sequences on entry", () => {
				const spy = vi.spyOn(process.stdout, "write");
				select("Pick", { choices: [{ label: "A", value: "a" }] });
				expect(spy).toHaveBeenCalledWith("\x1b[?1000h");
				expect(spy).toHaveBeenCalledWith("\x1b[?1006h");
			});

			it("emits the SGR disable sequences on finalize", async () => {
				const promise = select("Pick", {
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
				const promise = select("Pick", {
					choices: [
						{ label: "Red", value: "red" },
						{ label: "Green", value: "green" },
					],
				});

				// Trigger a re-render with an arrow key.
				writeData("\x1b[B");
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
				select("Pick", { choices: [{ label: "A", value: "a" }] });
				expect(spy).toHaveBeenCalledWith("\x1b[?1003h");
			});

			it("disables motion tracking on finalize", async () => {
				const promise = select("Pick", {
					choices: [{ label: "A", value: "a" }],
				});

				const spy = vi.spyOn(process.stdout, "write");
				writeData("\r");
				await promise;

				expect(spy).toHaveBeenCalledWith("\x1b[?1003l");
			});

			it("re-renders on hover move event", async () => {
				const promise = select("Pick", {
					choices: [
						{ label: "Red", value: "red" },
						{ label: "Green", value: "green" },
					],
				});

				// First render triggers some writes. Reset the spy count.
				// Send a motion event targeting row 1 (y=2).
				const spy = vi.spyOn(process.stdout, "write");
				writeData("\x1b[<32;1;3M");

				// Motion events should trigger a render (which writes the
				// cursor-positioning escape sequence and the content).
				expect(spy.mock.calls.length).toBeGreaterThan(0);

				// Cleanup
				writeData("\x1b");
				await expect(promise).rejects.toThrow("Cancelled");
			});

			it("does not re-render when hovering same item", async () => {
				const promise = select("Pick", {
					choices: [
						{ label: "Red", value: "red" },
						{ label: "Green", value: "green" },
					],
				});

				// First motion onto row 1 (y=3) triggers render.
				writeData("\x1b[<32;1;3M");

				const spy = vi.spyOn(process.stdout, "write");
				const initialCalls = spy.mock.calls.length;

				// Same motion again — hoveredIndex doesn't change, no render.
				writeData("\x1b[<32;1;3M");

				expect(spy.mock.calls.length).toBe(initialCalls);

				writeData("\x1b");
				await expect(promise).rejects.toThrow("Cancelled");
			});

			it("renders hover class output on motion", async () => {
				const promise = select("Pick", {
					choices: [
						{ label: "Red", value: "red" },
						{ label: "Green", value: "green" },
					],
				});

				// Motion event over row 1 (y=3)
				const spy = vi.spyOn(process.stdout, "write");
				writeData("\x1b[<32;1;3M");

				const written = spy.mock.calls.map((c) => String(c[0])).join("");

				// The hover class applies background color escape.
				expect(written).toContain("\x1b[48");

				writeData("\x1b");
				await expect(promise).rejects.toThrow("Cancelled");
			});
		});
	});
});
