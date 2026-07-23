/**
 * ANSI half-block image rendering.
 *
 * Uses the upper-half block character (▀, U+2580) to pack two vertical
 * pixels into one character cell. The foreground 24-bit color sets the
 * upper pixel and the background color sets the lower pixel.
 *
 * This gives 2x vertical resolution compared to naive 1-char-per-pixel
 * approaches, while keeping 1x horizontal resolution.
 */

import { terminalWidth } from "@bdocs/dui";

export interface AnsiImageOptions {
	/** Target width in terminal columns (default: auto from terminal) */
	width?: number;
	/** Target height in terminal rows (default: auto from aspect ratio) */
	height?: number;
	/** Maximum width in columns */
	maxWidth?: number;
	/** Maximum height in rows */
	maxHeight?: number;
	/** Whether to use dithering (default: false) */
	dither?: boolean;
	/** Character to use for half-block rendering (default: "▀") */
	blockChar?: string;
	/** Background color override (default: "#000") */
	bgColor?: string;
}

const HALF_BLOCK = "▀";

/**
 * Convert raw RGBA pixel data to an ANSI half-block string.
 *
 * @param pixels - Flat Uint8Array of RGBA pixel data [R,G,B,A,...]
 * @param imgWidth - Width of the image in pixels
 * @param imgHeight - Height of the image in pixels
 * @param options - Rendering options
 * @returns ANSI-escaped string ready for terminal output
 */
export function pixelsToAnsi(
	pixels: Uint8Array,
	imgWidth: number,
	imgHeight: number,
	options: AnsiImageOptions = {},
): string {
	const { blockChar = HALF_BLOCK, bgColor } = options;
	const maxCols = options.width ?? terminalWidth();
	const maxRows = options.height ?? Math.floor(maxCols * 0.45);

	const finalWidth = options.maxWidth
		? Math.min(maxCols, options.maxWidth)
		: maxCols;
	const finalHeight = options.maxHeight
		? Math.min(maxRows, options.maxHeight)
		: maxRows;

	// Scale pixel coordinates to character grid
	// Each char = 1 column wide, 2 pixels tall (half-block)
	const scaleX = imgWidth / finalWidth;
	const scaleY = imgHeight / (finalHeight * 2);

	const lines: string[] = [];

	for (let row = 0; row < finalHeight; row++) {
		let line = "";
		for (let col = 0; col < finalWidth; col++) {
			// Sample upper pixel
			const pxUpper = samplePixel(
				pixels,
				imgWidth,
				imgHeight,
				col,
				row * 2,
				scaleX,
				scaleY,
			);
			// Sample lower pixel
			const pxLower = samplePixel(
				pixels,
				imgWidth,
				imgHeight,
				col,
				row * 2 + 1,
				scaleX,
				scaleY,
			);

			line += renderBlockPixel(
				pxUpper,
				pxLower,
				blockChar,
				bgColor ? hexToRgb(bgColor) : undefined,
			);
		}
		line += "\x1b[0m";
		lines.push(line);
	}

	return lines.join("\n");
}

interface RgbColor {
	r: number;
	g: number;
	b: number;
}

function samplePixel(
	pixels: Uint8Array,
	imgWidth: number,
	imgHeight: number,
	col: number,
	row: number,
	scaleX: number,
	scaleY: number,
): RgbColor {
	// Map character position to pixel position
	const px = Math.min(Math.floor(col * scaleX), imgWidth - 1);
	const py = Math.min(Math.floor(row * scaleY), imgHeight - 1);
	const idx = (py * imgWidth + px) * 4;

	return {
		r: pixels[idx],
		g: pixels[idx + 1],
		b: pixels[idx + 2],
	};
}

function renderBlockPixel(
	upper: RgbColor,
	lower: RgbColor,
	blockChar: string,
	bgOverride?: RgbColor,
): string {
	const fgSeq = `\x1b[38;2;${upper.r};${upper.g};${upper.b}m`;
	const bg = bgOverride ?? lower;
	const bgSeq = `\x1b[48;2;${bg.r};${bg.g};${bg.b}m`;
	return `${fgSeq}${bgSeq}${blockChar}`;
}

function hexToRgb(hex: string): RgbColor {
	const h = hex.replace(/^#/, "");
	if (h.length === 3) {
		return {
			r: Number.parseInt(h[0] + h[0], 16),
			g: Number.parseInt(h[1] + h[1], 16),
			b: Number.parseInt(h[2] + h[2], 16),
		};
	}
	return {
		r: Number.parseInt(h.slice(0, 2), 16),
		g: Number.parseInt(h.slice(2, 4), 16),
		b: Number.parseInt(h.slice(4, 6), 16),
	};
}

// ── Error Diffusion Dithering (Floyd-Steinberg) ────────────────

/**
 * Apply Floyd-Steinberg dithering to reduce color banding.
 * Modifies the pixel buffer in-place for subsequent half-block rendering.
 */
export function applyDither(
	pixels: Uint8Array,
	width: number,
	height: number,
): void {
	// We simply quantize each pixel to the nearest color in a reduced
	// palette and diffuse the error to neighboring pixels.
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = (y * width + x) * 4;
			const oldR = pixels[idx];
			const oldG = pixels[idx + 1];
			const oldB = pixels[idx + 2];

			// Quantize to nearest 4-bit value (0, 17, 34, ..., 255)
			const newR = Math.round(oldR / 17) * 17;
			const newG = Math.round(oldG / 17) * 17;
			const newB = Math.round(oldB / 17) * 17;

			pixels[idx] = newR;
			pixels[idx + 1] = newG;
			pixels[idx + 2] = newB;

			const errR = oldR - newR;
			const errG = oldG - newG;
			const errB = oldB - newB;

			// Floyd-Steinberg error diffusion
			diffuse(pixels, width, height, x + 1, y, errR, errG, errB, 7 / 16);
			diffuse(pixels, width, height, x - 1, y + 1, errR, errG, errB, 3 / 16);
			diffuse(pixels, width, height, x, y + 1, errR, errG, errB, 5 / 16);
			diffuse(pixels, width, height, x + 1, y + 1, errR, errG, errB, 1 / 16);
		}
	}
}

function diffuse(
	pixels: Uint8Array,
	w: number,
	h: number,
	x: number,
	y: number,
	errR: number,
	errG: number,
	errB: number,
	factor: number,
): void {
	if (x < 0 || x >= w || y < 0 || y >= h) return;
	const idx = (y * w + x) * 4;
	pixels[idx] = clamp255(pixels[idx] + errR * factor);
	pixels[idx + 1] = clamp255(pixels[idx + 1] + errG * factor);
	pixels[idx + 2] = clamp255(pixels[idx + 2] + errB * factor);
}

function clamp255(v: number): number {
	return Math.max(0, Math.min(255, Math.round(v)));
}
