import * as readline from "node:readline";
import { colors } from "./color";
import { getConfig } from "./config";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";

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

		let cursor = 0;
		let offset = 0;
		let done = false;
		let linesRendered = 0;

		function clampCursor(pos: number): number {
			const total = choices.length;
			const p = ((pos % total) + total) % total;
			if (!choices[p].disabled) return p;
			let attempts = 0;
			const dir = pos > cursor ? 1 : -1;
			let next = p;
			while (attempts < total) {
				next = (((next + dir) % total) + total) % total;
				if (!choices[next].disabled) return next;
				attempts++;
			}
			return cursor;
		}

		function render() {
			const effective = Math.min(pageSize, choices.length);
			offset = Math.max(0, Math.min(offset, choices.length - effective));

			const visible = choices.slice(offset, offset + effective);
			const lines: string[] = [];

			lines.push(
				`${messageColor(`? ${message}`)} ${colors.dim("(Use arrow keys)")}`,
			);

			for (let i = 0; i < visible.length; i++) {
				const idx = offset + i;
				const choice = choices[idx];
				const isCursor = idx === cursor;
				const prefix = isCursor ? `${pointerColor(POINTER)} ` : "  ";

				let label: string;
				if (choice.disabled) {
					label = colors.dim(`${choice.label} (disabled)`);
				} else if (isCursor) {
					label = selectedColor(choice.label);
				} else {
					label = labelColor(choice.label);
				}

				lines.push(`${prefix}${label}`);
			}

			const output = lines.join("\n");

			if (linesRendered > 0) {
				readline.moveCursor(stdout, 0, -linesRendered);
			}
			readline.cursorTo(stdout, 0);
			readline.clearScreenDown(stdout);
			stdout.write(output);
			linesRendered = lines.length;
		}

		function cleanup() {
			if (done) return;
			done = true;
			stdin.setRawMode(false);
			stdin.removeListener("keypress", onKeypress);
		}

		function finalize() {
			cleanup();
			const chosen = choices[cursor];
			const finalLine = `${messageColor(`? ${message}`)} ${selectedColor(chosen.label)}\n`;
			readline.moveCursor(stdout, 0, -linesRendered);
			readline.cursorTo(stdout, 0);
			readline.clearScreenDown(stdout);
			stdout.write(finalLine);
			resolve(chosen.value);
		}

		function onKeypress(_str: string, key: { name?: string; ctrl?: boolean }) {
			if (done) return;

			if (key.name === "up") {
				cursor = clampCursor(cursor - 1);
				if (cursor < offset) offset = cursor;
				render();
			} else if (key.name === "down") {
				cursor = clampCursor(cursor + 1);
				if (cursor >= offset + pageSize) offset = cursor - pageSize + 1;
				render();
			} else if (key.name === "return" || key.name === "enter") {
				if (!choices[cursor].disabled) finalize();
			} else if (key.name === "escape") {
				cleanup();
				readline.moveCursor(stdout, 0, -linesRendered);
				readline.cursorTo(stdout, 0);
				readline.clearScreenDown(stdout);
				reject(new Error("Cancelled"));
			} else if (key.name === "c" && key.ctrl) {
				cleanup();
				stdout.write("\n");
				process.exit(1);
			}
		}

		readline.emitKeypressEvents(stdin);
		stdin.setRawMode(true);
		stdin.on("keypress", onKeypress);
		render();
	});
}
