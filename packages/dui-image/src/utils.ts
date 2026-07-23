/**
 * Shared utilities for image processing.
 *
 * Extracts common sharp pipeline patterns and dimension resolution
 * to eliminate duplication between render.ts and gif.ts.
 */

import sharp from "sharp";
import { applyDither } from "./ansi";

export interface ResizedPixels {
	pixels: Uint8Array;
	width: number;
	height: number;
}

/**
 * Resize an image and extract raw RGBA pixels.
 *
 * Shared pipeline: resize → ensureAlpha → raw → toBuffer.
 * Optionally applies Floyd-Steinberg dithering.
 *
 * @param page - Specific page/frame index for multi-page images (e.g. GIFs)
 */
export async function loadResizedPixels(
	imagePath: string | Buffer,
	width: number,
	height: number,
	dither?: boolean,
	page?: number,
): Promise<ResizedPixels> {
	const img =
		page !== undefined ? sharp(imagePath, { page }) : sharp(imagePath);

	const { data, info } = await img
		.resize(width, height, {
			fit: "fill",
			withoutEnlargement: true,
		})
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });

	// Buffer extends Uint8Array — no need to re-wrap, which can
	// cause issues with Node.js pooled shared buffers.
	if (dither) {
		applyDither(data, info.width, info.height);
	}

	return { pixels: data, width: info.width, height: info.height };
}

/**
 * Resolve target display dimensions from options and terminal size.
 *
 * Default: width = min(terminal width, 80), height = width × 0.5
 * (terminal characters are roughly 2:1 height:width ratio).
 */
export function resolveDimensions(
	terminalCols: number,
	width?: number,
	height?: number,
): { width: number; height: number } {
	const targetWidth = width ?? Math.min(terminalCols, 80);
	const targetHeight = height ?? Math.floor(targetWidth * 0.5);
	return { width: targetWidth, height: targetHeight };
}
