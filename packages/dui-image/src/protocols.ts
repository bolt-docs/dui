/**
 * Extended image protocols for `@dui-toolkit/plugin-image`:
 *
 * - **Sixel** (`ESC P q … ESC \`) — the oldest bitmap protocol, widely
 *   supported by terminal emulators (mlterm, foot, WezTerm with
 *   `sixel=yes`, Windows Terminal, mintty, xterm with sixel patch…).
 *   Pixels are encoded 6 rows per sixel line.
 * - **iTerm2 inline images** (`ESC ]1337;File=… BEL`) — used by
 *   iTerm2 and terminals that mirror its protocol.
 * - **tmux passthrough** — when running inside tmux, the tmux server
 *   swallows raw DCS/APC sequences. Wrapping them in a DCS passthrough
 *   (`ESC P tmux; ESC … ESC \`) forwards the bytes to the outer
 *   terminal so Kitty/Sixel images keep working.
 */

import { terminalWidth } from "@bdocs/dui";
import type { AnsiImageOptions } from "./ansi";
import { detectTerminal } from "./detect";
import { loadResizedPixels, resolveDimensions } from "./utils";

/* ── tmux passthrough ────────────────────────────────────────── */

/** `true` when the current process is running inside tmux. */
export function isTmux(): boolean {
	return typeof process !== "undefined" && !!process.env.TMUX;
}

/**
 * Wrap a raw escape-sequence payload in a tmux DCS passthrough so the
 * tmux server forwards it untouched to the outer terminal:
 *
 *   `ESC P tmux; ESC <payload with doubled ESC> ESC \`
 *
 * Without this, tmux intercepts DCS (Sixel), APC (Kitty) and OSC
 * sequences that are meant for the terminal emulator.
 */
export function tmuxPassthrough(data: string): string {
	return `\x1bPtmux;\x1b${data.replace(/\x1b/g, "\x1b\x1b")}\x1b\\`;
}

/* ── Sixel ───────────────────────────────────────────────────── */

export interface SixelRenderOptions {
	/** Target width in terminal columns (default: min(terminal, 80)). */
	width?: number;
	/** Target height in terminal rows (each row = 6 pixel rows). */
	height?: number;
	/** Cap on width in columns. */
	maxWidth?: number;
	/** Cap on height in rows. */
	maxHeight?: number;
	/** Apply Floyd-Steinberg dithering before quantization (default false). */
	dither?: boolean;
	/**
	 * Maximum palette entries after color quantization.
	 * @default 256
	 */
	maxColors?: number;
}

/**
 * Quantize raw RGBA pixels into a Sixel payload (`#defs` + bands).
 *
 * The payload is the body between `ESC P q` and `ESC \`; wrap it with
 * `wrapSixel()` for terminal output. Layout per 6-row band: for every
 * color used in the band emit `#<index>` followed by one sixel
 * character per column (bitmask of the rows holding that color), then
 * `$` to return to column 0; after the band emit `-` to advance one
 * sixel line.
 */
export function pixelsToSixel(
	pixels: Uint8Array,
	imgWidth: number,
	imgHeight: number,
	options: { maxColors?: number } = {},
): string {
	const maxColors = Math.max(2, options.maxColors ?? 256);
	const palette = new Map<string, number>();
	const colors: Array<[number, number, number]> = [];

	const colorIndex = (r: number, g: number, b: number): number => {
		// Quantize only the dedup KEY (6 bits per channel keeps the
		// palette small); the emitted definition keeps the original
		// values so pure colours map exactly.
		const qr = r & 0xfc;
		const qg = g & 0xfc;
		const qb = b & 0xfc;
		const key = `${qr},${qg},${qb}`;
		let idx = palette.get(key);
		if (idx === undefined) {
			if (colors.length >= maxColors) {
				idx = 0; // palette full — reuse index 0
			} else {
				idx = colors.length;
				colors.push([r, g, b]);
				palette.set(key, idx);
			}
		}
		return idx;
	};

	const toPct = (v: number) => Math.round((v / 255) * 100);

	const BAND = 6;
	let body = "";
	for (let bandStart = 0; bandStart < imgHeight; bandStart += BAND) {
		// mask[colorIdx][x] = bitmask of rows in this band with that color
		const masks = new Map<number, Uint8Array>();
		const bandRows = Math.min(BAND, imgHeight - bandStart);
		for (let y = 0; y < bandRows; y++) {
			for (let x = 0; x < imgWidth; x++) {
				const idx = ((bandStart + y) * imgWidth + x) * 4;
				const ci = colorIndex(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
				let mask = masks.get(ci);
				if (!mask) {
					mask = new Uint8Array(imgWidth);
					masks.set(ci, mask);
				}
				mask[x] |= 1 << y;
			}
		}
		// Stable order keeps output deterministic.
		const order = Array.from(masks.keys()).sort((a, b) => a - b);
		for (const ci of order) {
			body += `#${ci}`;
			const mask = masks.get(ci)!;
			for (let x = 0; x < imgWidth; x++) {
				body += String.fromCharCode(0x3f + mask[x]);
			}
			body += "$";
		}
		body += "-";
	}

	// Colour definitions must be discovered from the pixel data first,
	// so build them after the bands (all colours are known by then) and
	// prepend them to the body.
	let defs = "";
	for (let i = 0; i < colors.length; i++) {
		const [r, g, b] = colors[i];
		defs += `#${i};2;${toPct(r)};${toPct(g)};${toPct(b)}`;
	}

	return `${defs}${body}`;
}

/** Wrap a Sixel payload in the full `ESC P q … ESC \` sequence. */
export function wrapSixel(payload: string): string {
	return `\x1bPq${payload}\x1b\\\n`;
}

/**
 * Render an image file as Sixel. Falls back to ANSI half-blocks when
 * the image can't be loaded (mirrors `renderKitty`'s behaviour).
 */
export async function renderSixel(
	imagePath: string | Buffer,
	options: SixelRenderOptions = {},
): Promise<string> {
	const caps = detectTerminal();
	const dims = resolveDimensions(caps.columns, options.width, options.height);
	const cols = options.maxWidth ? Math.min(dims.width, options.maxWidth) : dims.width;
	const rows = options.maxHeight
		? Math.min(dims.height, options.maxHeight)
		: dims.height;
	// Load errors (missing sharp, bad file) propagate — callers that
	// want a graceful degradation fall back to ANSI rendering.
	const { pixels, width, height } = await loadResizedPixels(
		imagePath,
		cols,
		rows * 6,
		options.dither,
	);
	const payload = pixelsToSixel(pixels, width, height, {
		maxColors: options.maxColors,
	});
	return wrapSixel(payload);
}

/* ── iTerm2 inline images ────────────────────────────────────── */

export interface Iterm2RenderOptions extends AnsiImageOptions {
	/** Inline (in-flow) placement. @default true */
	inline?: boolean;
	/** Explicit file name for the terminal's image cache. */
	name?: string;
}

/**
 * Render an image using the iTerm2 inline-image protocol:
 *
 *   `ESC ]1337;File=inline=1;width=N;height=N;preserveAspectRatio=1:base64 BEL`
 *
 * Sizes are in pixels; the default target derives a sensible pixel
 * width from the terminal width (~8 px per column) and preserves the
 * source aspect ratio.
 */
export async function renderIterm2(
	imagePath: string | Buffer,
	options: Iterm2RenderOptions = {},
): Promise<string> {
	let sharp: typeof import("sharp") | null = null;
	try {
		const mod = await import("sharp");
		sharp = mod.default;
	} catch {
		sharp = null;
	}
	if (!sharp) {
		throw new Error("sharp is required for iTerm2 rendering");
	}

	const img = sharp(imagePath);
	const metadata = await img.metadata();
	const srcW = metadata.width ?? 1;
	const srcH = metadata.height ?? 1;
	const targetWidth =
		options.width ?? Math.min(Math.max(1, terminalWidth()) * 8, 1280);
	const targetHeight = options.height ?? Math.round(targetWidth * (srcH / srcW));

	const resized = await img
		.resize(targetWidth, targetHeight, {
			fit: "inside",
			withoutEnlargement: true,
		})
		.png()
		.toBuffer();

	const b64 = resized.toString("base64");
	const inline = options.inline ?? true;
	const args = [
		`inline=${inline ? 1 : 0}`,
		`width=${targetWidth}`,
		`height=${targetHeight}`,
		"preserveAspectRatio=1",
	];
	const name = options.name
		? `;name=${encodeURIComponent(options.name)}`
		: "";
	return `\x1b]1337;File=${args.join(";")}${name}:${b64}\x07\n`;
}
