import { getConfig } from "./config";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";
import { terminalWidth, wrapAnsiWord } from "./utils";

export function bullet(
	items: string[],
	opts?: { colors?: { bullet?: ColorStyle } },
): string {
	const termW = terminalWidth();
	const indent = "    ";
	const theme = getConfig().theme;
	const { apply: bulletStyle } = resolveColor(
		"list.bullet",
		theme,
		opts?.colors?.bullet,
	);
	const prefix = `  ${bulletStyle("•")} `;
	const contentWidth = Math.max(10, termW - 4);

	return items
		.map((item) => {
			const wrapped = wrapAnsiWord(item, contentWidth);
			return wrapped
				.map((line, idx) =>
					idx === 0 ? `${prefix}${line}` : `${indent}${line}`,
				)
				.join("\n");
		})
		.join("\n");
}

export function ordered(
	items: string[],
	opts?: { colors?: { number?: ColorStyle } },
): string {
	const termW = terminalWidth();
	const theme = getConfig().theme;
	const { apply: numberStyle } = resolveColor(
		"list.number",
		theme,
		opts?.colors?.number,
	);

	return items
		.map((item, i) => {
			const num = `${i + 1}.`;
			const prefix = `  ${numberStyle(num)} `;
			const prefixLen = 3 + num.length;
			const indent = " ".repeat(prefixLen);
			const contentWidth = Math.max(10, termW - prefixLen);

			const wrapped = wrapAnsiWord(item, contentWidth);
			return wrapped
				.map((line, idx) =>
					idx === 0 ? `${prefix}${line}` : `${indent}${line}`,
				)
				.join("\n");
		})
		.join("\n");
}

export interface TaskItem {
	label: string;
	done: boolean;
}

export function tasks(
	items: TaskItem[],
	opts?: { colors?: { check?: ColorStyle; cross?: ColorStyle } },
): string {
	const termW = terminalWidth();
	const indent = "    ";
	const contentWidth = Math.max(10, termW - 4);
	const theme = getConfig().theme;
	const { apply: checkStyle } = resolveColor(
		"list.check",
		theme,
		opts?.colors?.check,
	);
	const { apply: crossStyle } = resolveColor(
		"list.cross",
		theme,
		opts?.colors?.cross,
	);

	return items
		.map((item) => {
			const icon = item.done ? checkStyle("✔") : crossStyle("✘");
			const prefix = `  ${icon} `;
			const wrapped = wrapAnsiWord(item.label, contentWidth);
			return wrapped
				.map((line, idx) =>
					idx === 0 ? `${prefix}${line}` : `${indent}${line}`,
				)
				.join("\n");
		})
		.join("\n");
}
