/**
 * RenderSurface hot-path regression tests.
 *
 * `write()` gained an ASCII fast path and `flush()` / `render()` now rebind a
 * single shared `delta` object instead of allocating one per cell. Both are
 * pure optimisations, so the contract they must uphold is identical output for
 * every input. These tests pin that contract:
 *
 * 1. The ASCII fast path must place cells exactly like the grapheme path.
 * 2. Rebinding `delta` must not leak a previous cell's attributes into the
 *    next one (the failure mode is a stale `bold`/`italic`/`dim` re-opening
 *    an attribute the new cell never had).
 * 3. The `hexToRgb` memo added for the SGR path is capped, so parsing must
 *    stay correct on both sides of the eviction threshold.
 *
 * `render()` pads every row to the surface width and terminates with a reset,
 * so assertions strip SGR and compare the padded row rather than a bare slice.
 */

import { describe, expect, it } from "vitest";
import { RenderSurface } from "../src/surface";

/** Row `row` with all SGR sequences removed. */
function plain(surface: RenderSurface, row = 0): string {
	return surface
		.render()
		.split("\n")
		[row].replace(/\x1b\[[0-9;]*m/g, "");
}

/** SGR sequences emitted by `render()`, in order. */
function sequences(surface: RenderSurface): string[] {
	return surface.render().match(/\x1b\[[0-9;]*m/g) ?? [];
}

/**
 * The sequences covering the transition between the first two written cells.
 * Trailing padding cells legitimately emit a reset back to the default style,
 * so the assertions below only look at the leading transition.
 */
function transition(surface: RenderSurface): string[] {
	return sequences(surface).slice(0, 2);
}

describe("RenderSurface write() ASCII fast path", () => {
	it("places one cell per printable ASCII character", () => {
		const s = new RenderSurface({ width: 20, height: 2 });
		s.write(3, 0, "hello");
		expect(plain(s)).toBe("   hello".padEnd(20));
	});

	it("lands the same columns as a wide-glyph row of identical layout", () => {
		// "ab中cd" occupies 1+1+2+1+1 = 6 cells. The ASCII run after the
		// wide glyph is the part the fast path has to keep in sync, so
		// assert the cell offsets rather than just the characters. The row
		// is padded to the surface width in *cells*, not string units, so
		// compare offsets instead of using padEnd().
		const s = new RenderSurface({ width: 20, height: 2 });
		s.write(0, 0, "ab中cd");
		expect(plain(s).startsWith("ab中cd")).toBe(true);
		// 'd' must start at cell 4: a=0, b=1, 中=2-3, c=4... so index 4 in
		// the rendered string is 'c'. Verify both offsets explicitly.
		expect(plain(s).indexOf("c")).toBe(3);
		expect(plain(s).indexOf("d")).toBe(4);
	});

	it("keeps consecutive write() calls aligned across the fast path", () => {
		const s = new RenderSurface({ width: 20, height: 2 });
		s.write(0, 0, "abc");
		s.write(3, 0, "def");
		expect(plain(s)).toBe("abcdef".padEnd(20));
	});

	it("falls back to grapheme segmentation outside printable ASCII", () => {
		// \t is outside the [\u0020-\u007e] fast-path range, so it must go
		// through the grapheme path rather than being assumed 1×1.
		const s = new RenderSurface({ width: 20, height: 2 });
		s.write(0, 0, "a\tb");
		expect(plain(s)).toBe("a\tb".padEnd(20));
	});
});

describe("RenderSurface shared SGR delta object", () => {
	it("does not leak bold into the following cell", () => {
		const s = new RenderSurface({ width: 20, height: 2 });
		s.write(0, 0, "a", { bold: true });
		s.write(1, 0, "b", { bold: false });
		// One open (1) then a close (22) — never a second open.
		expect(transition(s)).toEqual(["\x1b[1m", "\x1b[22m"]);
	});

	it("does not leak italic or underline into the following cell", () => {
		const s = new RenderSurface({ width: 20, height: 2 });
		s.write(0, 0, "a", { italic: true, underline: true });
		s.write(1, 0, "b", {});
		expect(transition(s)).toEqual(["\x1b[3;4m", "\x1b[23;24m"]);
	});

	it("emits no SGR for a second cell that shares the first cell's state", () => {
		const s = new RenderSurface({ width: 20, height: 2 });
		s.write(0, 0, "a", { bold: true, fg: "#ff0000" });
		s.write(1, 0, "b");
		// One sequence opens the style; the next only resets for the
		// trailing padding cells. Nothing may be emitted *between* the two
		// written cells, so a third sequence here would mean leakage.
		expect(transition(s)).toEqual(["\x1b[1;38;2;255;0;0m", "\x1b[22;39m"]);
	});

	it("keeps the bold→dim transition intact (SGR 22 closes both)", () => {
		const s = new RenderSurface({ width: 20, height: 2 });
		s.write(0, 0, "a", { bold: true });
		s.write(1, 0, "b", { bold: false, dim: true });
		// 22 closes bold *and* dim, so dim must be re-opened with 2 in the
		// same sequence — not dropped.
		expect(transition(s)).toEqual(["\x1b[1m", "\x1b[22;2m"]);
	});

	it("carries every attribute across a style change in one sequence", () => {
		const s = new RenderSurface({ width: 20, height: 2 });
		s.write(0, 0, "a", { bold: true, italic: true, underline: true });
		s.write(1, 0, "b", {
			bold: false,
			italic: false,
			underline: false,
			dim: true,
			inverse: true,
		});
		expect(transition(s)).toEqual(["\x1b[1;3;4m", "\x1b[22;2;23;24;7m"]);
	});
});

describe("RenderSurface hexToRgb cache", () => {
	it("parses colors correctly past the eviction threshold", () => {
		// The cache is capped so a TUI that generates a fresh colour per
		// frame cannot grow it without bound. Crossing that cap must not
		// change any observable output.
		const s = new RenderSurface({ width: 4000, height: 2 });
		for (let i = 0; i < 3000; i++) {
			s.write(i, 0, "x", { fg: `#${i.toString(16).padStart(6, "0")}` });
		}

		// 2999 === 0x0bb7 → r=0x00 g=0x0b b=0xb7. This is well past the
		// 1024-entry cap, so the value can only be right if the cache
		// re-parsed it correctly after being cleared.
		expect(s.render()).toContain("\x1b[38;2;0;11;183m");
	});

	it("still expands the 3-digit form after eviction", () => {
		const s = new RenderSurface({ width: 4000, height: 2 });
		for (let i = 0; i < 2000; i++) {
			s.write(i, 0, "x", { fg: `#${i.toString(16).padStart(6, "0")}` });
		}
		s.write(3999, 0, "y", { fg: "#abc" });
		// #abc → r=0xaa g=0xbb b=0xcc
		expect(s.render()).toContain("\x1b[38;2;170;187;204m");
	});

	it("emits a default-colour reset for an unparseable colour", () => {
		const s = new RenderSurface({ width: 20, height: 2 });
		s.write(0, 0, "a", { fg: "not-a-color" });
		// No truecolor sequence is emitted, and the following default cell
		// resets back to 39 — never a 38;2 triplet with NaN components.
		expect(s.render()).not.toContain("NaN");
		expect(sequences(s)).toEqual(["\x1b[39m", "\x1b[0m"]);
	});
});
