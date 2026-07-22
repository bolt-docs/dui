import * as readline from "node:readline";
import { colors } from "./color";
import { getConfig } from "./config";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";
import { computeLinesRendered, terminalWidth, visibleLength } from "./utils";
import {
	disableMouse,
	enableMouse,
	enableMouseMove,
	getClickedItem,
	getHoveredItem,
	parseSGRMouseData,
	registerClickableArea,
	registerHoverableArea,
	unregisterClickableArea,
	unregisterHoverableArea,
} from "./mouse";
import { applyClass } from "./style";

export interface MultiselectChoice<T = string> {
	label: string;
	value: T;
	disabled?: boolean;
	checked?: boolean;
}

export interface MultiselectOptions<T = string> {
	choices: MultiselectChoice<T>[];
	pageSize?: number;
	required?: boolean;
	colors?: {
		pointer?: ColorStyle;
		selected?: ColorStyle;
		checked?: ColorStyle;
		label?: ColorStyle;
		message?: ColorStyle;
	};
}

const POINTER = "\u276f";
const CHECKED = "\u2611";
const UNCHECKED = "\u2610";

export async function multiselect<T = string>(
	message: string,
	options: MultiselectOptions<T>,
): Promise<T[]> {
	const {
		choices,
		pageSize = 10,
		required = false,
		colors: colorsOverride,
	} = options;

	if (!choices.length) {
		throw new Error("Multiselect requires at least one choice");
	}

	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		return nonInteractiveMultiselect(message, choices, required);
	}

	return interactiveMultiselect(
		message,
		choices,
		pageSize,
		required,
		colorsOverride,
	);
}

function nonInteractiveMultiselect<T>(
	message: string,
	choices: MultiselectChoice<T>[],
	required: boolean,
): Promise<T[]> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise<T[]>((resolve) => {
		console.log(`\n${message}:`);
		for (let i = 0; i < choices.length; i++) {
			const c = choices[i];
			const d = c.disabled ? ` ${colors.dim("(disabled)")}` : "";
			console.log(`  ${i + 1}. ${c.label}${d}`);
		}

		rl.question(
			`Enter numbers separated by commas (1-${choices.length}): `,
			(answer) => {
				rl.close();
				const parts = answer
					.split(",")
					.map((s) => parseInt(s.trim(), 10) - 1)
					.filter(
						(idx) =>
							idx >= 0 && idx < choices.length && !choices[idx].disabled,
					);

				if (parts.length === 0 && required) {
					const first = choices.find((c) => !c.disabled);
					resolve(first ? [first.value] : []);
					return;
				}

				const selected = [...new Set(parts)].map((idx) => choices[idx].value);
				resolve(selected);
			},
		);
	});
}

function interactiveMultiselect<T>(
	message: string,
	choices: MultiselectChoice<T>[],
	pageSize: number,
	required: boolean,
	colorsOverride: MultiselectOptions["colors"],
): Promise<T[]> {
	return new Promise<T[]>((resolve, reject) => {
		const stdin = process.stdin;
		const stdout = process.stdout;
		const theme = getConfig().theme;

		enableMouse();
		enableMouseMove();

		const messageColor = resolveColor(
			"multiselect.message",
			theme,
			colorsOverride?.message,
		).apply;
		const pointerColor = resolveColor(
			"multiselect.pointer",
			theme,
			colorsOverride?.pointer,
		).apply;
		const selectedColor = resolveColor(
			"multiselect.selected",
			theme,
			colorsOverride?.selected,
		).apply;
		const checkedColor = resolveColor(
			"multiselect.checked",
			theme,
			colorsOverride?.checked,
		).apply;
		const labelColor = resolveColor(
			"multiselect.label",
			theme,
			colorsOverride?.label,
		).apply;

		const checked = new Set<number>();
		for (let i = 0; i < choices.length; i++) {
			if (choices[i].checked) checked.add(i);
		}

		const clickableAreaIds = new Set<string>();
		const hoverableAreaIds = new Set<string>();

		let cursor = 0;
		let hoveredIndex: number | null = null;
		let offset = 0;
		let done = false;
		let linesRendered = 0;
		let buf = "";

		function clampCursor(pos: number): number {
			const total = choices.length;
			const p = ((pos % total) + total) % total;
			if (!choices[p].disabled) return p;
			const dir = pos > cursor ? 1 : -1;
			let next = p;
			for (let i = 0; i < total; i++) {
				next = (((next + dir) % total) + total) % total;
				if (!choices[next].disabled) return next;
			}
			return cursor;
		}

		function render() {
			if (done) return;
			const effective = Math.min(pageSize, choices.length);
			offset = Math.max(0, Math.min(offset, choices.length - effective));

			for (const id of clickableAreaIds) {
				unregisterClickableArea(id);
			}
			clickableAreaIds.clear();
			for (const id of hoverableAreaIds) {
				unregisterHoverableArea(id);
			}
			hoverableAreaIds.clear();

			const visible = choices.slice(offset, offset + effective);
			const lines: string[] = [];

			const help = required
				? "(Use arrow keys + space, click to toggle, enter to confirm)"
				: "(Use arrow keys + space, click to toggle)";
			const msgLine = `${messageColor(`? ${message}`)} ${colors.dim(help)}`;
			lines.push(msgLine);

			const msgRowDelta = Math.floor(visibleLength(msgLine) / terminalWidth());

			for (let i = 0; i < visible.length; i++) {
				const idx = offset + i;
				const choice = choices[idx];
				const isCursor = idx === cursor;
				const isChecked = checked.has(idx);
				const isHovered = idx === hoveredIndex;
				const pointer = isCursor ? `${pointerColor(POINTER)} ` : "  ";
				const checkbox = isChecked
					? checkedColor(CHECKED)
					: colors.dim(UNCHECKED);

				let label: string;
				if (choice.disabled) {
					label = colors.dim(`${checkbox} ${choice.label} (disabled)`);
				} else if (isHovered) {
					label = `${checkbox} ${applyClass("hover", selectedColor(choice.label))}`;
				} else if (isCursor) {
					label = `${checkbox} ${selectedColor(choice.label)}`;
				} else {
					label = `${checkbox} ${labelColor(choice.label)}`;
				}

				lines.push(`${pointer}${label}`);

				const areaId = `multiselect-${i}`;
				registerClickableArea({
					id: areaId,
					type: "multiselect",
					bounds: { left: 0, top: 1 + msgRowDelta + 1 + i, width: 999, height: 1 },
					data: { choiceIndex: idx },
				});
				clickableAreaIds.add(areaId);

				registerHoverableArea({
					id: `hover-${areaId}`,
					type: "multiselect",
					bounds: { left: 0, top: 1 + msgRowDelta + 1 + i, width: 999, height: 1 },
					data: { choiceIndex: idx },
				});
				hoverableAreaIds.add(`hover-${areaId}`);
			}

			const output = lines.join("\n");

			if (linesRendered > 0) {
				stdout.write(`\x1b[${linesRendered}A`);
			} else {
				stdout.write("\x1b[H");
			}
			readline.cursorTo(stdout, 0);
			readline.clearScreenDown(stdout);
			stdout.write(output);
			linesRendered = computeLinesRendered(lines);
		}

		function getSelected(): T[] {
			return [...checked].map((i) => choices[i].value);
		}

		function cleanup() {
			if (done) return;
			done = true;
			stdin.removeListener("data", onData);
			stdin.setRawMode(false);
			disableMouse();
		}

		function finalize() {
			cleanup();
			const selected = getSelected();
			const summary =
				selected.length === 0
					? colors.dim("(none selected)")
					: `${selected.length} selected`;
			const finalLine = `${messageColor(`? ${message}`)} ${summary}\n`;
			if (linesRendered > 0) {
				stdout.write(`\x1b[${linesRendered}A`);
			} else {
				stdout.write("\x1b[H");
			}
			readline.cursorTo(stdout, 0);
			readline.clearScreenDown(stdout);
			stdout.write(finalLine);
			resolve(selected);
		}

		function onData(data: string | Buffer) {
			if (done) return;

			const text = typeof data === "string" ? data : data.toString("utf8");
			buf += text;

			if (buf.length > 256) {
				buf = buf.slice(-32);
			}

			const mouseEvent = parseSGRMouseData(buf);
			if (mouseEvent) {
				buf = "";
				if (mouseEvent.type === "click") {
					const clickedArea = getClickedItem(mouseEvent.x, mouseEvent.y);
					if (
						clickedArea &&
						clickedArea.type === "multiselect" &&
						clickedArea.data
					) {
						const actualIndex = clickedArea.data.choiceIndex as number;
						if (!choices[actualIndex].disabled) {
							cursor = actualIndex;
							if (cursor < offset) offset = cursor;
							if (cursor >= offset + pageSize) offset = cursor - pageSize + 1;
							if (checked.has(cursor)) {
								if (required && checked.size <= 1) {
									render();
									return;
								}
								checked.delete(cursor);
							} else {
								checked.add(cursor);
							}
							render();
						}
					}
				} else if (mouseEvent.type === "move") {
					const hoveredArea = getHoveredItem(mouseEvent.x, mouseEvent.y);
					const newHovered =
						hoveredArea && hoveredArea.data
							? (hoveredArea.data.choiceIndex as number)
							: null;
					if (newHovered !== hoveredIndex) {
						hoveredIndex = newHovered;
						render();
					}
				}
				return;
			}

			if (buf.includes("\x1b[A")) {
				buf = "";
				hoveredIndex = null;
				cursor = clampCursor(cursor - 1);
				if (cursor < offset) offset = cursor;
				render();
				return;
			}
			if (buf.includes("\x1b[B")) {
				buf = "";
				hoveredIndex = null;
				cursor = clampCursor(cursor + 1);
				if (cursor >= offset + pageSize) offset = cursor - pageSize + 1;
				render();
				return;
			}

			if (buf === "\x1b") {
				cleanup();
				if (linesRendered > 0) {
					stdout.write(`\x1b[${linesRendered}A`);
				} else {
					stdout.write("\x1b[H");
				}
				readline.cursorTo(stdout, 0);
				readline.clearScreenDown(stdout);
				reject(new Error("Cancelled"));
				return;
			}

			const lastChar = buf[buf.length - 1];

			if (lastChar === " ") {
				buf = "";
				if (!choices[cursor].disabled) {
					if (checked.has(cursor)) {
						if (required && checked.size <= 1) {
							render();
							return;
						}
						checked.delete(cursor);
					} else {
						checked.add(cursor);
					}
				}
				render();
			} else if (lastChar === "\r" || lastChar === "\n") {
				buf = "";
				if (required && checked.size === 0) {
					render();
					return;
				}
				finalize();
			} else if (lastChar === "\x03") {
				cleanup();
				stdout.write("\n");
				process.exit(130);
			} else if (
				buf.length > 1 ||
				(text.length > 0 && text[text.length - 1] !== "\x1b")
			) {
				buf = "";
			}
		}

		stdin.setRawMode(true);
		stdin.setEncoding("utf8");
		stdin.on("data", onData);
		render();
	});
}
