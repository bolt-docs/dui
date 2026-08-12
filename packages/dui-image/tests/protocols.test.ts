import { describe, expect, it } from "vitest";
import {
	isTmux,
	pixelsToSixel,
	tmuxPassthrough,
	wrapSixel,
} from "../src/protocols";

describe("tmuxPassthrough", () => {
	it("wraps a payload in a DCS passthrough", () => {
		const out = tmuxPassthrough("hello");
		expect(out).toBe("\x1bPtmux;\x1bhello\x1b\\");
	});

	it("doubles ESC characters inside the payload", () => {
		const out = tmuxPassthrough("\x1b_Ga=T\x1b\\");
		// prefix ESC + doubled payload ESCs (each \x1b becomes \x1b\x1b)
		// + ST.
		expect(out).toBe("\x1bPtmux;\x1b\x1b\x1b_Ga=T\x1b\x1b\\\x1b\\");
	});

	it("isTmux reflects the TMUX env var", () => {
		const original = process.env.TMUX;
		delete process.env.TMUX;
		expect(isTmux()).toBe(false);
		process.env.TMUX = "/tmp/tmux-1000/default,123,0";
		expect(isTmux()).toBe(true);
		if (original === undefined) delete process.env.TMUX;
		else process.env.TMUX = original;
	});
});

describe("pixelsToSixel", () => {
	it("encodes a solid color image", () => {
		// 2×6 solid red image (RGBA).
		const pixels = new Uint8Array(2 * 6 * 4);
		for (let i = 0; i < 2 * 6; i++) {
			pixels[i * 4] = 255;
			pixels[i * 4 + 1] = 0;
			pixels[i * 4 + 2] = 0;
			pixels[i * 4 + 3] = 255;
		}
		const out = pixelsToSixel(pixels, 2, 6);
		// One colour definition (0-100 scale: red = 100;0;0).
		expect(out).toContain("#0;2;100;0;0");
		// Band contains the full column mask (0x3F → '~') for both columns.
		expect(out).toContain("#0~~");
		expect(out).toContain("$");
		expect(out).toContain("-");
	});

	it("stays deterministic for the same input", () => {
		const pixels = new Uint8Array(4 * 4 * 4);
		for (let i = 0; i < 4 * 4; i++) {
			pixels[i * 4] = (i * 7) % 256;
			pixels[i * 4 + 1] = (i * 13) % 256;
			pixels[i * 4 + 2] = (i * 29) % 256;
			pixels[i * 4 + 3] = 255;
		}
		const a = pixelsToSixel(pixels, 4, 4);
		const b = pixelsToSixel(pixels, 4, 4);
		expect(a).toBe(b);
	});

	it("wrapSixel produces the full DCS sequence", () => {
		expect(wrapSixel("ABC")).toBe("\x1bPqABC\x1b\\\n");
	});
});
