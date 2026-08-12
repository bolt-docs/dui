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
	});
});
