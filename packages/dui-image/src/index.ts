/**
 * @dui-toolkit/plugin-image
 *
 * Terminal image renderer — renderiza imágenes PNG, JPG y GIF
 * en la terminal usando ANSI half-blocks y soporte para animaciones.
 */

export type { AnsiImageOptions } from "./ansi";
// ── ANSI half-block rendering ──────────────────────────────────
export { applyDither, pixelsToAnsi } from "./ansi";
export type { TerminalCapabilities } from "./detect";
// ── Terminal detection ─────────────────────────────────────────
export {
	detectTerminal,
	resetTerminalDetection,
	setTerminalCaps,
} from "./detect";
export type { GifFrame, GifOptions } from "./gif";
// ── GIF animation ──────────────────────────────────────────────
export { animateGif, renderGifFrames } from "./gif";
export { imagePlugin } from "./plugin";
export type { ImageRenderOptions } from "./render";
// ── High-level rendering ───────────────────────────────────────
export { renderAnsi, renderImage } from "./render";
