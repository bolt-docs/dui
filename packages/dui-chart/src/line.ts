import { colorize, colors } from "@bdocs/dui";
import { clamp, scale } from "./utils";

export interface LineOptions {
	labels?: string[];
	width?: number;
	height?: number;
	color?: string;
	fill?: boolean;
	progress?: number;
}

function catmullRom(
	p0: number,
	p1: number,
	p2: number,
	p3: number,
	t: number,
): number {
	const t2 = t * t;
	const t3 = t2 * t;
	return 0.5 * (
		(2 * p1) +
		(-p0 + p2) * t +
		(2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
		(-p0 + 3 * p1 - 3 * p2 + p3) * t3
	);
}

function interpolateSpline(data: number[], targetLen: number): number[] {
	if (data.length <= 2) {
		const result: number[] = [];
		for (let i = 0; i < targetLen; i++) {
			const t = targetLen <= 1 ? 0 : i / (targetLen - 1);
			const idx = t * (data.length - 1);
			const lo = Math.floor(idx);
			const hi = Math.min(lo + 1, data.length - 1);
			const frac = idx - lo;
			result.push(data[lo] + (data[hi] - data[lo]) * frac);
		}
		return result;
	}

	const result: number[] = [];
	for (let i = 0; i < targetLen; i++) {
		const t = targetLen <= 1 ? 0 : i / (targetLen - 1);
		const idx = t * (data.length - 1);
		const i0 = Math.max(0, Math.floor(idx) - 1);
		const i1 = Math.min(data.length - 1, Math.max(0, Math.floor(idx)));
		const i2 = Math.min(data.length - 1, i1 + 1);
		const i3 = Math.min(data.length - 1, i2 + 1);
		const frac = idx - Math.floor(idx);
		result.push(catmullRom(data[i0], data[i1], data[i2], data[i3], frac));
	}
	return result;
}

const BRAILLE_BITS = [
	[0x01, 0x08], // row 0: top
	[0x02, 0x10], // row 1: mid-top
	[0x04, 0x20], // row 2: mid-bottom
	[0x40, 0x80], // row 3: bottom
];

function brailleFromGrid(
	grid: boolean[][],
	charCol: number,
	charRow: number,
): string {
	let code = 0x2800;
	const pixelCol = charCol * 2;
	const pixelRow = charRow * 4;
	for (let r = 0; r < 4; r++) {
		for (let c = 0; c < 2; c++) {
			const gc = pixelCol + c;
			const gr = pixelRow + r;
			if (gr < grid.length && gc < grid[gr].length && grid[gr][gc]) {
				code |= BRAILLE_BITS[r][c];
			}
		}
	}
	return String.fromCharCode(code);
}

export function line(data: number[], options: LineOptions = {}): string {
	if (data.length < 2) return data.map(String).join("\n") || "";

	const {
		labels,
		width: preferredWidth,
		height: preferredHeight,
		color = "#00d4aa",
		fill: filled = false,
		progress = 1,
	} = options;

	const p = clamp(progress, 0, 1);
	const plotData = data.map((v) => v * p);

	const cols = preferredWidth ?? Math.min(50, plotData.length * 2);
	const rows = preferredHeight ?? 8;

	if (filled) {
		const halfRows = rows * 2;
		const interp = interpolateSpline(plotData, cols);
		const min = Math.min(...interp);
		const max = Math.max(...interp);
		const range = max - min || 1;

		const grid: boolean[][] = Array.from({ length: halfRows }, () =>
			Array(cols).fill(false),
		);

		for (let c = 0; c < cols; c++) {
			const y = Math.round(((interp[c] - min) / range) * (halfRows - 1));
			grid[halfRows - 1 - y][c] = true;
		}

		const out: string[] = [];
		for (let r = 0; r < rows; r++) {
			const top = r * 2;
			const bot = top + 1;
			let line = "  ";
			for (let c = 0; c < cols; c++) {
				const hasTop = grid[top]?.[c] ?? false;
				const hasBot = bot < halfRows && (grid[bot]?.[c] ?? false);

				if (hasTop && hasBot) {
					line += colorize("█", color);
				} else if (hasTop) {
					line += colorize("▀", color);
				} else if (hasBot) {
					line += colorize("▄", color);
				} else {
					let fillBelow = false;
					for (let rr = bot + 1; rr < halfRows; rr++) {
						if (grid[rr]?.[c]) { fillBelow = true; break; }
					}
					line += fillBelow ? colorize("█", color) : " ";
				}
			}
			out.push(line);
		}

		if (labels?.length) out.push(...makeLabels(labels, cols));
		return out.join("\n");
	}

	const brailleCols = Math.max(2, cols);
	const pixelCols = brailleCols * 2;
	const pixelRows = rows * 4;
	const interp = interpolateSpline(plotData, pixelCols);
	const min = Math.min(...interp);
	const max = Math.max(...interp);
	const range = max - min || 1;

	const grid: boolean[][] = Array.from({ length: pixelRows }, () =>
		Array(pixelCols).fill(false),
	);

	for (let c = 0; c < pixelCols; c++) {
		const y = Math.round(((interp[c] - min) / range) * (pixelRows - 1));
		grid[pixelRows - 1 - y][c] = true;
	}

	for (let c = 1; c < pixelCols; c++) {
		const y0 = grid.findIndex((row) => row[c - 1]);
		const y1 = grid.findIndex((row) => row[c]);
		if (y0 === -1 || y1 === -1) continue;
		if (y0 === y1) continue;
		const step = y0 < y1 ? 1 : -1;
		for (let y = y0 + step; y !== y1; y += step) {
			if (y >= 0 && y < pixelRows) grid[y][c] = true;
		}
	}

	const out: string[] = [];
	for (let r = 0; r < rows; r++) {
		let line = "  ";
		for (let c = 0; c < brailleCols; c++) {
			line += brailleFromGrid(grid, c, r);
		}
		out.push(colorize(line, color));
	}

	if (labels?.length) out.push(...makeLabels(labels, brailleCols));
	return out.join("\n");
}

function makeLabels(labels: string[], cols: number): string[] {
	if (labels.length === 0) return [];
	const step = Math.max(1, Math.floor(cols / labels.length));
	let line = "  ";
	for (let i = 0; i < labels.length; i++) {
		const col = Math.min(i * step, cols - 1);
		const label = labels[i].slice(0, Math.max(2, step));
		if (i === 0) {
			line += colors.dim(label.padEnd(2));
		} else {
			const pos = col - (line.length - 2);
			if (pos > 1) line += " ".repeat(pos - 1);
			line += colors.dim(label);
		}
	}
	return line.length > 2 ? [line] : [];
}
