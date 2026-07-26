/**
 * Column-based layout primitive.
 *
 * Renders multiple text columns side-by-side on the same set of output rows.
 * Each column independently wraps its content via `wrapAnsiWord` to honor
 * its allocated width. The resulting column lines are then zipped together
 * by row index — every output row draws line `i` of every column with the
 * configured `gap` between them; shorter columns pad to the max height.
 *
 * The algorithm is intentionally simple: terminals are 1D, so a real
 * two-column grid is approximated by horizontal slicing of independently
 * wrapped column bodies. This matches idiomatic CLI tools like `column -t`
 * or `tidy` and keeps the implementation dependency-free.
 *
 * Width allocation:
 *  - `width: number`  → fixed pixel width for that column.
 *  - `width: "1fr"`   → flex unit; remaining space is distributed in the
 *                       ratio of fr units across the flex columns.
 *  - `width: undefined` → behaves like `"1fr"` sharing with other auto cols.
 *
 * @example
 * grid({ columns: 2, width: 60 });
 * grid({
 *   width: 60,
 *   columns: [
 *     { content: "left cell", width: "1fr", align: "left" },
 *     { content: "right cell", width: "1fr", align: "right" },
 *   ],
 * });
 */
import { terminalWidth, visibleLength, wrapAnsiWord } from "./utils";

export interface GridColumn {
	content: string | string[];
	/** Fixed width in characters, or flex units `"1fr"`, `"2fr"`, etc. */
	width?: number | `${number}fr`;
	align?: "left" | "center" | "right";
}

export interface GridOptions {
	columns: number | GridColumn[];
	/**
	 * Total layout width; defaults to `min(terminalWidth(), 80)`.
	 * Must be at least `gap * (N-1) + N` (one cell per column +
	 * inter-column gaps) or the grid renders empty.
	 */
	width?: number;
	/** Horizontal gap (in spaces) between columns. Default `2`. */
	gap?: number;
	/**
	 * Optional minimum width in cells for flex/auto columns. When set,
	 * each non-fixed column gets at least `minCellWidth` cells before
	 * the round-robin remainder distribution. Default `1`.
	 */
	minCellWidth?: number;
}

function pickAlign(
	line: string,
	width: number,
	align: "left" | "center" | "right",
): string {
	const len = visibleLength(line);
	if (len >= width) return line;
	const pad = width - len;
	if (align === "right") return " ".repeat(pad) + line;
	if (align === "center") {
		return (
			" ".repeat(Math.floor(pad / 2)) +
			line +
			" ".repeat(Math.ceil(pad / 2))
		);
	}
	return line + " ".repeat(pad);
}

function parseFr(width: string | undefined): number | null {
	if (typeof width !== "string" || !width.endsWith("fr")) return null;
	const n = Number(width.slice(0, -2));
	return Number.isFinite(n) && n > 0 ? n : null;
}

export function grid(opts: GridOptions): string {
	const totalW = opts.width ?? Math.min(terminalWidth(), 80);
	const gap = opts.gap ?? 2;
	const minCell = opts.minCellWidth ?? 1;

	if (totalW <= 0) return "";

	const cols: GridColumn[] = Array.isArray(opts.columns)
		? opts.columns.map((c) =>
				typeof c === "string" ? { content: c } : c,
			)
		: Array.from({ length: opts.columns }, () => ({ content: "" }));

	if (cols.length === 0) return "";

	const totalGap = gap * Math.max(0, cols.length - 1);
	if (totalGap >= totalW) {
		// No room for any column body — render empty lines to preserve row
		// count for callers composing multiple grids vertically.
		return "";
	}

	// 1. Sum fixed widths and gather flex / auto groups in declaration order.
	let fixedSum = 0;
	const fixedCount = cols.filter((c) => typeof c.width === "number").length;
	const flexUnits: number[] = cols.map((c) => {
		if (typeof c.width === "number") {
			fixedSum += c.width;
			return -1;
		}
		const fr = parseFr(c.width);
		if (fr !== null) return fr;
		// Treat explicit `"1fr"` and `undefined` identically — but a literal
		// `"0fr"` is invalid so we already normalized `fr !== null` here.
		return 1;
	});
	const flexTotal = flexUnits.reduce(
		(sum, units, idx) => (units > 0 ? sum + units : sum),
		0,
	);
	const autoCount = cols.reduce(
		(sum, c, idx) => (flexUnits[idx] > 0 ? sum + 1 : sum),
		0,
	);

	const remaining = totalW - fixedSum - totalGap;

	// 2. Allocate final widths — floor division for each flex / auto
	// column, then clamp to `minCell`, then ROUND-ROBIN distribute
	// the remainder so total `width - gap` cells land exactly across
	// flex / auto columns.  `minCell` default = 1.
	const floorWidths: number[] = cols.map((c) => {
		if (typeof c.width === "number") return c.width;
		const fr = parseFr(c.width);
		if (flexTotal > 0) {
			if (fr !== null) {
				return Math.max(minCell, Math.floor((fr / flexTotal) * remaining));
			}
			// undefined → share equally with sibling auto columns.
			return Math.max(minCell, Math.floor(remaining / autoCount));
		}
		return Math.max(minCell, Math.floor(remaining / autoCount));
	});

	// Round-robin give the "lost 1 cell per `Math.floor`" pixels back
	// to flex / auto columns in declaration order so the final column
	// widths sum to exactly `fixedSum + remaining` (= `width - gap`).
	// Fixed-width columns are skipped so their declared `width` is
	// always honored verbatim.
	const flexIndices: number[] = [];
	cols.forEach((c, i) => {
		if (typeof c.width !== "number") flexIndices.push(i);
	});
	const target = fixedSum + remaining;
	const actual = floorWidths.reduce((sum, w) => sum + w, 0);
	let remainder = Math.max(0, target - actual);
	let rx = 0;
	while (remainder > 0 && flexIndices.length > 0) {
		floorWidths[flexIndices[rx % flexIndices.length]]++;
		remainder--;
		rx++;
	}

	const finalWidths = floorWidths;

	// 3. Wrap each column independently.
	const colLines: string[][] = cols.map((col, idx) => {
		const text = Array.isArray(col.content)
			? col.content.join("\n")
			: col.content ?? "";
		return wrapAnsiWord(text, finalWidths[idx]);
	});

	const maxLines = Math.max(1, ...colLines.map((lines) => lines.length));

	// 4. Zip by row index — every output row draws line `i` of every column.
	const gapStr = " ".repeat(gap);
	const rows: string[] = [];
	for (let i = 0; i < maxLines; i++) {
		const parts: string[] = [];
		for (let j = 0; j < colLines.length; j++) {
			const line = colLines[j][i] ?? "";
			parts.push(pickAlign(line, finalWidths[j], cols[j].align ?? "left"));
		}
		rows.push(parts.join(gapStr));
	}

	return rows.join("\n");
}
