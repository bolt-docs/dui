/**
 * Bug-hunting round 4 (next features):
 *
 * 1. RenderSurface.write() skips wide characters (CJK, emoji) but never
 *    advances the column by their full cell width, so following
 *    characters land one cell early and every subsequent column in the
 *    row is misaligned.
 * 2. RenderSurface.flush() loses the `dim` attribute on a bold→dim
 *    transition: SGR 22 closes BOTH bold and dim, but the delta
 *    emitter never re-opens dim, so the dim run renders bold-less but
 *    NOT dim.
 * 3. form() positions the caret inside a text field's value box using
 *    `state.cursorPos` (UTF-16 code units) instead of visible cells,
 *    so CJK input drifts the caret into the middle of the typed text —
 *    the same class of bug fixed for input() earlier.
 */
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { form, visibleLength } from "../src/index";
import { RenderSurface } from "../src/surface";

describe("bug-hunting round 4", () => {
	describe("RenderSurface wide-character cell reservation", () => {
		it("advances the column by the wide char's full cell width", () => {
			const s = new RenderSurface({ width: 20, height: 3 });
			s.write(0, 0, "a中b");

			const plain = s
				.render()
				.split("\n")[0]
				.replace(/\x1b\[[0-9;]*m/g, "");

			// 'a' at cell 0, '中' occupies cells 1-2, 'b' must land at
			// cell 3 (not cell 2). Measure by visible cells, not string
			// indices — the glyph is 1 UTF-16 unit but 2 cells.
			expect(plain[0]).toBe("a");
			const bIdx = plain.indexOf("b");
			expect(visibleLength(plain.slice(0, bIdx))).toBe(3);
		});

		it("reserves cells for emoji (2-cell) characters too", () => {
			const s = new RenderSurface({ width: 20, height: 3 });
			s.write(0, 0, "x😀y");

			const plain = s
				.render()
				.split("\n")[0]
				.replace(/\x1b\[[0-9;]*m/g, "");

			// 😀 is 2 cells wide; 'y' must land at cell 3.
			expect(plain[0]).toBe("x");
			expect(plain.indexOf("y")).toBe(3);
		});

		it("keeps narrow (1-cell) non-ASCII characters in place", () => {
			const s = new RenderSurface({ width: 20, height: 3 });
			s.write(0, 0, "aéb");

			const plain = s
				.render()
				.split("\n")[0]
				.replace(/\x1b\[[0-9;]*m/g, "");

			// é is 1 cell wide — no shift.
			expect(plain.indexOf("b")).toBe(2);
		});
	});

	describe("RenderSurface SGR delta bold/dim interaction", () => {
		it("re-opens dim when transitioning from bold to dim", () => {
			const s = new RenderSurface({ width: 10, height: 2 });
			s.write(0, 0, "X", { bold: true });
			s.write(1, 0, "Y", { dim: true });

			const out = s.flush();

			// SGR 22 closes both bold and dim, so the delta that turns
			// dim on must re-open dim — either as a combined `22;2`
			// sequence or a standalone `2` after the close.
			expect(out).toContain("\x1b[1m");
			expect(/\x1b\[(?:22;2|2)m/.test(out)).toBe(true);
		});

		it("still emits a single 22 when both bold and dim close together", () => {
			const s = new RenderSurface({ width: 10, height: 2 });
			s.write(0, 0, "X", { bold: true, dim: true });
			s.write(1, 0, "Y", {});

			const out = s.flush();

			// No duplicate `22;22` — one 22 suffices for both.
			expect(out).not.toContain("\x1b[22;22m");
			// And the second cell is fully unstyled.
			const tail = out.slice(out.indexOf("X") + 1);
			expect(tail.startsWith("\x1b[22m")).toBe(true);
		});

		it("emits dim when dim turns on without a prior bold", () => {
			const s = new RenderSurface({ width: 10, height: 2 });
			s.write(0, 0, "X", { dim: true });

			const out = s.flush();
			expect(out).toContain("\x1b[2m");
		});
	});

	describe("form caret positioning with CJK values", () => {
		let dataHandler: ((data: Buffer) => void) | undefined;

		beforeEach(() => {
			Object.defineProperty(process.stdin, "isTTY", {
				value: true,
				configurable: true,
			});
			Object.defineProperty(process.stdout, "isTTY", {
				value: true,
				configurable: true,
			});
			if (typeof (process.stdin as any).setRawMode !== "function") {
				(process.stdin as any).setRawMode = vi.fn();
			}
			vi.spyOn(process.stdin, "on").mockImplementation(
				(event: any, handler: any) => {
					if (event === "data") dataHandler = handler;
					return process.stdin;
				},
			);
			vi.spyOn(process.stdin as any, "setRawMode").mockImplementation(() => {});
			vi.spyOn(process.stdout, "write").mockImplementation(() => true);
		});

		afterEach(() => {
			delete (process.stdin as { isTTY?: boolean }).isTTY;
			delete (process.stdout as { isTTY?: boolean }).isTTY;
			vi.restoreAllMocks();
		});

		function writeData(str: string) {
			dataHandler?.(Buffer.from(str, "utf8"));
		}

		function lastCursorColumn(): number {
			const writes = vi
				.mocked(process.stdout.write)
				.mock.calls.map((c) => String(c[0]))
				.join("");
			const matches = [...writes.matchAll(/\x1b\[(\d+)G/g)];
			const last = matches[matches.length - 1];
			return last ? Number(last[1]) - 1 : -1;
		}

		it("positions the caret after CJK text by visible cells", async () => {
			const promise = form({
				fields: [{ id: "name", label: "Name", type: "text" }],
			});

			writeData("你");
			writeData("好");

			// Prefix cells: '◆ ' (2) + 'Name' (4) + ': ' (2) + '[ ' (2)
			// = 10; '你好' = 4 cells → caret after the value at col 14.
			// The buggy code computed 3 + 4 + 3 + 2 (UTF-16 units) = 12.
			expect(lastCursorColumn()).toBe(
				10 + visibleLength("你好"),
			);

			writeData("\r");
			await expect(promise).resolves.toEqual({ name: "你好" });
		});

		it("keeps the caret aligned when editing before CJK text", async () => {
			const promise = form({
				fields: [{ id: "name", label: "Name", type: "text" }],
			});

			writeData("你");
			writeData("好");
			writeData("\x1b[D"); // left — caret between 你 and 好
			writeData("x");

			// Value is '你x好' → cells before caret = 2 + 1 = 3.
			expect(lastCursorColumn()).toBe(10 + visibleLength("你x"));

			writeData("\r");
			await expect(promise).resolves.toEqual({ name: "你x好" });
		});

		it("keeps ASCII caret positioning unchanged", async () => {
			const promise = form({
				fields: [{ id: "name", label: "Name", type: "text" }],
			});

			writeData("abc");

			// 'abc' = 3 cells → caret at 10 + 3 = 13 (same as before the
			// fix: 3 + 4 + 3 + 3 = 13).
			expect(lastCursorColumn()).toBe(13);

			writeData("\r");
			await expect(promise).resolves.toEqual({ name: "abc" });
		});
	});
});
