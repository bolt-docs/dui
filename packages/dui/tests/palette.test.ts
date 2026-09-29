import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { palette, resetConfig } from "../src/index";

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

const ITEMS = [
	{ label: "Deploy to production", value: "deploy", shortcut: "d" },
	{
		label: "Run tests",
		value: "test",
		keywords: ["vitest", "unit"],
		shortcut: "t",
	},
	{ label: "Git push", value: "push" },
];

describe("palette", () => {
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
		it("resolves with the numbered selection", async () => {
			const input = new PassThrough();
			const origStdin = process.stdin;
			Object.defineProperty(process, "stdin", {
				value: input,
				writable: true,
				configurable: true,
			});
			setTTY(false);
			vi.spyOn(console, "log").mockImplementation(() => {});

			const promise = palette("Run", { items: ITEMS });
			input.write("2\n");

			await expect(promise).resolves.toBe("test");

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

		beforeEach(() => {
			setTTY(true);
			dataHandler = undefined;

			vi.spyOn(process.stdin, "on").mockImplementation(
				(event: any, handler: any) => {
					if (event === "data") dataHandler = handler;
					return process.stdin;
				},
			);

			vi.spyOn(process.stdin as any, "setRawMode").mockImplementation(() => {});
			vi.spyOn(process.stdout, "write").mockImplementation(() => true);
			vi.spyOn(process.stdout, "isTTY", "get").mockReturnValue(true);
		});

		function writeData(str: string) {
			if (dataHandler) dataHandler(Buffer.from(str, "utf8"));
		}

		it("selects the first item on enter", async () => {
			const promise = palette("Run", { items: ITEMS });
			writeData("\r");
			await expect(promise).resolves.toBe("deploy");
		});

		it("navigates with arrow keys", async () => {
			const promise = palette("Run", { items: ITEMS });
			writeData("\x1b[B");
			writeData("\x1b[B");
			writeData("\r");
			await expect(promise).resolves.toBe("push");
		});

		it("filters with a fuzzy query and selects the match", async () => {
			const promise = palette("Run", { items: ITEMS });
			writeData("test");
			writeData("\r");
			await expect(promise).resolves.toBe("test");
		});

		it("fuzzy matches keywords", async () => {
			const promise = palette("Run", { items: ITEMS });
			writeData("vit");
			writeData("\r");
			await expect(promise).resolves.toBe("test");
		});

		it("escape clears the query first, then cancels", async () => {
			const promise = palette("Run", { items: ITEMS });
			writeData("git");
			writeData("\x1b"); // clears query, keeps palette open
			await Promise.resolve(); // let the debounce microtask run
			writeData("\x1b"); // cancels
			await expect(promise).rejects.toThrow("Cancelled");
		});

		it("backspace edits the query", async () => {
			const promise = palette("Run", { items: ITEMS });
			writeData("test");
			writeData("\x7f"); // → "tes"
			writeData("\x7f"); // → "te"
			writeData("\r");
			// "te" fuzzy-matches "test" first
			await expect(promise).resolves.toBe("test");
		});

		it("throws on empty items", async () => {
			await expect(palette("Run", { items: [] })).rejects.toThrow(
				"Palette requires at least one item",
			);
		});

		describe("disabled items", () => {
			const ITEMS_WITH_DISABLED = [
				{ label: "Deploy", value: "deploy" },
				{ label: "Disabled action", value: "disabled", disabled: true },
				{ label: "Run tests", value: "test" },
				{ label: "Git push", value: "push" },
			];

			it("skips disabled items when navigating down", async () => {
				const promise = palette("Run", { items: ITEMS_WITH_DISABLED });
				writeData("\x1b[B"); // 0 → skips 1 (disabled) → 2
				writeData("\r");
				await expect(promise).resolves.toBe("test");
			});

			it("skips disabled items when navigating up", async () => {
				const promise = palette("Run", { items: ITEMS_WITH_DISABLED });
				writeData("\x1b[B"); // → 2 (test)
				writeData("\x1b[B"); // → 3 (push)
				writeData("\x1b[A"); // 3 → 2 (test), skips nothing
				writeData("\x1b[A"); // 2 → 0 (deploy), skipping disabled 1
				writeData("\r");
				await expect(promise).resolves.toBe("deploy");
			});

			it("opens on the first enabled item when item 0 is disabled", async () => {
				// Enter must work immediately — the user should not have to
				// discover that a disabled first row swallows the keystroke.
				const promise = palette("Run", {
					items: [
						{ label: "Disabled", value: "disabled", disabled: true },
						{ label: "Deploy", value: "deploy" },
					],
				});
				writeData("\r");
				await expect(promise).resolves.toBe("deploy");
			});

			it("lands on the first enabled hit when the top match is disabled", async () => {
				const promise = palette("Run", {
					items: [
						{ label: "Deploy now", value: "deploy" },
						{ label: "Deploy later", value: "later", disabled: true },
					],
				});
				// Both rows match the query "deploy"; the top one is enabled.
				writeData("deploy");
				writeData("\r");
				await expect(promise).resolves.toBe("deploy");

				const second = palette("Run", {
					items: [
						{ label: "Deploy now", value: "deploy", disabled: true },
						{ label: "Deploy later", value: "later" },
					],
				});
				// Here the top match is disabled, so Enter must land on the
				// second one rather than being swallowed.
				writeData("deploy");
				writeData("\r");
				await expect(second).resolves.toBe("later");
			});

			it("wraps around the ends when every other item is disabled", async () => {
				const promise = palette("Run", {
					items: [
						{ label: "A", value: "a" },
						{ label: "B", value: "b", disabled: true },
					],
				});
				// From 0, one wheel-down tick must wrap to 0 (not park on B).
				writeData("\x1b[<65;5;5~");
				writeData("\r");
				await expect(promise).resolves.toBe("a");
			});
		});

		describe("mouse", () => {
			const MOUSE_ITEMS = [
				{ label: "Deploy", value: "deploy" },
				{ label: "Run tests", value: "test" },
				{ label: "Git push", value: "push" },
			];

			// Palette layout: line 0 = message, line 1 = search line,
			// lines 2+ = items. listTop = 1 + 0 + 1 = 2, so item i sits
			// at y = listTop + 1 + i = 3 + i.
			it("selects a row when a valid sgr click arrives", async () => {
				const promise = palette("Run", { items: MOUSE_ITEMS });
				// Item 2 (push) → y = 3 + 2 = 5
				writeData("\x1b[<0;5;5M");
				writeData("\x1b[<0;5;5m");
				await expect(promise).resolves.toBe("push");
			});

			it("ignores clicks that fall outside any registered row", async () => {
				const promise = palette("Run", { items: MOUSE_ITEMS });
				writeData("\x1b[<0;5;99M");
				writeData("\x1b[<0;5;99m");
				writeData("\r"); // confirm stays on first item
				await expect(promise).resolves.toBe("deploy");
			});

			it("ignores clicks on disabled rows", async () => {
				const promise = palette("Run", {
					items: [
						{ label: "Deploy", value: "deploy" },
						{ label: "Disabled", value: "disabled", disabled: true },
						{ label: "Push", value: "push" },
					],
				});
				// Click disabled middle row (i=1 → y = 4)
				writeData("\x1b[<0;1;4M");
				writeData("\x1b[<0;1;4m");
				writeData("\r");
				await expect(promise).resolves.toBe("deploy");
			});

			it("emits the SGR enable sequences on entry", () => {
				const spy = vi.spyOn(process.stdout, "write");
				palette("Run", { items: MOUSE_ITEMS });
				expect(spy).toHaveBeenCalledWith("\x1b[?1000h");
				expect(spy).toHaveBeenCalledWith("\x1b[?1006h");
				expect(spy).toHaveBeenCalledWith("\x1b[?1003h");
			});

			it("emits the SGR disable sequences on finalize", async () => {
				const promise = palette("Run", { items: MOUSE_ITEMS });
				const spy = vi.spyOn(process.stdout, "write");
				writeData("\r");
				await promise;
				expect(spy).toHaveBeenCalledWith("\x1b[?1006l");
				expect(spy).toHaveBeenCalledWith("\x1b[?1000l");
			});

			it("advances the cursor with a wheel-down tick, skipping disabled", async () => {
				const promise = palette("Run", {
					items: [
						{ label: "Deploy", value: "deploy" },
						{ label: "Disabled", value: "disabled", disabled: true },
						{ label: "Push", value: "push" },
					],
				});
				writeData("\x1b[<65;5;5~"); // wheel down
				writeData("\r");
				await expect(promise).resolves.toBe("push");
			});

			it("moves up with a wheel-up tick", async () => {
				const promise = palette("Run", {
					items: [
						{ label: "Deploy", value: "deploy" },
						{ label: "Test", value: "test" },
						{ label: "Push", value: "push" },
					],
				});
				writeData("\x1b[B");
				writeData("\x1b[B"); // → 2 (push)
				writeData("\x1b[<64;5;5~"); // wheel up → 1 (test)
				writeData("\r");
				await expect(promise).resolves.toBe("test");
			});

			it("re-renders on hover move event", async () => {
				const spy = vi.spyOn(process.stdout, "write");
				const promise = palette("Run", { items: MOUSE_ITEMS });
				const callsBefore = spy.mock.calls.length;
				writeData("\x1b[<32;5;4M"); // hover over item 1 (y=4)
				expect(spy.mock.calls.length).toBeGreaterThan(callsBefore);
				writeData("\r");
				await expect(promise).resolves.toBe("deploy");
			});

			it("clears hover when the pointer leaves the list", async () => {
				const promise = palette("Run", { items: MOUSE_ITEMS });
				writeData("\x1b[<32;5;4M"); // hover item 1
				writeData("\x1b[<32;5;99M"); // leave list
				writeData("\r");
				await expect(promise).resolves.toBe("deploy");
			});

			it("wheelSensitivity advances multiple rows per tick", async () => {
				const promise = palette("Run", {
					items: [
						{ label: "A", value: "a" },
						{ label: "B", value: "b" },
						{ label: "C", value: "c" },
						{ label: "D", value: "d" },
					],
					wheelSensitivity: 3,
				});
				writeData("\x1b[<65;5;5~"); // wheel down ×3 → 3 (d)
				writeData("\r");
				await expect(promise).resolves.toBe("d");
			});

			it("clamps when every row is disabled", async () => {
				const promise = palette("Run", {
					items: [
						{ label: "A", value: "a", disabled: true },
						{ label: "B", value: "b", disabled: true },
					],
				});
				writeData("\x1b[B");
				writeData("\x1b[<65;5;5~");
				// Enter on a disabled item must not finalize; give up via Escape
				writeData("\x1b");
				await Promise.resolve();
				writeData("\x1b");
				await expect(promise).rejects.toThrow("Cancelled");
			});
		});
	});
});
