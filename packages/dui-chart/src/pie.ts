import { colorize, colors } from "@bdocs/dui";
import { barColor, clamp, padEnd } from "./utils";

export interface PieSlice {
	label: string;
	value: number;
}

export interface PieOptions {
	width?: number;
	progress?: number;
}

export function pie(data: PieSlice[], options: PieOptions = {}): string {
	if (data.length === 0) return "";

	const { progress = 1 } = options;
	const p = clamp(progress, 0, 1);

	const total = data.reduce((sum, s) => sum + s.value, 0);
	if (total === 0) return "";

	const lines: string[] = [];
	const barW = 24;
	const maxLabelLen = Math.max(...data.map((s) => s.label.length));

	let drawn = 0;
	for (let i = 0; i < data.length; i++) {
		const slice = data[i];
		const currentTotal = total * p;
		const currentSlice = slice.value * p;
		const pct = currentTotal > 0 ? (currentSlice / currentTotal) * 100 : 0;
		const fill = Math.round((slice.value / total) * barW);

		const color = barColor(i);
		const barStr = colorize("█".repeat(fill), color);
		const label = padEnd(slice.label, maxLabelLen);
		const pctStr = `${pct.toFixed(1)}%`;

		lines.push(` ${barStr} ${label} ${colors.dim(pctStr)}`);
		drawn += fill;
	}

	return lines.join("\n");
}
