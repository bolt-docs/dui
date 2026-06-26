import { terminalWidth, visibleLength, stripAnsi, colorize } from "@bdocs/dui";

export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

export function scale(
	value: number,
	fromMin: number,
	fromMax: number,
	toMin: number,
	toMax: number,
): number {
	if (fromMax === fromMin) return toMin;
	return toMin + ((value - fromMin) / (fromMax - fromMin)) * (toMax - toMin);
}

export function formatNumber(n: number): string {
	return n.toLocaleString("en-US");
}

export function getWidth(preferred?: number): number {
	return preferred ? Math.min(preferred, terminalWidth() - 2) : terminalWidth() - 4;
}

export function repeat(char: string, count: number): string {
	if (count <= 0) return "";
	return char.repeat(count);
}

export function padEnd(text: string, length: number, fill = " "): string {
	const pad = length - visibleLength(stripAnsi(text));
	return text + (pad > 0 ? fill.repeat(pad) : "");
}

export function barColor(index: number): string {
	const palette = ["#00d4aa", "#ff8c42", "#6c5ce7", "#f72c5b", "#00b4d8"];
	return palette[index % palette.length];
}

export function applyColor(text: string, color?: string): string {
	if (!color) return text;
	return colorize(text, color);
}
