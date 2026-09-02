import { colorize, colors, visibleLength } from "@bdocs/dui";
import { barColor, clamp, padEnd } from "./utils";

export interface PieSlice {
	label: string;
	value: number;
}

export interface PieOptions {
	width?: number;
	progress?: number;
	/** Lower bound of the value axis. Defaults to 0. Values at or below
	 *  `min` render as empty slices (negative values never overflow). */
	min?: number;
	/** Upper bound of the value axis — the value a full bar represents.
	 *  Defaults to the sum of the slice values (share of total). */
	max?: number;
}

export function pie(data: PieSlice[], options: PieOptions = {}): string {
	if (data.length === 0) return "";

	const { progress = 1 } = options;
	const p = clamp(progress, 0, 1);

	const values = data.map((s) => s.value);
	const total = values.reduce((sum, v) => sum + v, 0);
	// Axis bounds: `min` defaults to 0, `max` to the total (share of
	// sum). With mixed/negative data the max is the largest value so the
	// range never inverts; slices at/below `min` clamp to an empty bar.
	const min = options.min ?? 0;
	const max = options.max ?? Math.max(total, ...values);
	const range = max - min;
	if (range === 0 && max === 0) return "";

	const lines: string[] = [];
	const barW = 24;
	const maxLabelLen = Math.max(...data.map((s) => visibleLength(s.label)));

	// Each slice's share is its fraction of the [min, max] axis (share
	// of total by default). With `progress: p` the revealed share is
	// that fraction of the bar (`fill`) and the reported percentage is
	// the share scaled by p — NOT the relative ratio of revealed slices
	// (which would cancel `p` out and make progress a no-op).
	for (let i = 0; i < data.length; i++) {
		const slice = data[i];
		// Fraction of the [min, max] axis, clamped — negative values
		// render as empty slices instead of overflowing the bar.
		const share =
			range === 0 ? 1 : clamp((slice.value - min) / range, 0, 1);
		const fill = Math.round(share * barW * p);
		const pct = share * 100 * p;

		const color = barColor(i);
		const barStr = colorize("█".repeat(fill), color);
		const label = padEnd(slice.label, maxLabelLen);
		const pctStr = `${pct.toFixed(1)}%`;

		lines.push(` ${barStr} ${label} ${colors.dim(pctStr)}`);
	}

	return lines.join("\n");
}
