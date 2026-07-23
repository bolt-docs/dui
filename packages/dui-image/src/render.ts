/**
 * High-level image rendering functions.
 *
 * Loads images using sharp, resizes them, and renders to ANSI strings.
 */

import { terminalWidth } from "@bdocs/dui";
import sharp from "sharp";
import { type AnsiImageOptions, pixelsToAnsi } from "./ansi";
import { detectTerminal } from "./detect";
import { loadResizedPixels, resolveDimensions } from "./utils";

export interface ImageRenderOptions extends AnsiImageOptions {
	/** Output format (default: "auto") */
	format?: "ansi" | "kitty" | "auto";
	/** Whether to auto-detect and use best available format (default: true) */
	autoFormat?: boolean;
}

/**
 * Render an image file to an ANSI string suitable for terminal display.
 *
 * @param imagePath - Path to the image file (PNG, JPG, GIF, WebP, etc.)
 * @param options - Rendering options
 * @returns ANSI-escaped string
 */
export async function renderImage(
	imagePath: string | Buffer,
	options: ImageRenderOptions = {},
): Promise<string> {
	const { format = "auto", ...ansiOpts } = options;

	// Only use Kitty protocol when explicitly requested.
	// Auto-detection is disabled to avoid breaking terminals
	// with raw escape sequences on non-Kitty terminals.
	if (format === "kitty") {
		return renderKitty(imagePath, options);
	}

	// Fall back to ANSI half-block rendering (safe for all terminals)
	return renderAnsi(imagePath, ansiOpts);
}

/**
 * Render an image to ANSI half-block art (always uses ANSI).
 */ export async function renderAnsi(
	imagePath: string | Buffer,
	options: AnsiImageOptions = {},
): Promise<string> {
	const { width, height, dither, ...renderOpts } = options;
	const caps = detectTerminal();
	const dims = resolveDimensions(caps.columns, width, height);

	const {
		pixels,
		width: actualWidth,
		height: actualHeight,
	} = await loadResizedPixels(imagePath, dims.width, dims.height * 2, dither);

	// Use actual sharp output dimensions (withoutEnlargement may prevent
	// full resize, so actualWidth/actualHeight may differ from requested).
	return pixelsToAnsi(pixels, actualWidth, actualHeight, {
		...renderOpts,
		width: dims.width,
		height: dims.height,
	});
}

// ── Kitty Graphics Protocol ────────────────────────────────────

async function renderKitty(
	imagePath: string | Buffer,
	options: ImageRenderOptions = {},
): Promise<string> {
	const img = sharp(imagePath);
	const metadata = await img.metadata();
	const w = options.width ?? Math.min(terminalWidth(), 80);
	const h =
		options.height ??
		Math.floor((w * (metadata.height ?? w)) / (metadata.width ?? w));

	const resized = await img
		.resize(w, h, { fit: "inside", withoutEnlargement: true })
		.png()
		.toBuffer();

	const b64 = resized.toString("base64");
	const chunks = chunkString(b64, 4096);

	let result = `\x1b_Ga=T,f=100,m=1;\x1b\\`;
	for (let i = 0; i < chunks.length; i++) {
		const isLast = i === chunks.length - 1;
		result += `\x1b_Gm=${isLast ? 0 : 1};\x1b\\${chunks[i]}`;
	}
	result += "\n";

	return result;
}

// ── Utilities ──────────────────────────────────────────────────

function chunkString(str: string, size: number): string[] {
	const chunks: string[] = [];
	for (let i = 0; i < str.length; i += size) {
		chunks.push(str.slice(i, i + size));
	}
	return chunks;
}
