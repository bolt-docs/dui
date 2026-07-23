import { getConfig } from "./config";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";
import { fitWidth, terminalWidth, visibleLength, wrapAnsiWord } from "./utils";

export type BoxBorderStyle = "single" | "double" | "round";

interface BorderChars {
	tl: string;
	tr: string;
	bl: string;
	br: string;
	h: string;
	v: string;
}

const BORDERS: Record<BoxBorderStyle, BorderChars> = {
	single: { tl: "┏", tr: "┓", bl: "┗", br: "┛", h: "━", v: "┃" },
	double: { tl: "╔", tr: "╗", bl: "╚", br: "╝", h: "═", v: "║" },
	round: { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" },
};

export interface BoxOptions {
	title?: string;
	width?: number;
	style?: BoxBorderStyle;
	padding?: number;
	color?: ColorStyle;
	colors?: {
		border?: ColorStyle;
		title?: ColorStyle;
		arrow?: ColorStyle;
		url?: ColorStyle;
		hint?: ColorStyle;
		label?: ColorStyle;
		value?: ColorStyle;
	};
}

function truncate(s: string, max: number): string {
	return visibleLength(s) > max ? s.slice(0, max - 1) + "…" : s;
}

function buildBoxBase(
	lines: string[],
	opts: {
		title?: string;
		width: number;
		style: BoxBorderStyle;
		padLine: (line: string, innerWidth: number) => string;
		color?: ColorStyle;
		colors?: BoxOptions["colors"];
		theme?: ReturnType<typeof getConfig>["theme"];
	},
): string {
	const b = BORDERS[opts.style] ?? BORDERS.double;
	const result: string[] = [];
	const { apply: titleStyle } = resolveColor(
		"box.title",
		opts.theme,
		opts.colors?.title,
	);
	const { apply: borderStyle } = resolveColor(
		"box.border",
		opts.theme,
		opts.colors?.border || opts.color,
	);

	if (opts.title) {
		const title = truncate(opts.title, opts.width - 4);
		const titleLen = visibleLength(title);
		const remaining = Math.max(0, opts.width - titleLen - 3);
		result.push(
			borderStyle(b.tl + b.h) +
				` ${titleStyle(title)} ` +
				borderStyle(b.h.repeat(remaining) + b.tr),
		);
	} else {
		result.push(borderStyle(b.tl + b.h.repeat(opts.width) + b.tr));
	}

	for (const line of lines) {
		const content = opts.padLine(line, opts.width);
		result.push(borderStyle(b.v) + content + borderStyle(b.v));
	}

	result.push(borderStyle(b.bl + b.h.repeat(opts.width) + b.br));
	return result.join("\n");
}

export function box(lines: string[], opts?: BoxOptions): string {
	const style = opts?.style ?? "double";
	const padding = opts?.padding ?? 1;
	const theme = getConfig().theme;
	const colorsOverride = opts?.colors;

	const termWidth = Math.min(terminalWidth(), 80);
	const maxInnerWidth = opts?.width
		? Math.min(opts.width, termWidth)
		: termWidth;
	const maxContentWidth = Math.max(4, maxInnerWidth - padding * 2);

	const wrappedLines: string[] = [];
	for (const line of lines) {
		const subLines = line.split("\n");
		for (const subLine of subLines) {
			wrappedLines.push(...wrapAnsiWord(subLine, maxContentWidth));
		}
	}

	const maxContent = wrappedLines.reduce(
		(m, l) => Math.max(m, visibleLength(l)),
		0,
	);
	const titleLen = opts?.title ? visibleLength(opts.title) + 2 : 0;
	const minInnerWidth = Math.max(maxContent + padding * 2, titleLen + 2, 20);
	const width = opts?.width
		? Math.min(opts.width, termWidth)
		: Math.min(minInnerWidth, termWidth);

	return buildBoxBase(wrappedLines, {
		title: opts?.title,
		width,
		style,
		padLine: (line, innerWidth) => {
			const innerPad = " ".repeat(padding);
			return fitWidth(innerPad + line + innerPad, innerWidth);
		},
		theme,
		color: opts?.color,
		colors: colorsOverride,
	});
}

export function double(
	lines: string[],
	opts?: Omit<BoxOptions, "style">,
): string {
	return box(lines, { ...opts, style: "double" });
}

export function single(
	lines: string[],
	opts?: Omit<BoxOptions, "style">,
): string {
	return box(lines, { ...opts, style: "single" });
}

export function round(
	lines: string[],
	opts?: Omit<BoxOptions, "style">,
): string {
	return box(lines, { ...opts, style: "round" });
}
