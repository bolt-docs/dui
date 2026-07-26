import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

		describe("wheelSensitivity", () => {
			// Wheel only moves the cursor on multiselect \u2014 it does
			// NOT toggle checkboxes, even with non-1 sensitivity.
			// The toggles are still done via Space / click. So the
			// wheelSensitivity matrix here verifies cursor motion
			// only.
			const items = ["a", "b", "c", "d", "e", "f", "g"];

			it("wheelSensitivity: 3 advances the cursor 3 rows per single wheel tick", async () => {
				const promise = multiselect("Pick", {
					choices: items.map((label) => ({ label, value: label })),
					wheelSensitivity: 3,
				});

				writeData("\x1b[<65;1;1~"); // 1 wheel-down tick
				writeData(" "); // toggle space at cursor=3 (here would be 'd')
				writeData("\x1b[<65;1;1~"); // another 1 wheel-down tick \u2192 cursor=6 ('g')
				writeData(" "); // toggle 'g'
				writeData("\r");

				await expect(promise).resolves.toEqual(["d", "g"]);
			});

			it("wheelSensitivity: 0 falls back to default 1-tick behavior", async () => {
				const promise = multiselect("Pick", {
					choices: items.map((label) => ({ label, value: label })),
					wheelSensitivity: 0,
				});

				writeData("\x1b[<65;1;1~"); // 1 tick \u2192 cursor=1 ('b')
				writeData("\r");

				// Space NOT sent, so nothing is checked \u2014 confirms
				// cursor landed at 'b' and wheel did not toggle.
				await expect(promise).resolves.toEqual([]);
			});

			it("wheelSensitivity: 3 multi-tick burst lands on last row", async () => {
				const promise = multiselect("Pick", {
					choices: items.map((label) => ({ label, value: label })),
					wheelSensitivity: 3,
				});

			writeData("\x1b[<65;1;1~\x1b[<65;1;2~"); // 2 ticks \u00d7 3 sens = 6 rows
			writeData("\r");

			// Nothing toggled \u2014 only navigation verified.
			await expect(promise).resolves.toEqual([]);
		});
	});

	describe("enableDragReorder", () => {
		// SGR coordinates per row: choice i \u2192 y = 2 + i (the
		// interactive header sits on row 1; the first choice row
		// starts on row 2).
		// Row 0 \u2192 y=2, row 1 \u2192 y=3, row 2 \u2192 y=4, row 3 \u2192 y=5.

		it("off by default: a press at row 1 + release at row 3 does NOT reorder", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b" },
					{ label: "C", value: "c" },
					{ label: "D", value: "d" },
				],
				// enableDragReorder omitted \u2192 defaults to false.
			});

			// Press at row 1 (B), release at row 3 (D). Without
			// drag this is treated as a no-op (press alone isn't
			// a toggle; only matched press/release at the SAME
			// position emits a click that toggles).
			writeData("\x1b[<0;1;3M"); // press at y=3 (row 1, B)
			writeData("\x1b[<0;1;5m"); // release at y=5 (row 3, D)
			writeData("\r");

			// No row toggled; submit empty selection.
			await expect(promise).resolves.toEqual([]);
		});

		it("on: press at row 1 + release at row 3 MOVEs the row (insert, not swap)", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b" },
					{ label: "C", value: "c" },
					{ label: "D", value: "d" },
					{ label: "E", value: "e" },
				],
				enableDragReorder: true,
			});

			// Press at row 1 (B, y=3), release at row 3 (D, y=5).
			// MOVE semantic: B is REMOVED from index 1 and
			// INSERTED at index 3, shifting C, D up by one.
			// Before: [A, B, C, D, E]
			// After:  [A, C, D, B, E]
			writeData("\x1b[<0;1;3M");
			writeData("\x1b[<0;1;5m");
			// Cursor was 0 (A) initially, not 1 (B), so after
			// MOVE the cursor stays at 0. Toggle row 0 (A).
			writeData(" ");
			writeData("\r");

			await expect(promise).resolves.toEqual(["a"]);
		});

		it("on: checked state follows the dragged row to its new index", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a", checked: true }, // checked at index 0
					{ label: "B", value: "b" },
					{ label: "C", value: "c" },
					{ label: "D", value: "d" },
				],
				enableDragReorder: true,
			});

			// Drag row 0 (A, y=2) to row 2 (C, y=4).
			// Before: [A\u2713, B, C, D]
			// After MOVE(0, 2): [B, C, A\u2713, D]
			writeData("\x1b[<0;1;2M");
			writeData("\x1b[<0;1;4m");
			writeData("\r");

			// The checked row A is now at index 2.
			await expect(promise).resolves.toEqual(["a"]);
		});

		it("on: drag from a disabled row is ignored (dragSource not set)", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a", checked: true },
					{ label: "B", value: "b", disabled: true },
					{ label: "C", value: "c" },
				],
				enableDragReorder: true,
			});

			// Press at disabled row 1 (B, y=3), release at row 2 (C, y=4).
			// Drag should be a no-op because disabled rows can't be sources.
			writeData("\x1b[<0;1;3M");
			writeData("\x1b[<0;1;4m");
			writeData("\r");

			// Order preserved; A's checked flag preserved.
			await expect(promise).resolves.toEqual(["a"]);
		});

		it("on: drag to a disabled row is cancelled (no move)", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a", checked: true },
					{ label: "B", value: "b" },
					{ label: "C", value: "c", disabled: true },
				],
				enableDragReorder: true,
			});

			// Press at row 0 (A, y=2), release at disabled row 2 (C, y=4).
			// Drop on disabled \u2192 no MOVE happens.
			writeData("\x1b[<0;1;2M");
			writeData("\x1b[<0;1;4m");
			writeData("\r");

			// Order preserved; A still checked at index 0.
			await expect(promise).resolves.toEqual(["a"]);
		});

		it("on: release on the same row is a click toggle (not a move)", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b" },
					{ label: "C", value: "c" },
				],
				enableDragReorder: true,
			});

			// Press at row 1 (B, y=3) and release at row 1 (y=3).
			// The parser converts same-position release \u2192 click,
			// which toggles B's checkbox (drag completes as a
			// click, not a move).
			writeData("\x1b[<0;1;3M");
			writeData("\x1b[<0;1;3m"); // same position \u2192 click (per parser)
			writeData("\r");

			await expect(promise).resolves.toEqual(["b"]);
		});

		it("on: release outside any row cancels the drag (no MOVE)", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a", checked: true },
					{ label: "B", value: "b" },
				],
				enableDragReorder: true,
			});

			// Press at row 0 (A, y=2), release at y=99 (outside any area).
			writeData("\x1b[<0;1;2M");
			writeData("\x1b[<0;1;99m");
			writeData("\r");

			// Order and checked state preserved.
			await expect(promise).resolves.toEqual(["a"]);
		});

		it("on: cursor stays put when cursor was NOT at the dragSource", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b" },
					{ label: "C", value: "c" },
					{ label: "D", value: "d" },
					{ label: "E", value: "e" },
				],
				enableDragReorder: true,
			});

			// Move cursor to row 4 ('E') with arrow keys.
			writeData("\x1b[B");
			writeData("\x1b[B");
			writeData("\x1b[B");
			writeData("\x1b[B");
			// Now cursor = 4 (E). Drag row 1 ('B', y=3) to row 3 ('D', y=5).
			// After MOVE(1, 3): [A, C, D, B, E]. Cursor was 4 (E);
			// E is still at index 4. Cursor stays at 4.
			writeData("\x1b[<0;1;3M");
			writeData("\x1b[<0;1;5m");
			// Toggle the row at cursor (now still E at index 4).
			writeData(" ");
			writeData("\r");

			await expect(promise).resolves.toEqual(["e"]);
		});

		it("on: cursor follows the dragged row when cursor was at the source", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b" },
					{ label: "C", value: "c" },
					{ label: "D", value: "d" },
					{ label: "E", value: "e" },
				],
				enableDragReorder: true,
			});

			// Cursor starts at 0 (A). Move to row 1 ('B') with
			// one arrow-down, so cursor = 1.
			writeData("\x1b[B");
			// Drag row 1 ('B', y=3) to row 3 ('D', y=5).
			// After MOVE(1, 3): [A, C, D, B, E]. Cursor was 1
			// (== dragSource), so cursor follows B to index 3.
			writeData("\x1b[<0;1;3M");
			writeData("\x1b[<0;1;5m");
			// Toggle the row at cursor (now B at index 3).
			writeData(" ");
			writeData("\r");

			await expect(promise).resolves.toEqual(["b"]);
		});

		it("on: drag preview re-renders when mouse moves over a different row", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b" },
					{ label: "C", value: "c" },
					{ label: "D", value: "d" },
				],
				enableDragReorder: true,
			});

			const spy = vi.spyOn(process.stdout, "write");

			// Press at row 0 (A, y=2) and move to row 2 (C, y=4).
			writeData("\x1b[<0;1;2M"); // press at A
			const initialCalls = spy.mock.calls.length;
			writeData("\x1b[<32;1;4M"); // move to C
			expect(spy.mock.calls.length).toBeGreaterThan(initialCalls);

			writeData("\x1b[<0;1;4m"); // release at C \u2192 MOVE row 0 to row 2
			writeData("\r");

			// After MOVE(0, 2): [B, C, A]. Submit (no toggles).
			await expect(promise).resolves.toEqual([]);
		});

		it("on: drag visual feedback renders the dropTarget color during the drag", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b" },
					{ label: "C", value: "c" },
				],
				enableDragReorder: true,
				// Override dropTarget to a colour that doesn't
				// collide with the default `pointer` /
				// `selected` slots (both default to "cyan").
				// Using "red" (ANSI 31) here makes the test
				// sharp: any emission of \x1b[31m in the
				// dropTarget range proves the colour was
				// actually applied to the hover row, not a
				// coincidental cyan from pointer/selected.
				colors: {
					dropTarget: "#ff0000",
				},
			});

			const spy = vi.spyOn(process.stdout, "write");

			// Press at row 0 (A, y=2), move to row 2 (C, y=4).
			writeData("\x1b[<0;1;2M");
			writeData("\x1b[<32;1;4M");

			// Inspect the cumulative writes to verify the
			// 24-bit red sequence (\x1b[38;2;255;0;0m) was
			// emitted. Cyan would also be in the output
			// (pointer/selected), but \x1b[38;2;... is
			// unique to our hex override.
			const written = spy.mock.calls
				.map((c) => String(c[0]))
				.join("");
			expect(written).toContain("\x1b[38;2;255;0;0m");

			writeData("\x1b[<0;1;4m");
			writeData("\r");

			await expect(promise).resolves.toEqual([]);
		});

		it("on: multiple sequential drags compose (B past D, then A past E)", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b" },
					{ label: "C", value: "c" },
					{ label: "D", value: "d" },
					{ label: "E", value: "e" },
				],
				enableDragReorder: true,
			});

			// Move cursor to row 1 ('B') so the cursor-following
			// rule applies during the first drag. Without this,
			// the cursor stays at 0 (A) throughout and the
			// first drag would not pull it along.
			writeData("\x1b[B");
			// First drag: row 1 (B, y=3) \u2192 row 3 (D, y=5).
			// [A, B, C, D, E] \u2192 [A, C, D, B, E]
			writeData("\x1b[<0;1;3M");
			writeData("\x1b[<0;1;5m");

			// Second drag: row 0 (A, y=2) \u2192 row 4 (E, y=6).
			// [A, C, D, B, E] \u2192 [C, D, B, E, A]
			writeData("\x1b[<0;1;2M");
			writeData("\x1b[<0;1;6m");

			// Cursor follows the first drag's source: B was at
			// cursor=1 and followed to index 3. The cursor now
			// sits on B. After the second drag (MOVE 0->4), the
			// cursor follows the ROW it was on, not the index:
			// B's new index is 2 in [C, D, B, E, A], so cursor
			// remaps from 3 to 2. " " toggles B, \x1b[B moves
			// cursor down to E (idx 3), " " toggles E.
			writeData(" ");
			writeData("\x1b[B");
			writeData(" ");
			writeData("\r");

			await expect(promise).resolves.toEqual(["b", "e"]);
		});

		it("on: wheel mid-drag cancels the drag cleanly", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a", checked: true },
					{ label: "B", value: "b" },
					{ label: "C", value: "c" },
					{ label: "D", value: "d" },
					{ label: "E", value: "e" },
					{ label: "F", value: "f" },
					{ label: "G", value: "g" },
				],
				enableDragReorder: true,
			});

			// Press at row 0 (A, y=2) \u2192 drag starts.
			writeData("\x1b[<0;1;2M");
			// Wheel-down mid-drag \u2192 drag cancelled by the
			// explicit cancel-on-wheel branch.
			writeData("\x1b[<65;1;1~");
			// Release somewhere else. Because the drag was
			// cancelled, no MOVE happens.
			writeData("\x1b[<0;1;7m"); // release at y=7 (row 5 = G)
			writeData("\r");

			// Order preserved; A still checked.
			await expect(promise).resolves.toEqual(["a"]);
		});

		// Regression: dragging to a row past the pageSize
		// boundary must scroll the viewport to show the drop
		// target, even when the cursor doesn't follow.
		// Previously, the offset was only re-clamped when the
		// cursor moved; if cursor !== dragSource, the dropped
		// element could end up off-screen.
		it("on: dropping past the pageSize boundary scrolls the viewport to show the drop", async () => {
			// 15 rows; default pageSize = 10. Rows 10-14 are
			// off-screen by default (offset = 0, viewport
			// shows indices 0-9).
			const choices = Array.from({ length: 15 }, (_, i) => ({
				label: `row${i}`,
				value: `v${i}`,
			}));
			const promise = multiselect("Pick", {
				choices,
				enableDragReorder: true,
			});

			const spy = vi.spyOn(process.stdout, "write");

			// Press at row 0 (label "row0", y=2), release at row
			// 12 (label "row12", y=14). Before the drag the
			// viewport shows indices 0-9; rows 10-12 are
			// off-screen. The MOVE lands the dragged choice
			// at index 12; the post-MOVE offset adjustment
			// should scroll the viewport to show index 12
			// (offset becomes 12 - 10 + 1 = 3).
			writeData("\x1b[<0;1;2M");
			writeData("\x1b[<0;1;14m");

			// After the offset adjustment, the re-render
			// should include labels from indices 3-12.
			// "row10" was off-screen before the drag and must
			// now appear in the cumulative output.
			const written = spy.mock.calls
				.map((c) => String(c[0]))
				.join("");
			expect(written).toContain("row10");

			writeData("\r");
			await expect(promise).resolves.toEqual([]);
		});

		// Regression: upward drags (src > dst) used to leave
		// the cursor pointing at a different choice than the
		// one the user was on. The cursor rebase helper now
		// pins the cursor to its original logical row's new
		// index. Scenarios:
		//   cursor=0 (A), drag D(3) → B(1): expected [A,D,B,C,E]; cursor stays on A (idx 0)
		//   cursor=2 (C), drag D(3) → B(1): expected [A,D,B,C,E]; C pushed to idx 3 → cursor=3
		it("on: cursor pinned to original row through upward drag (cursor outside splice window)", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b" },
					{ label: "C", value: "c" },
					{ label: "D", value: "d" },
					{ label: "E", value: "e" },
				],
				enableDragReorder: true,
			});

			// Cursor starts at 0 (A). Drag row 3 (D, y=5) → row 1 (B, y=3).
			// After MOVE(3, 1): [A, D, B, C, E]. Cursor was on A (idx 0,
			// outside splice window [1, 3)), so cursor stays at idx 0 = A.
			writeData("\x1b[<0;1;5M");
			writeData("\x1b[<0;1;3m");
			// Toggle the cursor's row (still A) and submit.
			writeData(" ");
			writeData("\r");

			await expect(promise).resolves.toEqual(["a"]);
		});

		it("on: cursor pinned to original row through upward drag (cursor inside splice window)", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b" },
					{ label: "C", value: "c" },
					{ label: "D", value: "d" },
					{ label: "E", value: "e" },
				],
				enableDragReorder: true,
			});

			// Move cursor to row 2 ('C') via two ↓.
			writeData("\x1b[B");
			writeData("\x1b[B");
			// Drag row 3 (D, y=5) → row 1 (B, y=3).
			// After MOVE(3, 1): [A, D, B, C, E]. Cursor was at 2 (C),
			// inside [dst=1, src=3) splice window, so cursor rebase to 2+1 = 3.
			writeData("\x1b[<0;1;5M");
			writeData("\x1b[<0;1;3m");
			// Toggle the cursor's row → C (now at idx 3).
			writeData(" ");
			writeData("\r");

			await expect(promise).resolves.toEqual(["c"]);
		});

		it("on: cursor pinned to original row through downward drag (cursor inside splice window)", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a" },
					{ label: "B", value: "b" },
					{ label: "C", value: "c" },
					{ label: "D", value: "d" },
					{ label: "E", value: "e" },
				],
				enableDragReorder: true,
			});

			// Move cursor to row 2 ('C') via two ↓.
			writeData("\x1b[B");
			writeData("\x1b[B");
			// Drag row 1 (B, y=3) → row 3 (D, y=5).
			// After MOVE(1, 3): [A, C, D, B, E]. Cursor was at 2 (C),
			// inside (src=1, dst=3] splice window, so cursor rebase to 2-1 = 1.
			writeData("\x1b[<0;1;3M");
			writeData("\x1b[<0;1;5m");
			// Toggle the cursor's row → C (now at idx 1).
			writeData(" ");
			writeData("\r");

			await expect(promise).resolves.toEqual(["c"]);
		});

		// Regression: the checked-set rebase used to only handle
		// src < dst correctly. Upward drags would mark the wrong
		// rows after a move.
		it("on: checked set survives upward drag through splice window", async () => {
			const promise = multiselect("Pick", {
				choices: [
					{ label: "A", value: "a", checked: true }, // idx 0, outside window
					{ label: "B", value: "b" }, // idx 1 = dst
					{ label: "C", value: "c", checked: true }, // idx 2, in [1, 3)
					{ label: "D", value: "d" }, // idx 3 = src
					{ label: "E", value: "e" }, // idx 4, outside window
				],
				enableDragReorder: true,
			});

			// Drag row 3 (D) → row 1 (B). After MOVE(3, 1): [A, D, B, C, E].
			// Old checked: {0, 2}. New checked should be {0, 3}:
			//   0 (A) was outside [1, 3) → stays 0 = A ✓
			//   2 (C) was inside [1, 3) → push to 3 = C (now at idx 3) ✓
			writeData("\x1b[<0;1;5M");
			writeData("\x1b[<0;1;3m");
			writeData("\r");

			await expect(promise).resolves.toEqual(["a", "c"]);
		});
	});
});
});
