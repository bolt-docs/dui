import { colorize, colors } from "@bdocs/dui";
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
	const max = Math.max(...data);
	const maxLabelLen = labels ? Math.max(...labels.map((l) => l.length)) : 0;

	const valueWidth = Math.max(...data.map((v) => format(v).length)) + 1;
	const available = getWidth(preferredWidth) - maxLabelLen - valueWidth - 4;
	const barWidth = Math.max(available, 4);

	const lines: string[] = [];

	if (title) {
		lines.push(` ${colors.bold(title)}`);
	}

	for (let i = 0; i < data.length; i++) {
		const current = data[i] * p;
		const fill = max === 0 ? 0 : Math.round((current / max) * barWidth);
		const color = globalColor ?? barColor(i);

		const label = labels
			? padEnd(labels[i], maxLabelLen)
			: repeat(" ", maxLabelLen);
		const barStr = repeat("█", fill);
		const value = format(data[i]);

		lines.push(` ${label} ${colorize(barStr, color)} ${colors.dim(value)}`);
	}

	return lines.join("\n");
}
