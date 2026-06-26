import { colorize } from "@bdocs/dui";
import { clamp, scale } from "./utils";

export interface SparklineOptions {
	width?: number;
	color?: string;
	progress?: number;
}

const BARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

export function sparkline(data: number[], options: SparklineOptions = {}): string {
	if (data.length === 0) return "";

	const { width, color, progress = 1 } = options;

	const p = clamp(progress, 0, 1);
	const plotData = data.map((v) => v * p);
	const min = Math.min(...plotData);
	const max = Math.max(...plotData);
	const range = max - min || 1;

	const step = width ? Math.max(1, Math.floor(data.length / width)) : 1;
	const pts: number[] = [];
	for (let i = 0; i < data.length; i += step) {
		pts.push(plotData[i]);
	}

	const out = pts
		.map((v) => {
			const idx = Math.round(scale(v, min, max, 0, BARS.length - 1));
			return BARS[clamp(idx, 0, BARS.length - 1)];
		})
		.join("");

	return color ? colorize(out, color) : out;
}
