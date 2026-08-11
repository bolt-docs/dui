import { colorize, colors, visibleLength } from "@bdocs/dui";
import {
	barColor,
	clamp,
	formatNumber,
	getWidth,
	padEnd,
	repeat,
} from "./utils";

export interface BarOptions {
	labels?: string[];
	title?: string;
	width?: number;
	color?: string;
	progress?: number;
	format?: (n: number) => string;
	/** Lower bound of the value axis. Defaults to `Math.min(0, ...data)` so
	 *  negative data maps from a zero baseline instead of overflowing. */
	min?: number;
	/** Upper bound of the value axis. Defaults to `Math.max(0, ...data)`. */
	max?: number;
}

export function bar(data: number[], options: BarOptions = {}): string {
	if (data.length === 0) return "";

	const {
		labels,
		title,
		width: preferredWidth,
		color: globalColor,
		progress = 1,
		format = formatNumber,
	} = options;

	const p = clamp(progress, 0, 1);
	// Explicit min/max keep mixed-sign data on a fixed axis: a value at
	// `min` renders as an empty bar, one at `max` as a full bar. Values
	// outside the range are clamped instead of overflowing/crashing.
	const min = options.min ?? Math.min(0, ...data);
	const max = options.max ?? Math.max(0, ...data);
	const range = max - min;
	// Cell-aware widths — `String#length` under-counts CJK ideographs
	// (a 2-cell char counts as 1), which would make the label column
	// narrower than it renders and overflow the requested width.
	const maxLabelLen = labels
		? Math.max(...labels.map((l) => visibleLength(l)))
		: 0;

	const valueWidth =
		Math.max(...data.map((v) => visibleLength(format(v)))) + 1;
	// Leave room for the leading space, the space between label and
	// bar, and the space before the value. Clamp the bar to >= 1 so a
	// very wide label/value never forces a negative bar count.
	const available = getWidth(preferredWidth) - maxLabelLen - valueWidth - 3;
	const barWidth = Math.max(available, 1);

	const lines: string[] = [];

	if (title) {
		lines.push(` ${colors.bold(title)}`);
	}

	for (let i = 0; i < data.length; i++) {
		const value = data[i];
		const frac =
			range === 0
				? max === 0
					? 0
					: 1
				: clamp((value - min) / range, 0, 1);
		const fill = Math.round(frac * barWidth * p);
		const color = globalColor ?? barColor(i);

		const label = labels
			? padEnd(labels[i], maxLabelLen)
			: repeat(" ", maxLabelLen);
		const barStr = repeat("█", fill);
		const formatted = format(value);

		lines.push(` ${label} ${colorize(barStr, color)} ${colors.dim(formatted)}`);
	}

	return lines.join("\n");
}
