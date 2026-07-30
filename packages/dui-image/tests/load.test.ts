/**
 * Edge-case tests for `loadPixels` and `nearestNeighborResize`.
 *
 * Focuses on the pure-JS fallback path (PPM/PGM/PBM reading and
 * nearest-neighbor scaling) and error handling when sharp is not
 * available.
 */

import { describe, expect, it, vi } from "vitest";
import {
	hasSharp,
	loadPixels,
	nearestNeighborResize,
} from "../src/index";

/* ── nearestNeighborResize ──────────────────────────────────── */

describe("nearestNeighborResize", () => {
	it("preserves pixel data when src and dst dimensions match", () => {
		const pixels = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]);
		const result = nearestNeighborResize(pixels, 1, 2, 1, 2);
		expect(Array.from(result)).toEqual([255, 0, 0, 255, 0, 255, 0, 255]);
	});

	it("upscales a 1×1 image to 2×2 correctly (each dst pixel samples nearest src pixel)", () => {
		const pixels = new Uint8Array([200, 100, 50, 255]); // 1×1 RGBA
		const result = nearestNeighborResize(pixels, 1, 1, 2, 2);
		expect(result.length).toBe(2 * 2 * 4); // 16 bytes
		// All 4 destination pixels should be identical to the single source
		for (let i = 0; i < 4; i++) {
			const offset = i * 4;
			expect(result[offset]).toBe(200);
			expect(result[offset + 1]).toBe(100);
			expect(result[offset + 2]).toBe(50);
			expect(result[offset + 3]).toBe(255);
		}
	});

	it("downscales a 2×2 image to 1×1", () => {
		// 2×2 RGBA: red, green, blue, white
		const pixels = new Uint8Array([
			255, 0, 0, 255,
			0, 255, 0, 255,
			0, 0, 255, 255,
			255, 255, 255, 255,
		]);
		const result = nearestNeighborResize(pixels, 2, 2, 1, 1);
		expect(result.length).toBe(4); // 1×1 RGBA
		// Nearest neighbor picks (0,0) → red
		expect(result[0]).toBe(255);
		expect(result[1]).toBe(0);
		expect(result[2]).toBe(0);
		expect(result[3]).toBe(255);
	});

	it("handles non-square aspect ratio", () => {
		// 4×1 → 2×1 (reduce width, same height)
		const pixels = new Uint8Array([
			255, 0, 0, 255,
			0, 255, 0, 255,
			0, 0, 255, 255,
			255, 255, 0, 255,
		]);
		const result = nearestNeighborResize(pixels, 4, 1, 2, 1);
		expect(result.length).toBe(2 * 1 * 4); // 8 bytes (2 pixels)
	});

	it("handles 1×1 source to 1×2 (stretch vertically)", () => {
		const pixels = new Uint8Array([128, 64, 32, 255]);
		const result = nearestNeighborResize(pixels, 1, 1, 1, 2);
		expect(result.length).toBe(1 * 2 * 4);

		// Both destination rows should be the same as the source
		expect(result[0]).toBe(128);
		expect(result[4]).toBe(128);
	});

	it("output array has correct dimensions", () => {
		const pixels = new Uint8Array(3 * 3 * 4); // 3×3 RGBA
		const result = nearestNeighborResize(pixels, 3, 3, 5, 5);
		expect(result.length).toBe(5 * 5 * 4);
	});
});

/* ── hasSharp ───────────────────────────────────────────────── */

describe("hasSharp", () => {
	it("returns a boolean", async () => {
		const result = await hasSharp();
		expect(typeof result).toBe("boolean");
	});

	it("is callable multiple times without throwing", async () => {
		await expect(hasSharp()).resolves.toBeTypeOf("boolean");
		await expect(hasSharp()).resolves.toBeTypeOf("boolean");
	});
});

/* ── loadPixels (fallback path) ─────────────────────────────── */

describe("loadPixels fallback", () => {
	it("throws a descriptive error when sharp is not available and file is not PPM/PGM/PBM", async () => {
		// We can't easily mock `sharp` dynamic import in this setup,
		// but we can verify the error message shape by passing a
		// nonexistent path (the fallback will try to read it, fail,
		// and sharp won't be available in the test env for unknown
		// formats — though in CI sharp IS installed).
		//
		// If sharp is installed, this test would go through the sharp
		// path and throw a different error (ENOENT on the file path).
		// We only check that loadPixels doesn't hang and throws
		// something reasonable.
		await expect(
			loadPixels("/nonexistent/test.xyz", 10, 10),
		).rejects.toThrow();
	});

	it("rejects Buffer input when sharp is not available (Buffer bypasses fallback reader)", async () => {
		// When `imagePath` is a Buffer, `tryLoadFallback` returns null
		// (Buffer requires sharp). If sharp is also unavailable, the
		// function should throw the same descriptive error.
		await expect(
			loadPixels(Buffer.from([0, 0, 0]), 1, 1),
		).rejects.toThrow(/sharp|format/i);
	});
});
