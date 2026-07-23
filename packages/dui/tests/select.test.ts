import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

		describe("wheelSensitivity", () => {
			// 0,1,2,3,4,5,6 — six fully-enabled rows. The default
			// sensitivity=1 was already covered by other wheel tests
			// (each tick = one row). Here we exercise the
			// multi-row-per-tick code path and the defensive
			// coercion of `< 1` to 1.
			const items = ["a", "b", "c", "d", "e", "f", "g"];

			it("wheelSensitivity: 3 advances the cursor 3 rows per single wheel tick", async () => {
				const promise = select("Pick", {
					choices: items.map((label, i) => ({
						label,
						value: label,
					})),
					wheelSensitivity: 3,
				});

				// Single wheel-down tick. Net magnitude = 1 * 3 = 3 rows.
				writeData("\x1b[<65;1;1~");
				writeData("\r");

				// Cursor: 0 → 1 → 2 → 3 → 'd'.
				await expect(promise).resolves.toBe("d");
			});

			it("wheelSensitivity: 4 still wraps when going past the last item", async () => {
				// With sensitivity=4 and 7 items one tick wraps
				// around twice and ends at index 4 ('e'). This proves
				// the multiplication is applied per row (clampCursor
				// is called once per row inside the loop), not as a
				// single optimised jump that could skip disabled
				// items.
				const promise = select("Pick", {
					choices: items.map((label, i) => ({
						label,
						value: label,
					})),
					wheelSensitivity: 4,
				});

				writeData("\x1b[<65;1;1~");
				writeData("\r");

				// Cursor: 0 → 1 → 2 → 3 → 4 (lands on 'e').
				await expect(promise).resolves.toBe("e");
			});

			it("wheelSensitivity: 0 falls back to default 1-tick behavior", async () => {
				// Defensive clamp: passing 0 must not produce a
				// divide-by-zero or a reverse-direction bug. Coerced
				// to 1, a single tick still moves one row. Note: 0
				// does NOT disable wheel scrolling — there is no
				// opt-out at the moment, omit the option or pass
				// undefined to get default behavior.
				const promise = select("Pick", {
					choices: items.map((label) => ({ label, value: label })),
					wheelSensitivity: 0,
				});

				writeData("\x1b[<65;1;1~");
				writeData("\r");

				// Cursor: 0 → 1 → 'b'.
				await expect(promise).resolves.toBe("b");
			});

			it("wheelSensitivity × disabled items: skips disabled rows per step inside the magnitude loop", async () => {
				// Regression guard for the disabled-skip semantics
				// surviving the magnitude multiplication. With
				// sensitivity=3 and one wheel-down tick over
				// [A, B-disabled, C, D, E], the loop calls
				// clampCursor(cursor + 1) three times:
				//   iter 0: clampCursor(1) skips disabled B → lands on C (idx 2)
				//   iter 1: clampCursor(3) → lands on D (idx 3)
				//   iter 2: clampCursor(4) → lands on E (idx 4)
				// Final cursor lands on E — proving that per-row
				// `clampCursor` still skips disabled items inside
				// the magnitude loop (B was never selected even
				// though the magnitude exceeded its index).
				const withDisabled: Array<{
					label: string;
					value: string;
					disabled?: boolean;
				}> = [
					{ label: "A", value: "a" },
					{ label: "B", value: "b", disabled: true },
					{ label: "C", value: "c" },
					{ label: "D", value: "d" },
					{ label: "E", value: "e" },
				];
				const promise = select("Pick", {
					choices: withDisabled,
					wheelSensitivity: 3,
				});

				writeData("\x1b[<65;1;1~");
				writeData("\r");

				await expect(promise).resolves.toBe("e");
			});

			it("wheelSensitivity: 3 also propagates through wheel bursts (multi-tick)", async () => {
				// Mirrors the multi-tick fix: 2 wheel-down ticks at
				// sensitivity=3 produce a net magnitude of 2*3 = 6,
				// landing on the last item ('g').
				const promise = select("Pick", {
					choices: items.map((label) => ({ label, value: label })),
					wheelSensitivity: 3,
				});

				writeData("\x1b[<65;1;1~\x1b[<65;1;2~");
				writeData("\r");

				// Cursor: 0 → 1 → ... → 6 ('g').
				await expect(promise).resolves.toBe("g");
			});
		});
	});
});
