/**
 * High-level image rendering functions.
 *
 * Loads images, resizes them, and converts them to terminal output
 * using the best available method: **Kitty graphics protocol** (when
 * supported), with **ANSI half-block fallback** for all other terminals.
 */

import { terminalWidth } from "@bdocs/dui";
import { type AnsiImageOptions, pixelsToAnsi } from "./ansi";
import { detectTerminal } from "./detect";
import {
	renderIterm2,
	renderSixel,
	tmuxPassthrough,
} from "./protocols";
import { loadResizedPixels, resolveDimensions } from "./utils";

// Lazily load sharp so the package works without the native binary
// for formats that don't need PNG encoding (ANSI half-block path).
let _sharp: typeof import("sharp") | null | undefined;
async function getSharp(): Promise<typeof import("sharp") | null> {
	if (_sharp === undefined) {
		try {
			const mod = await import("sharp");
			_sharp = mod.default;
		} catch {
			_sharp = null;
		}
	}
	return _sharp;
}

export interface ImageRenderOptions extends AnsiImageOptions {
	/**
	 * Output format. Default `"auto"` — best available (Kitty, then
	 * Sixel, then iTerm2, then ANSI half-blocks).
	 */
	format?: "ansi" | "kitty" | "sixel" | "iterm2" | "auto";
	/** Whether to auto-detect and use the best available format (default: true). */
	autoFormat?: boolean;
	/**
	 * When running inside tmux, wrap the protocol payload in a DCS
	 * passthrough so the terminal emulator still receives it
	 * (default: true). Disable if your tmux config forwards sequences
	 * another way or you're emitting to a non-tmux-aware pipeline.
	 */
	tmuxPassthrough?: boolean;
	/**
	 * Kitty‑specific: placement column (0‑based). When set, the image
	 * is placed at an absolute screen position instead of inline.
	 */
	placementX?: number;
	/**
	 * Kitty‑specific: placement row (0‑based). When set, the image
	 * is placed at an absolute screen position instead of inline.
	 */
	placementY?: number;
	/**
	 * Kitty‑specific: unique placement id. Allows the terminal to
	 * delete/overlay the image later by referencing this id.
	 */
	placementId?: number;
	/**
	 * Kitty‑specific: compression. `0` = none, `1` = zlib (deflate).
	 * Default `0` (no compression — wider compat).
	 */
	compression?: 0 | 1;
}

/**
 * Render an image file to a terminal string using the best available
 * method.
 *
 * - **Kitty protocol** → pixel‑perfect, full colour, no character
 *   distortion (works in Kitty, WezTerm, foot, etc.)
 * - **ANSI half-block** → works everywhere, 2× vertical resolution
 *   via ▀ blocks and 24‑bit colour
 *
 * @param imagePath - Path to the image file (PNG, JPG, GIF, WebP, etc.)
 * @param options - Rendering options
 * @returns Terminal‑ready string (escape sequences + newlines)
 *
 * @example
 * ```ts
 * const out = await renderImage("logo.png", { width: 40 })
 * process.stdout.write(out)
 * ```
 */
export async function renderImage(
	imagePath: string | Buffer,
	options: ImageRenderOptions = {},
): Promise<string> {
	const {
		format = "auto",
		autoFormat = true,
		placementX,
		placementY,
		placementId,
		compression,
		tmuxPassthrough: useTmux = true,
		...ansiOpts
	} = options;

	const caps = detectTerminal();
	const wrapForTmux = (data: string) =>
		useTmux && format !== "ansi" ? tmuxPassthrough(data) : data;

	const wants = (name: ImageRenderOptions["format"]): boolean =>
		format === name || (format === "auto" && autoFormat && caps[name as "kitty"]);

	if (wants("kitty")) {
		const out = await renderKitty(imagePath, {
			width: ansiOpts.width,
			height: ansiOpts.height,
			placementX,
			placementY,
			placementId,
			compression,
		});
		return wrapForTmux(out);
	}

	if (wants("sixel")) {
		try {
			return wrapForTmux(await renderSixel(imagePath, ansiOpts));
		} catch {
			return renderAnsi(imagePath, ansiOpts);
		}
	}

	if (wants("iterm2")) {
		try {
			return wrapForTmux(await renderIterm2(imagePath, ansiOpts));
		} catch {
			return renderAnsi(imagePath, ansiOpts);
		}
	}

	// ANSI half-block fallback (safe for all terminals)
	return renderAnsi(imagePath, ansiOpts);
}

/**
 * Render an image to ANSI half-block art.
 * Safe for every terminal that supports 24‑bit colour.
 */
export async function renderAnsi(
	imagePath: string | Buffer,
	options: AnsiImageOptions = {},
): Promise<string> {
	const { width, height, dither, ...renderOpts } = options;
	const caps = detectTerminal();
	const dims = resolveDimensions(caps.columns, width, height);

	const { pixels, width: actualWidth, height: actualHeight } =
		await loadResizedPixels(imagePath, dims.width, dims.height * 2, dither);

	return pixelsToAnsi(pixels, actualWidth, actualHeight, {
		...renderOpts,
		width: dims.width,
		height: dims.height,
	});
}

/* ── Kitty Graphics Protocol ─────────────────────────────────── */

export interface KittyRenderOptions {
	/** Target width in terminal columns. Default: min(terminal width, 80). */
	width?: number;
	/** Target height in terminal rows. Default: auto from aspect ratio. */
	height?: number;
	/** Absolute column (0‑based) for screen‑positioned placement. */
	placementX?: number;
	/** Absolute row (0‑based) for screen‑positioned placement. */
	placementY?: number;
	/** Unique placement id for delete/overlay operations. */
	placementId?: number;
	/** Compression: 0 = none (default), 1 = zlib/deflate. */
	compression?: 0 | 1;
}

/**
 * Render an image using the **Kitty graphics protocol**.
 *
 * Encodes the image as PNG (base‑64), splits it into chunks, and
 * wraps each chunk in an APC sequence:
 *
 *   `\x1b_G a=T,f=100,m=1;base64data\x1b\\`
 *   `\x1b_G m=0;base64data\x1b\\`
 *
 * For inline placement (default) the image flows with text. For
 * absolute placement, pass `placementX`/`placementY`.
 *
 * @see https://sw.kovidgoyal.net/kitty/graphics-protocol/
 */
export async function renderKitty(
	imagePath: string | Buffer,
	options: KittyRenderOptions = {},
): Promise<string> {
	const sharp = await getSharp();
	if (!sharp) {
		// Sharp is not available — fall back to ANSI rendering as a
		// PNG-encoded buffer is required for the Kitty protocol.
		return renderAnsi(imagePath, options);
	}

	const img = sharp(imagePath);
	const metadata = await img.metadata();

	// Compute target pixel dimensions (guard against zero-size)
	const terminalCols = terminalWidth();
	const targetWidth = Math.max(1, options.width ?? Math.min(terminalCols, 80));
	const srcW = metadata.width ?? targetWidth;
	const srcH = metadata.height ?? targetWidth;
	const aspect = srcW > 0 ? srcH / srcW : 1;
	// Each terminal row is roughly 2 character cells tall (Kitty uses pixels directly)
	const targetHeight = Math.max(1, options.height ?? Math.floor(targetWidth * aspect * 2));

	// Resize and encode as PNG in‑memory
	const resized = await img
		.resize(targetWidth, targetHeight, {
			fit: "inside",
			withoutEnlargement: true,
		})
		.png()
		.toBuffer();

	const b64 = resized.toString("base64");

	// Build APC header
	//   a    = action: T = transmit (display)
	//   f    = format: 100 = PNG
	//   s,v  = source width/height in pixels (optional, for server‑side scaling)
	//   c,r  = placement column/row (optional, 0‑based)
	//   id   = placement id (optional)
	//   o    = zlib compression flag: z = deflate
	//   m    = more chunks follow
	const params: string[] = ["a=T", "f=100"];
	if (options.placementX !== undefined) params.push(`c=${options.placementX}`);
	if (options.placementY !== undefined) params.push(`r=${options.placementY}`);
	if (options.placementId !== undefined) params.push(`id=${options.placementId}`);

	let payload: string;
	const useCompression = options.compression === 1;

	if (useCompression) {
		// zlib/deflate the base64 string to reduce transfer size
		const { deflateSync } = await import("node:zlib");
		const compressed = deflateSync(resized);
		payload = compressed.toString("base64");
		params.push("o=z");
	} else {
		payload = b64;
	}

	// Chunk the payload — Kitty recommends 4096 bytes per chunk
	const CHUNK_SIZE = 4096;
	const chunks: string[] = [];
	for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
		chunks.push(payload.slice(i, i + CHUNK_SIZE));
	}

	const result: string[] = [];
	for (let i = 0; i < chunks.length; i++) {
		const isLast = i === chunks.length - 1;
		const header = [...params, `m=${isLast ? 0 : 1}`].join(",");
		result.push(`\x1b_G${header};${chunks[i]}\x1b\\`);
	}

	// Add a trailing newline so subsequent terminal output starts on
	// the next line (inline images don't advance the cursor).
	result.push("\n");

	return result.join("");
}

/**
 * Delete a previously‑placed Kitty image by its placement id.
 * Useful for animations and overlays.
 *
 * @param placementId - The id used when placing the image.
 * @returns An escape sequence that deletes the image from the terminal.
 *
 * @example
 * ```ts
 * process.stdout.write(deleteKittyImage(1))
 * ```
 */
export function deleteKittyImage(placementId: number): string {
	return `\x1b_Ga=d,d=i,id=${placementId}\x1b\\`;
}

/**
 * Query the terminal for its Kitty graphics protocol capabilities.
 * Returns a raw escape sequence; read the response from stdin.
 * Only useful in Kitty‑aware terminals.
 *
 * @returns The query escape sequence.
 */
export function queryKittyCapabilities(): string {
	return "\x1b_Ga=q\x1b\\";
}
