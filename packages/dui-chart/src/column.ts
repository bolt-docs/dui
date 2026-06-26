import { colorize, colors } from "@bdocs/dui";
import { clamp, getWidth, repeat, barColor } from "./utils";

export interface ColumnOptions {
	labels?: string[];
	height?: number;
	color?: string;
	progress?: number;
}

export function column(data: number[], options: ColumnOptions = {}): string {
	if (data.length === 0) return "";

	const {
		labels,
		height: preferredHeight,
		color: globalColor,
		progress = 1,
	} = options;

	const p = clamp(progress, 0, 1);
	const max = Math.max(...data);
	const h = preferredHeight ?? Math.min(8, Math.max(4, data.length));
	const colWidth = 4;

	const lines: string[] = [];

	for (let row = 0; row < h; row++) {
		const rowT = 1 - row / h;
		let line = " ";
		for (let i = 0; i < data.length; i++) {
			const current = data[i] * p;
			const colH = max === 0 ? 0 : current / max;
			const filled = colH >= rowT;
			const color = globalColor ?? barColor(i);

			if (filled) {
				line += colorize(repeat("█", colWidth), color);
			} else {
				line += repeat(" ", colWidth);
			}
		}
		lines.push(line);
	}

	if (labels) {
		let labelLine = " ";
		for (const label of labels) {
			labelLine += colors.dim(label.slice(0, colWidth).padStart(colWidth));
		}
		lines.push(labelLine);
	}

	return lines.join("\n");
}
