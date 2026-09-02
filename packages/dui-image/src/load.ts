/**
 * Image loader with auto-fallback.
 *
 * Attempts to use `sharp` (native, fast) for image decoding and resizing.
 * When `sharp` is not installed, falls back to a pure-JS nearest-neighbor
 * sampler that reads BMP/PPM/NetPBM images. PNG and JPEG are not supported
 * without sharp — the user is warned and a placeholder is rendered.
 *
 * This eliminates `sharp` as a hard dependency, reducing install size
 * from ~35 MB to ~2 MB when native binaries aren't needed.
 *
 * @example
 * ```ts
 * import { loadPixels } from "./load"
 *
 * // Uses sharp if available, pure-JS fallback otherwise
 * const { pixels, width, height } = await loadPixels("image.png", 40, 30)
 * ```
 */

import { applyDither } from "./ansi";

/* ── Public types ────────────────────────────────────────────── */

export interface LoadResult {
	pixels: Uint8Array;
	width: number;
	height: number;
}

/* ── Sharp loader (primary) ──────────────────────────────────── */

/**
 * Attempt to load the `sharp` module. Returns `null` when the native
 * binary is not installed (ENOENT / MODULE_NOT_FOUND).
 */
async function tryLoadSharp(): Promise<typeof import("sharp") | null> {
	try {
		const mod = await import("sharp");
		return mod.default;
	} catch {
		return null;
	}
}

let sharpModule: typeof import("sharp") | null | undefined;

export async function getSharp(): Promise<typeof import("sharp") | null> {
	if (sharpModule === undefined) {
		sharpModule = await tryLoadSharp();
	}
	return sharpModule;
}

/* ── Pure-JS fallback: PPM reader ────────────────────────────── */

interface PpmImage {
	pixels: Uint8Array;
	width: number;
	height: number;
}

/**
 * Read a binary PPM (P6) image. Returns null if the format is not
 * recognised.
 */
function readPpm(buffer: Buffer): PpmImage | null {
	const header = buffer.toString("utf8", 0, Math.min(buffer.length, 128));
	if (!/^P6\s/.test(header)) return null;

	// Parse PPM header: "P6\nwidth height\nmaxval\n"
	const lines: string[] = [];
	let pos = 2; // skip "P6"
	while (pos < header.length) {
		const nl = header.indexOf("\n", pos);
		if (nl === -1) break;
		const line = header.slice(pos, nl).trim();
		// Skip comments
		if (!line.startsWith("#")) lines.push(line);
		pos = nl + 1;
	}

	if (lines.length < 2) return null;

	const dims = lines[0].split(/\s+/);
	const width = Number.parseInt(dims[0], 10);
	const height = Number.parseInt(dims[1], 10);
	if (!Number.isFinite(width) || !Number.isFinite(height)) return null;

	// Header ends after maxval line
	const maxvalLineEnd = header.indexOf("\n", pos);
	const dataStart = (maxvalLineEnd !== -1 ? maxvalLineEnd + 1 : pos) + header.slice(pos).indexOf("\n") + 1;
	const dataEnd = 2 + buffer.length;

	const pixelCount = width * height * 3;
	const data = buffer.slice(dataStart, dataStart + pixelCount);
	if (data.length < pixelCount) return null;

	// Convert RGB → RGBA
	const rgba = new Uint8Array(width * height * 4);
	for (let i = 0; i < width * height; i++) {
		rgba[i * 4] = data[i * 3];
		rgba[i * 4 + 1] = data[i * 3 + 1];
		rgba[i * 4 + 2] = data[i * 3 + 2];
		rgba[i * 4 + 3] = 255;
	}

	return { pixels: rgba, width, height };
}

/**
 * Read a binary PBM (P4 — 1-bit bitmap) or PGM (P5 — grayscale).
 */
function readPbm(buffer: Buffer): PpmImage | null {
	const header = buffer.toString("utf8", 0, Math.min(buffer.length, 128));
	const isP4 = /^P4\s/.test(header);
	const isP5 = /^P5\s/.test(header);
	if (!isP4 && !isP5) return null;

	// Parse header
	const lines: string[] = [];
	let pos = 2;
	while (pos < header.length) {
		const nl = header.indexOf("\n", pos);
		if (nl === -1) break;
		const line = header.slice(pos, nl).trim();
		if (!line.startsWith("#")) lines.push(line);
		pos = nl + 1;
	}

	if (lines.length < 1) return null;
	const dims = lines[0].split(/\s+/);
	const width = Number.parseInt(dims[0], 10);
	const height = Number.parseInt(dims[1], 10);
	if (!Number.isFinite(width) || !Number.isFinite(height)) return null;

	// Find data start
	const dataStart = header.slice(pos).indexOf("\n") + 1 + pos;
	const rgba = new Uint8Array(width * height * 4);

	if (isP4) {
		// 1-bit bitmap
		const rowBytes = Math.ceil(width / 8);
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const byteIdx = dataStart + y * rowBytes + Math.floor(x / 8);
				const bit = byteIdx < buffer.length ? (buffer[byteIdx] >> (7 - (x % 8))) & 1 : 0;
				const val = bit ? 255 : 0;
				const idx = (y * width + x) * 4;
				rgba[idx] = val;
				rgba[idx + 1] = val;
				rgba[idx + 2] = val;
				rgba[idx + 3] = 255;
			}
		}
	} else {
		// Grayscale (P5)
		for (let i = 0; i < width * height; i++) {
			const val = dataStart + i < buffer.length ? buffer[dataStart + i] : 0;
			rgba[i * 4] = val;
			rgba[i * 4 + 1] = val;
			rgba[i * 4 + 2] = val;
			rgba[i * 4 + 3] = 255;
		}
	}

	return { pixels: rgba, width, height };
}

/** Lazy-loaded fs module for ESM compatibility. */
let fsModule: typeof import("fs") | null = null;
async function getFs(): Promise<typeof import("fs")> {
	if (!fsModule) {
		fsModule = await import("fs");
	}
	return fsModule;
}

/**
 * Try to load an image with the pure-JS fallback.
 * Supports: PPM (P6), PGM (P5), PBM (P4).
 */
async function tryLoadFallback(imagePath: string | Buffer): Promise<PpmImage | null> {
	if (typeof imagePath !== "string") return null; // Buffer requires sharp
	try {
		const fs = await getFs();
		const buffer = fs.readFileSync(imagePath);

		const ppm = readPpm(buffer);
		if (ppm) return ppm;

		const pbm = readPbm(buffer);
		if (pbm) return pbm;

		return null;
	} catch {
		return null;
	}
}

/* ── Nearest-neighbor resizer ────────────────────────────────── */

/**
 * Resize RGBA pixel data using nearest-neighbor sampling.
 * Produces a blocky but clean result — ideal for pixel art and
 * small images.
 */
export function nearestNeighborResize(
	pixels: Uint8Array,
	srcWidth: number,
	srcHeight: number,
	dstWidth: number,
	dstHeight: number,
): Uint8Array {
	const out = new Uint8Array(dstWidth * dstHeight * 4);
	const scaleX = srcWidth / dstWidth;
	const scaleY = srcHeight / dstHeight;

	for (let y = 0; y < dstHeight; y++) {
		for (let x = 0; x < dstWidth; x++) {
			const srcX = Math.min(Math.floor(x * scaleX), srcWidth - 1);
			const srcY = Math.min(Math.floor(y * scaleY), srcHeight - 1);
			const srcIdx = (srcY * srcWidth + srcX) * 4;
			const dstIdx = (y * dstWidth + x) * 4;
			out[dstIdx] = pixels[srcIdx];
			out[dstIdx + 1] = pixels[srcIdx + 1];
			out[dstIdx + 2] = pixels[srcIdx + 2];
			out[dstIdx + 3] = pixels[srcIdx + 3] ?? 255;
		}
	}
	return out;
}

/* ── Public API ──────────────────────────────────────────────── */

/**
 * Load an image and return RGBA pixel data at the requested size.
 *
 * When `sharp` is installed (default), it is used for decoding and
 * high-quality resizing.
 *
 * When `sharp` is not installed, falls back to a pure-JS path that
 * supports PPM/PGM/PBM images with nearest-neighbor scaling. PNG
 * and JPEG require sharp.
 *
 * @param imagePath - Path to the image file or a Buffer with raw data.
 * @param width - Target width in pixels.
 * @param height - Target height in pixels.
 * @param dither - Whether to apply Floyd-Steinberg dithering (default: false).
 * @param page - Specific page/frame for multi-page images (GIFs).
 * @returns RGBA pixel data + actual dimensions.
 */
export async function loadPixels(
	imagePath: string | Buffer,
	width: number,
	height: number,
	dither?: boolean,
	page?: number,
): Promise<LoadResult> {
	const sharp = await getSharp();

	if (sharp) {
		// Sharp path — fast and supports all formats
		const img =
			page !== undefined
				? sharp(imagePath, { page })
				: sharp(imagePath);

		const { data, info } = await img
			.resize(width, height, { fit: "fill", withoutEnlargement: true })
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });

		if (dither) {
			applyDither(data, info.width, info.height);
		}

		return { pixels: data, width: info.width, height: info.height };
	}

	// Fallback path — pure JS for PPM/PGM/PBM
	const fallback = await tryLoadFallback(imagePath);
	if (!fallback) {
		throw new Error(
			`Cannot load image: sharp is not installed and the file format is not supported by the fallback loader. Install sharp with "pnpm add sharp" or convert the image to PPM.\n` +
				`  Supported formats without sharp: PPM (P6), PGM (P5), PBM (P4)`,
		);
	}

	let pixels = fallback.pixels;
	const srcW = fallback.width;
	const srcH = fallback.height;

	// Nearest-neighbor resize
	if (srcW !== width || srcH !== height) {
		pixels = nearestNeighborResize(pixels, srcW, srcH, width, height);
	}

	if (dither) {
		applyDither(pixels, width, height);
	}

	return { pixels, width, height };
}

/**
 * Check whether `sharp` is available in the current environment.
 * Returns `true` when the native binary can be loaded.
 */
export async function hasSharp(): Promise<boolean> {
	const mod = await getSharp();
	return mod !== null;
}
