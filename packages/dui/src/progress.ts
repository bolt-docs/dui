import readline from "node:readline";
import { colors, colorize, interpolateColor } from "./color";
import type { ColorInput } from "./color";
import { getConfig } from "./config";
import { resolveColor } from "./theme";
import type { ColorStyle } from "./theme";

export interface ProgressBarOptions {
	width?: number;
	prefix?: string;
	suffix?: string;
	barChar?: string;
	emptyChar?: string;
	color?: ColorStyle;
}

export interface ProgressBar {
	start(total?: number): void;
	update(current: number, message?: string): void;
	stop(message?: string): void;
	readonly percentage: number;
}

export function createProgressBar(opts?: ProgressBarOptions): ProgressBar {
	const barWidth = opts?.width ?? 30;
	const barChar = opts?.barChar ?? "█";
	const emptyChar = opts?.emptyChar ?? "░";
	const isTTY = process.stdout.isTTY;
	const theme = getConfig().theme;
	const { apply: barStyle } = resolveColor("progress.bar", theme, opts?.color);

	let total = 100;
	let current = 0;
	let message = "";
	let timer: ReturnType<typeof setInterval> | null = null;
	let started = false;
	let stopped = false;

	const prefixStr = opts?.prefix ?? "";
	const suffixStr = opts?.suffix ?? "";

	function getPercentage(): number {
		if (total <= 0) return 0;
		return Math.min(100, Math.max(0, (current / total) * 100));
	}

	function renderLine(pct: number, bar: string, msg: string): string {
		const pctStr = `${Math.round(pct)}%`.padStart(4);
		const parts = [prefixStr, bar, pctStr];
		if (msg) parts.push("|", msg);
		if (suffixStr) parts.push(suffixStr);
		return parts.filter(Boolean).join(" ");
	}

	function buildBar(pct: number): string {
		const filled = Math.round((pct / 100) * barWidth);
		return barChar.repeat(filled) + emptyChar.repeat(barWidth - filled);
	}

	function render() {
		if (stopped) return;
		const pct = getPercentage();

		const rawBar = buildBar(pct);
		const coloredBar = barStyle(rawBar);

		const line = renderLine(pct, coloredBar, message);

		if (isTTY) {
			readline.clearLine(process.stdout, 0);
			readline.cursorTo(process.stdout, 0);
			process.stdout.write(line);
		}
	}

	function start(t?: number) {
		if (started) return;
		started = true;
		stopped = false;
		if (t !== undefined) total = t;

		if (isTTY) {
			process.stdout.write("\u001b[?25l");
			render();
			timer = setInterval(render, 100);
		} else {
			const pct = getPercentage();
			const bar = buildBar(pct);
			const coloredBar = barStyle(bar);
			process.stdout.write(renderLine(pct, coloredBar, message) + "\n");
		}
	}

	function update(c: number, msg?: string) {
		current = c;
		if (msg !== undefined) message = msg;

		if (!isTTY && started) {
			const pct = getPercentage();
			const bar = buildBar(pct);
			const coloredBar = barStyle(bar);
			process.stdout.write(renderLine(pct, coloredBar, message) + "\n");
		}
	}

	function stop(msg?: string) {
		if (stopped) return;
		stopped = true;
		if (msg !== undefined) message = msg;

		if (timer) {
			clearInterval(timer);
			timer = null;
		}

		const pct = getPercentage();
		const bar = buildBar(pct);
		const coloredBar = barStyle(bar);
		const line = renderLine(pct, coloredBar, message);

		if (isTTY) {
			readline.clearLine(process.stdout, 0);
			readline.cursorTo(process.stdout, 0);
			process.stdout.write(line + "\n");
			process.stdout.write("\u001b[?25h");
		} else {
			process.stdout.write(line + "\n");
		}
	}

	return {
		start,
		update,
		stop,
		get percentage() {
			return getPercentage();
		},
	};
}
