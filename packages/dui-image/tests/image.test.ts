import { beforeEach, describe, expect, it } from "vitest";
import {
	applyDither,
	detectTerminal,
	pixelsToAnsi,
	renderAnsi,
	resetTerminalDetection,
	setTerminalCaps,
} from "../src/index";
import { createMinimalPng, createTestPixels, stripAnsi } from "./helpers";

// ── Tests ──────────────────────────────────────────────────────

describe("detectTerminal", () => {
	beforeEach(() => {
		resetTerminalDetection();
	});

	it("returns default capabilities without env", () => {
		const caps = detectTerminal();
		expect(caps.columns).toBeGreaterThanOrEqual(80);
		expect(caps.rows).toBeGreaterThanOrEqual(24);
		expect(typeof caps.truecolor).toBe("boolean");
	});

	it("can be overridden with setTerminalCaps", () => {
		setTerminalCaps({ sixel: true, bestFormat: "sixel" });
		const caps = detectTerminal();
		expect(caps.sixel).toBe(true);
		expect(caps.bestFormat).toBe("sixel");
	});

	it("caches capabilities after override", () => {
		setTerminalCaps({ columns: 200 });
		expect(detectTerminal().columns).toBe(200);
	});
});

describe("pixelsToAnsi", () => {
	it("renders a solid red image", () => {
		const pixels = createTestPixels(2, 2);
		const result = pixelsToAnsi(pixels, 2, 2, { width: 2, height: 1 });

		expect(result).toContain("\x1b[38;2;255;0;0m");
		expect(result).toContain("\x1b[48;2;255;0;0m");
		expect(result).toContain("▀");
		expect(result).toContain("\x1b[0m");
	});

	it("renders different upper/lower colors", () => {
		const pixels = createTestPixels(2, 2, (x, y) =>
			y === 0 ? [255, 0, 0] : [0, 0, 255],
		);
		const result = pixelsToAnsi(pixels, 2, 2, { width: 2, height: 1 });

		expect(result).toContain("\x1b[38;2;255;0;0m"); // upper = red
		expect(result).toContain("\x1b[48;2;0;0;255m"); // lower = blue
	});

	it("renders with custom background override", () => {
		const pixels = createTestPixels(2, 2);
		const result = pixelsToAnsi(pixels, 2, 2, {
			width: 2,
			height: 1,
			bgColor: "#000000",
		});

		expect(result).toContain("\x1b[48;2;0;0;0m");
	});

	it("renders with custom block character", () => {
		const pixels = createTestPixels(2, 2);
		const result = pixelsToAnsi(pixels, 2, 2, {
			width: 2,
			height: 1,
			blockChar: "█",
		});

		expect(result).toContain("█");
	});

	it("handles a 1×1 image (single pixel)", () => {
		const pixels = createTestPixels(1, 1);
		const result = pixelsToAnsi(pixels, 1, 1, { width: 1, height: 1 });

		expect(stripAnsi(result).trim()).toBe("▀");
	});

	it("creates multiple output rows for tall images", () => {
		const pixels = createTestPixels(2, 8);
		const result = pixelsToAnsi(pixels, 2, 8, { width: 2, height: 4 });

		expect(result.split("\n").length).toBe(4);
	});

	it("handles a gradient image without crashing", () => {
		const pixels = createTestPixels(4, 4, (x, y) => [
			Math.floor((x / 4) * 255),
			Math.floor((y / 4) * 255),
			128,
		]);
		const result = pixelsToAnsi(pixels, 4, 4, { width: 4, height: 2 });
		expect(result.length).toBeGreaterThan(0);
	});

	it("respects maxWidth and maxHeight constraints", () => {
		const pixels = createTestPixels(100, 100);
		const result = pixelsToAnsi(pixels, 100, 100, {
			width: 80,
			height: 40,
			maxWidth: 40,
			maxHeight: 20,
		});

		for (const line of result.split("\n")) {
			const clean = stripAnsi(line);
			expect(clean.length).toBeLessThanOrEqual(41); // +1 for trailing reset
		}
	});
});

describe("applyDither", () => {
	it("keeps all pixel values in 0-255 range", () => {
		const pixels = createTestPixels(4, 4, () => [128, 128, 128]);
		applyDither(pixels, 4, 4);

		for (let i = 0; i < pixels.length; i++) {
			expect(pixels[i]).toBeGreaterThanOrEqual(0);
			expect(pixels[i]).toBeLessThanOrEqual(255);
		}
	});

	it("does not change pixel array length", () => {
		const pixels = createTestPixels(8, 8);
		const len = pixels.length;
		applyDither(pixels, 8, 8);
		expect(pixels.length).toBe(len);
	});

	it("produces visible changes on gradient image", () => {
		const pixels = createTestPixels(8, 8, (x, y) => [
			Math.floor((x / 8) * 255),
			Math.floor((y / 8) * 255),
			128,
		]);
		const before = new Uint8Array(pixels);
		applyDither(pixels, 8, 8);

		const changed = pixels.some((v, i) => v !== before[i]);
		expect(changed).toBe(true);
	});
});

describe("setTerminalCaps", () => {
	beforeEach(() => {
		resetTerminalDetection();
	});

	it("overrides specific capability values", () => {
		setTerminalCaps({ sixel: true, bestFormat: "sixel", columns: 120 });
		const caps = detectTerminal();
		expect(caps.sixel).toBe(true);
		expect(caps.bestFormat).toBe("sixel");
		expect(caps.columns).toBe(120);
	});

	it("leaves other values with defaults", () => {
		setTerminalCaps({ columns: 100 });
		const caps = detectTerminal();
		expect(caps.columns).toBe(100);
		expect(typeof caps.rows).toBe("number");
	});
});

describe("renderImage with Buffer", () => {
	it("renders a minimal 1×1 PNG buffer as ANSI", async () => {
		const pngBuffer = createMinimalPng(255, 0, 0);
		const result = await renderAnsi(pngBuffer, { width: 1, height: 1 });

		expect(result).toContain("\x1b[38;2;255;0;0m");
	});

	it("renders a 2×2 PNG buffer respecting dimensions", async () => {
		const pngBuffer = createMinimalPng(0, 128, 255);
		const result = await renderAnsi(pngBuffer, { width: 2, height: 1 });

		expect(result).toContain("\x1b[38;2;0;128;255m");
	});

	it("renders a PNG with dithering enabled", async () => {
		const pngBuffer = createMinimalPng(100, 150, 200);
		const result = await renderAnsi(pngBuffer, {
			width: 2,
			height: 1,
			dither: true,
		});

		expect(result).toContain("▀");
	});

	it("handles nonexistent file path gracefully", async () => {
		await expect(renderAnsi("/nonexistent/test.png")).rejects.toThrow();
	});
});
