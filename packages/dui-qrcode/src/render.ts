/**
 * Matrix → plain character rows (no ANSI).
 *
 * Separated from SGR wrapping so encoding, geometry, and styling
 * can be reasoned about (and tested) independently.
 */

import type { CellChars } from "./utils";

/** Minimal shape of `qrcode`'s BitMatrix used by the renderer. */
export interface QrBitMatrix {
	size: number;
	get(row: number, col: number): number;
}

/**
 * Map every matrix module to terminal cell characters.
 * Returns one string per matrix row (no trailing newlines, no SGR).
 */
export function renderMatrixRows(
	modules: QrBitMatrix,
	cells: CellChars,
): string[] {
	const { size } = modules;
	const rows: string[] = [];

	for (let y = 0; y < size; y++) {
		let row = "";
		for (let x = 0; x < size; x++) {
			row += modules.get(y, x) === 1 ? cells.dark : cells.light;
		}
		rows.push(row);
	}

	return rows;
}
