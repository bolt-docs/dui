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

export interface SelectChoice<T = string> {
	label: string;
	value: T;
	disabled?: boolean;
}

export interface SelectOptions<T = string> {
	choices: SelectChoice<T>[];
	pageSize?: number;
	colors?: {
		pointer?: ColorStyle;
		selected?: ColorStyle;
		label?: ColorStyle;
		message?: ColorStyle;
	};
}

const POINTER = "\u276f";

export async function select<T = string>(
	message: string,
	options: SelectOptions<T>,
): Promise<T> {
	const { choices, pageSize = 10, colors: colorsOverride } = options;

	if (!choices.length) {
		throw new Error("Select requires at least one choice");
	}

	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		return nonInteractiveSelect(message, choices);
	}

	return interactiveSelect(message, choices, pageSize, colorsOverride);
}

function nonInteractiveSelect<T>(
	message: string,
	choices: SelectChoice<T>[],
): Promise<T> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise<T>((resolve) => {
		console.log(`\n${message}:`);
		for (let i = 0; i < choices.length; i++) {
			const c = choices[i];
			const d = c.disabled ? ` ${colors.dim("(disabled)")}` : "";
			console.log(`  ${i + 1}. ${c.label}${d}`);
		}

		rl.question(`Enter number (1-${choices.length}): `, (answer) => {
			rl.close();
			const idx = parseInt(answer.trim(), 10) - 1;
			if (idx >= 0 && idx < choices.length && !choices[idx].disabled) {
				resolve(choices[idx].value);
			} else {
				const first = choices.find((c) => !c.disabled);
				resolve((first as SelectChoice<T>).value);
			}
		});
	});
}

function interactiveSelect<T>(
	message: string,
	choices: SelectChoice<T>[],
	pageSize: number,
	colorsOverride: SelectOptions["colors"],
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const stdin = process.stdin;
		const stdout = process.stdout;
		const theme = getConfig().theme;

		const messageColor = resolveColor(
			"select.message",
			theme,
			colorsOverride?.message,
		).apply;
		const pointerColor = resolveColor(
			"select.pointer",
			theme,
			colorsOverride?.pointer,
		).apply;
		const selectedColor = resolveColor(
			"select.selected",
			theme,
			colorsOverride?.selected,
		).apply;
		const labelColor = resolveColor(
			"select.label",
			theme,
			colorsOverride?.label,
		).apply;

		enableMouse();
		enableMouseMove();

		const MESSAGE_HELP = "(Use arrow keys or click to select)";

		let cursor = 0;
		let hoveredIndex: number | null = null;
		const clickableAreaIds = new Set<string>();
		const hoverableAreaIds = new Set<string>();
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

			const msgLine = `${messageColor(`? ${message}`)} ${colors.dim(MESSAGE_HELP)}`;
			lines.push(msgLine);

			const msgRowDelta = Math.floor(visibleLength(msgLine) / terminalWidth());

			for (let i = 0; i < visible.length; i++) {
				const idx = offset + i;
				const choice = choices[idx];
				const isCursor = idx === cursor;
				const isHovered = idx === hoveredIndex;
				const prefix = isCursor ? `${pointerColor(POINTER)} ` : "  ";

				let label: string;
				if (choice.disabled) {
					label = colors.dim(`${choice.label} (disabled)`);
				} else if (isHovered) {
					label = applyClass("hover", selectedColor(choice.label));
				} else if (isCursor) {
					label = selectedColor(choice.label);
				} else {
					label = labelColor(choice.label);
				}

				lines.push(`${prefix}${label}`);

				const areaId = `select-${i}`;
				registerClickableArea({
					id: areaId,
					type: "select",
					bounds: { left: 0, top: 1 + msgRowDelta + 1 + i, width: 999, height: 1 },
					data: { choiceIndex: idx },
				});
				clickableAreaIds.add(areaId);

				registerHoverableArea({
					id: `hover-${areaId}`,
					type: "select",
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

		function cleanup() {
			if (done) return;
			done = true;
			stdin.removeListener("data", onData);
			stdin.setRawMode(false);
			disableMouse();
		}

		function finalize() {
			cleanup();
			const chosen = choices[cursor];
			const finalLine = `${messageColor(`? ${message}`)} ${selectedColor(chosen.label)}\n`;
			if (linesRendered > 0) {
				stdout.write(`\x1b[${linesRendered}A`);
			} else {
				stdout.write("\x1b[H");
			}
			readline.cursorTo(stdout, 0);
			readline.clearScreenDown(stdout);
			stdout.write(finalLine);
			resolve(chosen.value);
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
						clickedArea.type === "select" &&
						clickedArea.data
					) {
						const actualIndex = clickedArea.data.choiceIndex as number;
						if (!choices[actualIndex].disabled) {
							cursor = actualIndex;
							finalize();
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

			if (lastChar === "\r" || lastChar === "\n") {
				buf = "";
				if (!choices[cursor].disabled) finalize();
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
