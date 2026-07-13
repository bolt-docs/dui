/**
 * Test helpers for dui-image.
 *
 * Provides utilities for creating test pixel data and minimal PNG buffers
 * so that image.test.ts stays focused on behavior.
 */

import { deflateSync } from "node:zlib";

/**
 * Create a flat RGBA Uint8Array for test images.
 *
 * @param width  - Pixel width
 * @param height - Pixel height
 * @param fill   - Optional per-pixel fill function (x, y) → [r, g, b]
 * @returns RGBA buffer (alpha always 255)
 */
export function createTestPixels(
	width: number,
	height: number,
	fill?: (x: number, y: number) => [number, number, number],
): Uint8Array {
	const pixels = new Uint8Array(width * height * 4);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = (y * width + x) * 4;
			if (fill) {
				const [r, g, b] = fill(x, y);
				pixels[idx] = r;
				pixels[idx + 1] = g;
				pixels[idx + 2] = b;
			} else {
				pixels[idx] = 255;
				pixels[idx + 1] = 0;
				pixels[idx + 2] = 0;
			}
			pixels[idx + 3] = 255;
		}
	}
	return pixels;
}

/**
 * Strip ANSI escape sequences from a string.
 */
export function stripAnsi(s: string): string {
	return s.replace(/\x1b\[[0-9;]*m/g, "").replace(/\x1b\[0m/g, "");
}

/**
 * Create a minimal valid PNG of a single color.
 * Uses minimal PNG spec: PNG signature + IHDR + IDAT + IEND.
 */
export function createMinimalPng(
	r: number,
	g: number,
	b: number,
	w = 1,
	h = 1,
): Buffer {
	// PNG signature (8 bytes)
	const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

	// IHDR chunk
	const ihdrData = Buffer.alloc(13);
	ihdrData.writeUInt32BE(w, 0);
	ihdrData.writeUInt32BE(h, 4);
	ihdrData[8] = 8; // bit depth
	ihdrData[9] = 2; // color type RGB
	ihdrData[10] = 0; // compression
	ihdrData[11] = 0; // filter
	ihdrData[12] = 0; // interlace
	const ihdr = createPngChunk("IHDR", ihdrData);

	// IDAT chunk — compressed raw pixel data
	const rawData = Buffer.alloc(h * (1 + w * 3));
	for (let y = 0; y < h; y++) {
		const offset = y * (1 + w * 3);
		rawData[offset] = 0; // filter byte (none)
		for (let x = 0; x < w; x++) {
			rawData[offset + 1 + x * 3] = r;
			rawData[offset + 2 + x * 3] = g;
			rawData[offset + 3 + x * 3] = b;
		}
	}
	const idat = createPngChunk("IDAT", deflateSync(rawData));

	// IEND chunk
	const iend = createPngChunk("IEND", Buffer.alloc(0));

	return Buffer.concat([signature, ihdr, idat, iend]);
}

function createPngChunk(type: string, data: Buffer): Buffer {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length, 0);
	const typeBuffer = Buffer.from(type, "ascii");
	const crcData = Buffer.concat([typeBuffer, data]);

	// CRC-32
	let crc = 0xffffffff;
	for (let i = 0; i < crcData.length; i++) {
		crc ^= crcData[i];
		for (let j = 0; j < 8; j++) {
			crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
		}
	}
	crc = (crc ^ 0xffffffff) >>> 0;
	const crcBuffer = Buffer.alloc(4);
	crcBuffer.writeUInt32BE(crc, 0);

	return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}
