/**
 * @dui-toolkit/plugin-qrcode
 *
 * Scannable QR codes for the terminal — matrix encoding via the
 * production-tested `qrcode` package, ANSI rendering via DUI colors
 * with per-line SGR scoping (BCE-safe).
 */

import { colors, toAnsiBg, toAnsiFg } from "@bdocs/dui";
import QRCode from "qrcode";
import { renderMatrixRows } from "./render";
import type { QRCodeRenderOptions } from "./types";
import { formatLabel, resolveCellChars, wrapRowSgr } from "./utils";

export type { QrBitMatrix } from "./render";
export { renderMatrixRows } from "./render";
export type { ErrorCorrectionLevel, QRCodeRenderOptions } from "./types";
export {
	formatLabel,
	LABEL_MAX_LENGTH,
	resolveCellChars,
	wrapRowSgr,
} from "./utils";

/**
 * `QRCode.create` accepts `margin` at runtime, but `@types/qrcode`
 * only declares it on renderer options. Extend creator options without
 * shadowing our own `QRCodeRenderOptions`.
 */
type CreateOptions = Parameters<typeof QRCode.create>[1] & {
	margin?: number;
};

/**
 * Generate a QR code as an ANSI string for terminal display.
 *
 * @param text - Text or URL to encode (must be non-empty)
 * @param options - Rendering options
 * @returns ANSI-escaped string ready for `console.log` or composition
 */
export async function qrcode(
	text: string,
	options: QRCodeRenderOptions = {},
): Promise<string> {
	if (typeof text !== "string" || text.length === 0) {
		throw new Error("No input text provided for QR code generation");
	}

	const {
		width: targetWidth,
		errorCorrection = "M",
		color = "#000000",
		bgColor,
		margin = 2,
		label = true,
		showVersion = false,
	} = options;

	const createOpts = {
		errorCorrectionLevel: errorCorrection,
		margin,
	} satisfies CreateOptions;

	const matrix = await QRCode.create(text, createOpts);
	const modules = matrix.modules;
	const moduleCount = modules.size;

	const cells = resolveCellChars(moduleCount, targetWidth);
	const plainRows = renderMatrixRows(modules, cells);

	// Prefer DUI's color engine (hex / rgb / oklch) over hand-rolled hex parsers.
	const fgSgr = toAnsiFg(color);
	const bgSgr = bgColor !== undefined ? toAnsiBg(bgColor) : "";

	const body = plainRows.map((row) => wrapRowSgr(row, fgSgr, bgSgr)).join("\n");

	const labelText = formatLabel({
		text,
		label,
		showVersion,
		version: matrix.version,
		errorCorrection,
	});

	if (labelText === null) {
		return body;
	}

	// `colors.dim` preserves an active bg; wrapRowSgr still closes with
	// a full reset so the label shares the body bg when `bgColor` is set.
	return `${body}\n${wrapRowSgr(colors.dim(labelText), fgSgr, bgSgr)}`;
}

export { qrcodePlugin } from "./plugin";
/** Re-export the upstream encoder for advanced matrix access. */
export { QRCode };
