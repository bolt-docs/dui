import type { BoxBorderStyle } from "./box";
import { getConfig } from "./config";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";
import { terminalWidth, visibleLength, wrapAnsiWord } from "./utils";

export interface TableColumnOptions {
	align?: "left" | "center" | "right";
}

export interface TableOptions {
	style?: BoxBorderStyle | "none";
	columns?: TableColumnOptions[] | Record<number, TableColumnOptions>;
	width?: number;
	headerSeparator?: boolean;
	padding?: number;
	colors?: {
		header?: ColorStyle;
		border?: ColorStyle;
	};
}

interface TableBorderChars {
	tl: string;
	tr: string;
	bl: string;
	br: string;
	h: string;
	v: string;
	tm: string;
	bm: string;
	ml: string;
	mr: string;
	mm: string;
}

const TABLE_BORDERS: Record<
	Exclude<BoxBorderStyle, "none">,
	TableBorderChars
> = {
	single: {
		tl: "┏",
		tr: "┓",
		bl: "┗",
		br: "┛",
		h: "━",
		v: "┃",
		tm: "┳",
		bm: "┻",
		ml: "┣",
		mr: "┫",
		mm: "╋",
	},
	double: {
		tl: "╔",
		tr: "╗",
		bl: "╚",
		br: "╝",
		h: "═",
		v: "║",
		tm: "╦",
		bm: "╩",
		ml: "╠",
		mr: "╣",
		mm: "╬",
	},
	round: {
		tl: "╭",
		tr: "╮",
		bl: "╰",
		br: "╯",
		h: "─",
		v: "│",
		tm: "┬",
		bm: "┴",
		ml: "├",
		mr: "┤",
		mm: "┼",
	},
};

function padCell(
	text: string,
	width: number,
	align: "left" | "center" | "right",
): string {
	const len = visibleLength(text);
	const pad = Math.max(0, width - len);
	if (align === "right") {
		return " ".repeat(pad) + text;
	}
	if (align === "center") {
		return (
			" ".repeat(Math.floor(pad / 2)) + text + " ".repeat(Math.ceil(pad / 2))
		);
	}
	return text + " ".repeat(pad);
}

export function table(
	headers: string[],
	rows: string[][],
	opts?: TableOptions,
): string {
	const style = opts?.style ?? "single";
	const theme = getConfig().theme;
	const { apply: headerStyle } = resolveColor(
		"table.header",
		theme,
		opts?.colors?.header,
	);

	const padding = opts?.padding ?? 1;
	const padStr = " ".repeat(padding);
	const headerSeparator = opts?.headerSeparator ?? true;

	const colCount = Math.max(headers.length, ...rows.map((r) => r.length));
	if (colCount === 0) return "";

	const colWidths = Array(colCount).fill(0);
	for (let c = 0; c < colCount; c++) {
		let max = headers[c] ? visibleLength(headers[c]) : 0;
		for (const row of rows) {
			const cell = row[c] ?? "";
			const cellLen = visibleLength(cell);
			if (cellLen > max) {
				max = cellLen;
			}
		}
		colWidths[c] = max + padding * 2;
	}

	const termW = terminalWidth();
	const maxTableWidth = opts?.width ? Math.min(opts.width, termW) : termW;
	const overhead = style === "none" ? 2 * (colCount - 1) : colCount + 1;
	const availableColSpace = maxTableWidth - overhead;

	let totalWidth = colWidths.reduce((sum, w) => sum + w, 0);
	if (totalWidth > availableColSpace) {
		const minColWidth = Math.max(1, padding * 2 + 1);
		while (totalWidth > availableColSpace) {
			let maxIdx = -1;
			let maxVal = -1;
			for (let c = 0; c < colCount; c++) {
				if (colWidths[c] > maxVal && colWidths[c] > minColWidth) {
					maxVal = colWidths[c];
					maxIdx = c;
				}
			}
			if (maxIdx === -1) {
				break;
			}
			colWidths[maxIdx]--;
			totalWidth--;
		}
	}

	const b =
		TABLE_BORDERS[style as Exclude<BoxBorderStyle, "none">] ??
		TABLE_BORDERS.single;

	const formatRow = (cells: string[]) => {
		const wrappedCells = cells.map((cellText, c) => {
			const innerW = Math.max(1, colWidths[c] - padding * 2);
			return wrapAnsiWord(cellText, innerW);
		});

		const rowLineCount = Math.max(
			1,
			...wrappedCells.map((lines) => lines.length),
		);
		const lines: string[] = [];

		for (let i = 0; i < rowLineCount; i++) {
			const lineCells: string[] = [];
			for (let c = 0; c < colCount; c++) {
				const cellText = wrappedCells[c][i] ?? "";
				const align = opts?.columns?.[c]?.align ?? "left";
				const innerW = Math.max(1, colWidths[c] - padding * 2);
				const padded = padCell(cellText, innerW, align);
				lineCells.push(padStr + padded + padStr);
			}

			if (style === "none") {
				lines.push(lineCells.join("  "));
			} else {
				lines.push(b.v + lineCells.join(b.v) + b.v);
			}
		}
		return lines.join("\n");
	};

	const result: string[] = [];

	if (style === "none") {
		if (headers.length > 0) {
			result.push(formatRow(headers.map((h) => headerStyle(h))));
		}
		for (const row of rows) {
			result.push(formatRow(row));
		}
		return result.join("\n");
	}

	const topParts: string[] = [];
	for (let c = 0; c < colCount; c++) {
		topParts.push(b.h.repeat(colWidths[c]));
	}
	result.push(b.tl + topParts.join(b.tm) + b.tr);

	if (headers.length > 0) {
		const styledHeaders = headers.map((h) => headerStyle(h));
		result.push(formatRow(styledHeaders));

		if (headerSeparator) {
			const midParts: string[] = [];
			for (let c = 0; c < colCount; c++) {
				midParts.push(b.h.repeat(colWidths[c]));
			}
			result.push(b.ml + midParts.join(b.mm) + b.mr);
		}
	}

	for (const row of rows) {
		result.push(formatRow(row));
	}

	const botParts: string[] = [];
	for (let c = 0; c < colCount; c++) {
		botParts.push(b.h.repeat(colWidths[c]));
	}
	result.push(b.bl + botParts.join(b.bm) + b.br);

	return result.join("\n");
}
