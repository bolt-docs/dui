/**
 * Multi-field terminal form.
 *
 * Renders a compact vertical form — text, password, and select
 * fields — navigable with ↑/↓ or Tab, each with inline editing,
 * per-field validation, and a single submit that resolves an object
 * keyed by field id. Built for setup wizards, config prompts, and
 * any multi-question flow that shouldn't flash a full-screen prompt
 * per question.
 *
 * Keys:
 * - ↑/↓ or Tab — move between fields
 * - ←/→ — edit position (text) or cycle the select field
 * - Enter — validate the current field and move on; on the last
 *   field, submit the form
 * - Escape — cancel (rejects)
 *
 * In non-TTY mode each field falls back to a numbered `readline`
 * question so piped input still works.
 *
 * @example
 * ```ts
 * import { form } from "@bdocs/dui"
 *
 * const answers = await form({
 *   title: "New project",
 *   fields: [
 *     { id: "name", label: "Name", type: "text", validate: (v) => v.trim() ? true : "Name is required" },
 *     { id: "token", label: "Token", type: "password" },
 *     { id: "runtime", label: "Runtime", type: "select", choices: [{ label: "Node", value: "node" }, { label: "Bun", value: "bun" }] },
 *   ],
 * })
 * ```
 */

import * as readline from "node:readline";
import { colors } from "./color";
import { getConfig } from "./config";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";
import { computeLinesRendered, visibleLength } from "./utils";

export interface FormTextField {
	id: string;
	label: string;
	type: "text" | "password";
	default?: string;
	placeholder?: string;
	validate?: (value: string) => string | true;
}

export interface FormSelectField {
	id: string;
	label: string;
	type: "select";
	choices: { label: string; value: string; disabled?: boolean }[];
	/** Initial selection by value. Defaults to the first enabled choice. */
	default?: string;
	required?: boolean;
}

export type FormField = FormTextField | FormSelectField;

export interface FormOptions {
	fields: FormField[];
	title?: string;
	/**
	 * Called once when the form is cancelled — Escape or Ctrl+C.
	 * Use it to restore terminal state or release resources before
	 * the promise rejects / the process exits.
	 */
	onCancel?: () => void;
	colors?: {
		label?: ColorStyle;
		value?: ColorStyle;
		message?: ColorStyle;
		error?: ColorStyle;
		pointer?: ColorStyle;
	};
}

type FieldValue = string | undefined;

interface FieldState {
	value: FieldValue;
	error: string;
	// text editing
	buf: string;
	cursorPos: number;
	// select
	selected: number;
}

// ◆ (U+25C6) active field pointer; inactive rows get a hollow spacer.
const POINTER = "\u25c6";

function isSelectField(field: FormField): field is FormSelectField {
	return field.type === "select";
}

function initState(field: FormField): FieldState {
	if (isSelectField(field)) {
		let selected = 0;
		if (field.default !== undefined) {
			const idx = field.choices.findIndex((c) => c.value === field.default);
			if (idx >= 0) selected = idx;
		}
		const first = field.choices.findIndex((c) => !c.disabled);
		if (first >= 0 && (selected < 0 || field.choices[selected]?.disabled)) {
			selected = first;
		}
		return {
			value: field.choices[selected]?.value,
			error: "",
			buf: "",
			cursorPos: 0,
			selected,
		};
	}
	const buf = field.default ?? "";
	return { value: buf, error: "", buf, cursorPos: buf.length, selected: 0 };
}

function validateField(field: FormField, state: FieldState): boolean {
	if (isSelectField(field)) {
		if (field.required && state.selected < 0) {
			state.error = "A selection is required";
			return false;
		}
		state.error = "";
		return true;
	}
	if (field.validate) {
		const result = field.validate(state.buf);
		if (result !== true) {
			state.error = result;
			return false;
		}
	}
	state.error = "";
	return true;
}

/**
 * Run a multi-field form and resolve with the answers keyed by field
 * id. Rejects with `new Error("Cancelled")` on Escape.
 */
export async function form<T extends Record<string, unknown>>(
	options: FormOptions,
): Promise<T> {
	const { fields, title, colors: colorsOverride, onCancel } = options;

	if (!fields.length) {
		throw new Error("Form requires at least one field");
	}

	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		return nonInteractiveForm(fields) as Promise<T>;
	}

	return interactiveForm(fields, title, colorsOverride, onCancel) as Promise<T>;
}

async function nonInteractiveForm(
	fields: FormField[],
): Promise<Record<string, string>> {
	const result: Record<string, string> = {};
	for (const field of fields) {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		if (isSelectField(field)) {
			await new Promise<void>((resolve) => {
				console.log(`${field.label}:`);
				for (let i = 0; i < field.choices.length; i++) {
					const c = field.choices[i];
					const d = c.disabled ? ` ${colors.dim("(disabled)")}` : "";
					console.log(`  ${i + 1}. ${c.label}${d}`);
				}
				rl.question(`Enter number (1-${field.choices.length}): `, (answer) => {
					rl.close();
					const idx = Number.parseInt(answer.trim(), 10) - 1;
					const first = field.choices.find((c) => !c.disabled);
					const choice =
						idx >= 0 && idx < field.choices.length && !field.choices[idx].disabled
							? field.choices[idx]
							: first;
					result[field.id] = choice ? choice.value : "";
					resolve();
				});
			});
		} else {
			await new Promise<void>((resolve) => {
				const hint = field.default !== undefined ? ` (${field.default})` : "";
				rl.question(`${field.label}${hint}: `, (answer) => {
					rl.close();
					const value = answer.trim() || field.default || "";
					if (field.validate) {
						const v = field.validate(value);
						if (v !== true) console.log(colors.red(`  \u2716 ${v}`));
					}
					result[field.id] = value;
					resolve();
				});
			});
		}
	}
	return result;
}

function interactiveForm(
	fields: FormField[],
	title: string | undefined,
	colorsOverride: FormOptions["colors"],
	onCancel: (() => void) | undefined,
): Promise<Record<string, unknown>> {
	return new Promise<Record<string, unknown>>((resolve, reject) => {
		const stdin = process.stdin;
		const stdout = process.stdout;
		const theme = getConfig().theme;

		const labelColor = resolveColor(
			"form.label",
			theme,
			colorsOverride?.label,
		).apply;
		const valueColor = resolveColor(
			"form.value",
			theme,
			colorsOverride?.value,
		).apply;
		const messageColor = resolveColor(
			"form.message",
			theme,
			colorsOverride?.message,
		).apply;
		const errorColor = resolveColor(
			"form.error",
			theme,
			colorsOverride?.error,
		).apply;
		const pointerColor = resolveColor(
			"form.pointer",
			theme,
			colorsOverride?.pointer,
		).apply;

		const states = fields.map(initState);
		let active = 0;
		let done = false;
		let linesRendered = 0;
		let buf = "";

		function cycleSelect(field: FormSelectField, state: FieldState, dir: number) {
			const total = field.choices.length;
			let next = state.selected;
			for (let i = 0; i < total; i++) {
				next = (((next + dir) % total) + total) % total;
				if (!field.choices[next].disabled) break;
			}
			state.selected = next;
			state.value = field.choices[next]?.value;
			state.error = "";
		}

		function render() {
			if (done) return;
			const lines: string[] = [];

			const help = "(arrows/tab move, enter to submit, esc to cancel)";
			const titleLine = `${messageColor(`? ${title ?? "Form"}`)} ${colors.dim(help)}`;
			lines.push(titleLine);

			for (let i = 0; i < fields.length; i++) {
				const field = fields[i];
				const state = states[i];
				const isActive = i === active;
				const pointer = isActive ? `${pointerColor(POINTER)} ` : "  ";
				const label = isActive ? labelColor(field.label) : colors.dim(field.label);

				let display: string;
				if (isSelectField(field)) {
					const choice = field.choices[state.selected];
					const label2 = choice ? choice.label : colors.dim("—");
					display = isActive
						? `[ ${valueColor(label2)} ${colors.dim("\u25be")} ]`
						: `[ ${colors.dim(label2)} ]`;
				} else {
					const raw = state.buf;
					const visible = field.type === "password" ? "\u2022".repeat(raw.length) : raw;
					const shown = visible || (field.placeholder ? colors.dim(field.placeholder) : "");
					display = isActive ? `[ ${valueColor(shown)} ]` : `[ ${colors.dim(shown)} ]`;
				}

				lines.push(`${pointer}${label}: ${display}`);
				if (state.error && isActive) {
					lines.push(`    ${errorColor(`\u2716 ${state.error}`)}`);
				}
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

			// Put the cursor inside the active field's value box.
			if (isSelectField(fields[active])) return;
			const state = states[active];
			const cursorRow = active === 0 ? 1 : 1 + active + errorRowsBelow(active);
			const col = 3 + visibleLength(fields[active].label) + 3 + state.cursorPos;
			readline.moveCursor(stdout, 0, -(linesRendered - cursorRow));
			readline.cursorTo(stdout, col);
		}

		function errorRowsBelow(until: number): number {
			let rows = 0;
			for (let i = 0; i < until; i++) {
				if (states[i].error) rows++;
			}
			return rows;
		}

		function cleanup() {
			if (done) return;
			done = true;
			stdin.setRawMode(false);
			stdin.removeListener("data", onData);
		}

		function finalize() {
			cleanup();
			const result: Record<string, unknown> = {};
			for (let i = 0; i < fields.length; i++) {
				const field = fields[i];
				result[field.id] = isSelectField(field)
					? field.choices[states[i].selected]?.value
					: states[i].buf;
			}
			if (linesRendered > 0) {
				stdout.write(`\x1b[${linesRendered}A`);
			} else {
				stdout.write("\x1b[H");
			}
			readline.cursorTo(stdout, 0);
			readline.clearScreenDown(stdout);
			stdout.write(
				`${messageColor(`? ${title ?? "Form"}`)} ${colors.green("\u2714 submitted")}\n`,
			);
			resolve(result);
		}

		function onData(data: string | Buffer) {
			if (done) return;

			const text = typeof data === "string" ? data : data.toString("utf8");
			buf += text;

			if (buf.length > 256) {
				buf = buf.slice(-32);
			}

			if (buf.includes("\x1b[A")) {
				buf = "";
				if (active > 0) active--;
				render();
				return;
			}
			if (buf.includes("\x1b[B")) {
				buf = "";
				if (active < fields.length - 1) active++;
				render();
				return;
			}
			if (buf.includes("\x1b[C")) {
				buf = "";
				const field = fields[active];
				if (isSelectField(field)) {
					cycleSelect(field, states[active], 1);
					render();
				} else {
					const state = states[active];
					if (state.cursorPos < state.buf.length) {
						state.cursorPos++;
						render();
					}
				}
				return;
			}
			if (buf.includes("\x1b[D")) {
				buf = "";
				const field = fields[active];
				if (isSelectField(field)) {
					cycleSelect(field, states[active], -1);
					render();
				} else {
					const state = states[active];
					if (state.cursorPos > 0) {
						state.cursorPos--;
						render();
					}
				}
				return;
			}

			if (buf === "\x1b") {
				Promise.resolve().then(() => {
					if (done) return;
					if (buf !== "\x1b") return;
					buf = "";
					onCancel?.();
					cleanup();
					if (linesRendered > 0) {
						stdout.write(`\x1b[${linesRendered}A`);
					} else {
						stdout.write("\x1b[H");
					}
					readline.cursorTo(stdout, 0);
					readline.clearScreenDown(stdout);
					reject(new Error("Cancelled"));
				});
				return;
			}

			const lastChar = buf[buf.length - 1];

			if (lastChar === "\t") {
				buf = "";
				if (validateField(fields[active], states[active])) {
					active = (active + 1) % fields.length;
				}
				render();
			} else if (lastChar === "\r" || lastChar === "\n") {
				buf = "";
				const ok = validateField(fields[active], states[active]);
				if (active === fields.length - 1) {
					if (ok) {
						// Ensure all fields pass validation before submitting.
						for (let i = 0; i < fields.length; i++) {
							if (!validateField(fields[i], states[i])) {
								active = i;
								render();
								return;
							}
						}
						finalize();
					} else {
						render();
					}
				} else if (ok) {
					active++;
					render();
				} else {
					render();
				}
			} else if (lastChar === "\x03") {
				onCancel?.();
				cleanup();
				stdout.write("\n");
				process.exit(130);
			} else {
				const field = fields[active];
				const state = states[active];
				if (!isSelectField(field)) {
					if (lastChar === "\x7f" || lastChar === "\x08") {
						if (state.cursorPos > 0) {
							state.buf =
								state.buf.slice(0, state.cursorPos - 1) +
								state.buf.slice(state.cursorPos);
							state.cursorPos--;
							state.error = "";
						}
						buf = "";
						render();
					} else if (lastChar === "\x7f" || lastChar === "\x08" || lastChar === "\x04") {
						buf = "";
					} else {
						const printable = text.replace(/[\u0000-\u001f\u007f]/g, "");
						if (printable) {
							state.buf =
								state.buf.slice(0, state.cursorPos) +
								printable +
								state.buf.slice(state.cursorPos);
							state.cursorPos += Array.from(printable).length;
							state.error = "";
						}
						buf = "";
						render();
					}
				} else {
					buf = "";
				}
			}
		}

		stdin.setRawMode(true);
		stdin.setEncoding("utf8");
		stdin.on("data", onData);
		render();
	});
}
