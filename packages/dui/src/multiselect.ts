import * as readline from "node:readline";
import { colors } from "./color";
import { getConfig } from "./config";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";

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
	const { choices, pageSize = 10, required = false, colors: colorsOverride } = options;

	if (!choices.length) {
		throw new Error("Multiselect requires at least one choice");
	}

	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		return nonInteractiveMultiselect(message, choices, required);
	}

	return interactiveMultiselect(message, choices, pageSize, required, colorsOverride);
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
					.filter((idx) => idx >= 0 && idx < choices.length && !choices[idx].disabled);

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

			const help = required
				? "(Use arrow keys, space to select, enter to confirm)"
				: "(Use arrow keys, space to select)";
			lines.push(
				`${messageColor(`? ${message}`)} ${colors.dim(help)}`,
			);

			for (let i = 0; i < visible.length; i++) {
				const idx = offset + i;
				const choice = choices[idx];
				const isCursor = idx === cursor;
				const isChecked = checked.has(idx);
				const pointer = isCursor ? `${pointerColor(POINTER)} ` : "  ";
				const checkbox = isChecked ? checkedColor(CHECKED) : colors.dim(UNCHECKED);

				let label: string;
				if (choice.disabled) {
					label = colors.dim(`${checkbox} ${choice.label} (disabled)`);
				} else if (isCursor) {
					label = `${checkbox} ${selectedColor(choice.label)}`;
				} else {
					label = `${checkbox} ${labelColor(choice.label)}`;
				}

				lines.push(`${pointer}${label}`);
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

		function getSelected(): T[] {
			return [...checked].map((i) => choices[i].value);
		}

		function cleanup() {
			if (done) return;
			done = true;
			stdin.setRawMode(false);
			stdin.removeListener("keypress", onKeypress);
		}

		function finalize() {
			cleanup();
			const selected = getSelected();
			const summary = selected.length === 0
				? colors.dim("(none selected)")
				: `${selected.length} selected`;
			const finalLine = `${messageColor(`? ${message}`)} ${summary}\n`;
			readline.moveCursor(stdout, 0, -linesRendered);
			readline.cursorTo(stdout, 0);
			readline.clearScreenDown(stdout);
			stdout.write(finalLine);
			resolve(selected);
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
			} else if (key.name === "space") {
				if (!choices[cursor].disabled) {
					if (checked.has(cursor)) {
						if (required && checked.size <= 1) return;
						checked.delete(cursor);
					} else {
						checked.add(cursor);
					}
				}
				render();
			} else if (key.name === "return" || key.name === "enter") {
				if (required && checked.size === 0) return;
				finalize();
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
