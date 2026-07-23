/**
 * Animated GIF support for terminal rendering.
 *
 * Extracts frames from GIF using sharp, renders each to ANSI,
 * and provides utilities for animated display via frame cycling.
 */

import { terminalWidth } from "@bdocs/dui";
import sharp from "sharp";
import { type AnsiImageOptions, pixelsToAnsi } from "./ansi";
import { loadResizedPixels, resolveDimensions } from "./utils";

export interface GifFrame {
	/** ANSI-rendered string for this frame */
	ansi: string;
	/** Frame delay in milliseconds */
	delay: number;
	/** Width in terminal columns */
	width: number;
	/** Height in terminal rows */
	height: number;
}

export interface GifOptions extends AnsiImageOptions {
	/** Maximum number of frames to extract (default: all) */
	maxFrames?: number;
	/** Scale factor for frame delays (default: 1) */
	delayScale?: number;
}

/**
 * Extract frames from a GIF and render each to ANSI half-block art.
 *
 * @param gifPath - Path to the GIF file or Buffer
 * @param options - Rendering options
 * @returns Array of rendered frames
 */ export async function renderGifFrames(
	gifPath: string | Buffer,
	options: GifOptions = {},
): Promise<GifFrame[]> {
	const { maxFrames, delayScale = 1, dither, ...ansiOpts } = options;

	const metadata = await sharp(gifPath).metadata();
	const pages = metadata.pages ?? 1;
	const totalFrames = maxFrames ? Math.min(pages, maxFrames) : pages;

	const dims = resolveDimensions(
		terminalWidth(),
		options.width,
		options.height,
	);
	const delays = extractDelays(metadata, pages);

	const frames: Promise<GifFrame>[] = [];

	for (let page = 0; page < totalFrames; page++) {
		frames.push(
			loadResizedPixels(
				gifPath,
				dims.width,
				dims.height * 2,
				dither,
				page,
			).then(({ pixels, width: actualWidth, height: actualHeight }) => ({
				ansi: pixelsToAnsi(pixels, actualWidth, actualHeight, {
					...ansiOpts,
					width: dims.width,
					height: dims.height,
				}),
				delay: Math.round((delays[page] ?? 100) * delayScale),
				width: dims.width,
				height: dims.height,
			})),
		);
	}

	return Promise.all(frames);
}

/**
 * Extract frame delays from GIF metadata.
 * sharp exposes page delay via `metadata.delay` (array of centiseconds).
 */
function extractDelays(metadata: sharp.Metadata, pages: number): number[] {
	if (metadata.delay && Array.isArray(metadata.delay)) {
		return metadata.delay.map((d: number) => d * 10); // centiseconds → ms
	}
	return Array(pages).fill(100); // default 100ms
}

/**
 * Animate GIF frames by cycling through them with proper timing.
 *
 * Returns an async generator that yields ANSI strings at the correct
 * frame interval. Each yielded string includes escape codes to
 * overwrite the previous frame in-place.
 *
 * @example
 * ```ts
 * for await (const frame of animateGif("animation.gif")) {
 *   renderLine(frame);
 * }
 * ```
 */
export async function* animateGif(
	gifPath: string | Buffer,
	options: GifOptions = {},
): AsyncGenerator<string> {
	const frames = await renderGifFrames(gifPath, options);

	if (frames.length === 0) return;

	const cursorUp = `\x1b[${frames[0].height}A`;

	while (true) {
		for (let i = 0; i < frames.length; i++) {
			const frame = frames[i];
			const output = i === 0 ? frame.ansi : `${cursorUp}${frame.ansi}`;
			yield output;
			await sleep(frame.delay);
		}
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
