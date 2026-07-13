/**
 * @dui-toolkit/plugin-image
 *
 * Terminal image renderer — renderiza imágenes PNG, JPG y GIF
 * en la terminal usando ANSI half-blocks y soporte para animaciones.
 */

// ── ANSI half-block rendering ──────────────────────────────────
export { pixelsToAnsi, applyDither } from "./ansi";
export type { AnsiImageOptions } from "./ansi";

// ── High-level rendering ───────────────────────────────────────
export { renderImage, renderAnsi } from "./render";
export type { ImageRenderOptions } from "./render";

// ── GIF animation ──────────────────────────────────────────────
export { renderGifFrames, animateGif } from "./gif";
export type { GifFrame, GifOptions } from "./gif";

// ── Terminal detection ─────────────────────────────────────────
export {
	detectTerminal,
	resetTerminalDetection,
	setTerminalCaps,
} from "./detect";
export type { TerminalCapabilities } from "./detect";
