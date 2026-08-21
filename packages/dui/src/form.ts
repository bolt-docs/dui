/**
 * Multi-field terminal form.
 *
 * Renders a compact vertical form — text, password, select, textarea,
 * and number fields — navigable with ↑/↓ or Tab, each with inline
 * editing, per-field validation, and a single submit that resolves an
 * object keyed by field id. Built for setup wizards, config prompts,
 * and any multi-question flow that shouldn't flash a full-screen
 * prompt per question.
 *
 * Keys:
 * - ↑/↓ or Tab — move between fields (Tab also validates first)
 * - ←/→ — edit position (text/textarea) or cycle the select field
 * - Enter — validate the current field and move on; on the last
 *   field, submit the form. In textarea fields, Enter inserts a
 *   newline — use Tab to advance instead.
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
 *     { id: "port", label: "Port", type: "number", min: 1, max: 65535 },
 *     { id: "notes", label: "Notes", type: "textarea", rows: 3 },
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

export interface FormNumberField {
	id: string;
	label: string;
	type: "number";
	default?: number;
	placeholder?: string;
	min?: number;
	max?: number;
	/** Extra validation — receives the parsed number. */
	validate?: (value: number) => string | true;
}

export interface FormTextareaField {
	id: string;
	label: string;
	type: "textarea";
	default?: string;
	placeholder?: string;
	/** Number of visible rows (default 3). */
	rows?: number;
	validate?: (value: string) => string | true;
}

export type FormField =
	| FormTextField
	| FormSelectField
	| FormNumberField
	| FormTextareaField;

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
	// text / password / number / textarea editing
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

function isNumberField(field: FormField): field is FormNumberField {
	return field.type === "number";
}

function isTextareaField(field: FormField): field is FormTextareaField {
	return field.type === "textarea";
}

function isEditableField(
	field: FormField,
): field is FormTextField | FormNumberField | FormTextareaField {
	return !isSelectField(field);
}

// ── Textarea helpers ─────────────────────────────────────────────

/** Number of lines in the buffer (at least 1). */
function textareaLineCount(buf: string): number {
	return buf.split("\n").length;
}

/** Convert absolute cursorPos → {line, col} (0-indexed). */
function textareaCursorLineCol(
	buf: string,
	cursorPos: number,
): { line: number; col: number } {
	let pos = 0;
	for (let i = 0; ; i++) {
		const nl = buf.indexOf("\n", pos);
		const end = nl === -1 ? buf.length : nl;
		if (cursorPos <= end || nl === -1) {
			return { line: i, col: cursorPos - pos };
		}
		pos = nl + 1;
	}
}

/** Convert {line, col} → absolute cursorPos, clamped to buf length. */
function textareaPosFromLineCol(
	buf: string,
	line: number,
	col: number,
): number {
	const lines = buf.split("\n");
	let pos = 0;
	for (let i = 0; i < lines.length; i++) {
		if (i === line) {
			return Math.min(pos + col, pos + lines[i].length);
		}
		pos += lines[i].length + 1; // +1 for the \n
	}
	return buf.length;
}

// ── Number helpers ───────────────────────────────────────────────

/**
 * Returns true when `s` could be a valid number (allows a leading
 * minus, digits, and at most one decimal point — the user may still
 * be typing, so an empty string or bare "-" are accepted during edit).
 */
function isPartialNumber(s: string): boolean {
	return /^-?\d*\.?\d*$/.test(s);
}

// ── Field init ───────────────────────────────────────────────────

function initState(field: FormField): FieldState {
	if (isSelectField(field)) {
		let selected = 0;
		if (field.default !== undefined) {
			const idx = field.choices.findIndex(
				(c) => c.value === field.default,
			);
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
	let buf: string;
	if (isNumberField(field)) {
		buf = field.default !== undefined ? String(field.default) : "";
	} else {
		buf = field.default ?? "";
	}
	return { value: buf, error: "", buf, cursorPos: buf.length, selected: 0 };
}

// ── Validation ───────────────────────────────────────────────────

function validateField(field: FormField, state: FieldState): boolean {
	if (isSelectField(field)) {
		if (field.required && state.selected < 0) {
			state.error = "A selection is required";
			return false;
		}
		state.error = "";
		return true;
	}

	if (isNumberField(field)) {
		const raw = state.buf.trim();
		if (raw === "" || raw === "-") {
			// Incomplete input — valid during editing, but final
			// validation should reject if the user hasn't typed a
			// number yet. Treat as "required" (non-empty number).
			if (field.min === undefined || field.min >= 0) {
				state.error = "A number is required";
				return false;
			}
			// Negative min allows bare "-" as a valid prefix; accept
			// it so the user can keep typing.
			state.error = "";
			return true;
		}
		const num = Number(raw);
		if (Number.isNaN(num)) {
			state.error = "Not a valid number";
			return false;
		}
		if (field.min !== undefined && num < field.min) {
			state.error = `Minimum is ${field.min}`;
			return false;
		}
		if (field.max !== undefined && num > field.max) {
			state.error = `Maximum is ${field.max}`;
			return false;
		}
		if (field.validate) {
			const result = field.validate(num);
			if (result !== true) {
				state.error = result;
				return false;
			}
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
): Promise<Record<string, unknown>> {
	const result: Record<string, unknown> = {};
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
				rl.question(
					`Enter number (1-${field.choices.length}): `,
					(answer) => {
						rl.close();
						const idx = Number.parseInt(answer.trim(), 10) - 1;
						const first = field.choices.find((c) => !c.disabled);
						const choice =
							idx >= 0 &&
							idx < field.choices.length &&
							!field.choices[idx].disabled
								? field.choices[idx]
								: first;
						result[field.id] = choice ? choice.value : "";
						resolve();
					},
				);
			});
		} else if (isTextareaField(field)) {
			await new Promise<void>((resolve) => {
				const hint =
					field.default !== undefined
						? ` (default: "${field.default}")`
						: "";
				console.log(
					`${field.label}${hint} — enter text, finish with an empty line:`,
				);
				const lines: string[] = [];
				const onLine = (line: string) => {
					if (line === "") {
						rl.removeListener("line", onLine);
						rl.close();
						const value = lines.join("\n");
						if (field.validate) {
							const v = field.validate(value);
							if (v !== true)
								console.log(colors.red(`  ✖ ${v}`));
						}
						result[field.id] = value;
						resolve();
						return;
					}
					lines.push(line);
				};
				rl.on("line", onLine);
			});
		} else {
			await new Promise<void>((resolve) => {
				const hint =
					field.default !== undefined
						? ` (${field.default})`
						: "";
				rl.question(`${field.label}${hint}: `, (answer) => {
					rl.close();
					if (isNumberField(field)) {
						const raw = answer.trim();
						const num =
							raw === "" ? (field.default ?? NaN) : Number(raw);
						if (field.validate && !Number.isNaN(num)) {
							const v = field.validate(num);
							if (v !== true)
								console.log(colors.red(`  ✖ ${v}`));
						}
						result[field.id] = Number.isNaN(num) ? "" : num;
					} else {
						const value =
							answer.trim() || field.default || "";
						if (field.validate) {
							const v = field.validate(value);
							if (v !== true)
								console.log(colors.red(`  ✖ ${v}`));
						}
						result[field.id] = value;
					}
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

		/** Number of extra rows the active textarea occupies below the
		 *  first content row (for cursor positioning). */
		function textareaExtraRows(): number {
			if (!isTextareaField(fields[active])) return 0;
			const state = states[active];
			const { line } = textareaCursorLineCol(state.buf, state.cursorPos);
			return line;
		}

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

			const help = "(arrows move, tab/enter to submit, esc to cancel)";
			const titleLine = `${messageColor(`? ${title ?? "Form"}`)} ${colors.dim(help)}`;
			lines.push(titleLine);

			for (let i = 0; i < fields.length; i++) {
				const field = fields[i];
				const state = states[i];
				const isActive = i === active;
				const pointer = isActive ? `${pointerColor(POINTER)} ` : "  ";
				const label = isActive
					? labelColor(field.label)
					: colors.dim(field.label);

				if (isSelectField(field)) {
					const choice = field.choices[state.selected];
					const label2 = choice ? choice.label : colors.dim("—");
					const display = isActive
						? `[ ${valueColor(label2)} ${colors.dim("\u25be")} ]`
						: `[ ${colors.dim(label2)} ]`;
					lines.push(`${pointer}${label}: ${display}`);
				} else if (isTextareaField(field)) {
					const rows = field.rows ?? 3;
					const contentLines = state.buf.split("\n");
					const placeholder = field.placeholder
						? colors.dim(field.placeholder)
						: "";

					// Render up to `rows` visible lines
					const visible = contentLines.slice(0, rows);
					const hasMore = contentLines.length > rows;
					const emptyLines = Math.max(0, rows - visible.length);

					if (isActive) {
						// Active: show editable content with current line highlighted
						const { line: curLine } = textareaCursorLineCol(
							state.buf,
							state.cursorPos,
						);
						for (let r = 0; r < rows; r++) {
							const content =
								r < visible.length
									? visible[r]
									: r === 0 && visible.length === 0
										? placeholder
										: "";
							const isCurLine = r === curLine;
							const prefix = `${pointer}${r === 0 ? label : " "}: `;
							const suffix =
								r === rows - 1 && hasMore
									? colors.dim(" ⋯")
									: "";
							if (isCurLine) {
								lines.push(
									`${prefix}${valueColor(content || " ")}${suffix}`,
								);
							} else {
								lines.push(
									`${prefix}${colors.dim(content || " ")}${suffix}`,
								);
							}
						}
						if (emptyLines > 0 && !hasMore) {
							for (let r = 0; r < emptyLines; r++) {
								lines.push(
									`${"  "}${label ? " " : ""}: ${colors.dim(" ")}`,
								);
							}
						}
					} else {
						// Inactive: collapsed single line preview
						const preview =
							state.buf.length > 0
								? state.buf.replace(/\n/g, " ")
								: placeholder;
						const display = `[ ${colors.dim(preview || " ")} ]`;
						lines.push(`${pointer}${label}: ${display}`);
					}
				} else {
					// text / password / number
					let display: string;
					const raw = state.buf;
					if (isNumberField(field)) {
						const shown =
							raw ||
							(field.placeholder
								? colors.dim(field.placeholder)
								: "");
						display = isActive
							? `[ ${valueColor(shown)} ]`
							: `[ ${colors.dim(shown)} ]`;
					} else {
						const visible2 =
							field.type === "password"
								? "\u2022".repeat(raw.length)
								: raw;
						const shown2 =
							visible2 ||
							(field.placeholder
								? colors.dim(field.placeholder)
								: "");
						display = isActive
							? `[ ${valueColor(shown2)} ]`
							: `[ ${colors.dim(shown2)} ]`;
					}
					lines.push(`${pointer}${label}: ${display}`);
				}

				if (state.error && isActive) {
					lines.push(
						`    ${errorColor(`\u2716 ${state.error}`)}`,
					);
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
			const extra = textareaExtraRows();
			const cursorRow =
				active === 0
					? 1 + extra
					: 1 + active + errorRowsBelow(active) + extra;
			let col: number;
			if (isTextareaField(fields[active])) {
				const { line, col: lineCol } = textareaCursorLineCol(
					state.buf,
					state.cursorPos,
				);
				// Textarea content starts after "◆ Label: " (3 + labelLen + 3)
				col = 3 + visibleLength(fields[active].label) + 3 + lineCol;
			} else {
				col =
					3 +
					visibleLength(fields[active].label) +
					3 +
					state.cursorPos;
			}
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
				if (isSelectField(field)) {
					result[field.id] =
						field.choices[states[i].selected]?.value;
				} else if (isNumberField(field)) {
					const num = Number(states[i].buf);
					result[field.id] = Number.isNaN(num) ? 0 : num;
				} else {
					result[field.id] = states[i].buf;
				}
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

			const text =
				typeof data === "string" ? data : data.toString("utf8");
			buf += text;

			if (buf.length > 256) {
				buf = buf.slice(-32);
			}

			if (buf.includes("\x1b[A")) {
				buf = "";
				const field = fields[active];
				const state = states[active];
				if (isTextareaField(field)) {
					// Move cursor up one line
					const { line, col } = textareaCursorLineCol(
						state.buf,
						state.cursorPos,
					);
					if (line > 0) {
						const prevLineLen = state.buf
							.split("\n")
							[line - 1]!.length;
						const newCol = Math.min(col, prevLineLen);
						state.cursorPos = textareaPosFromLineCol(
							state.buf,
							line - 1,
							newCol,
						);
						render();
					}
				} else if (isSelectField(field)) {
					// handled below
				} else {
					if (active > 0) active--;
					render();
				}
				if (!isTextareaField(field) && !isSelectField(field)) return;
				if (isTextareaField(field)) return;
			}
			if (buf.includes("\x1b[B")) {
				buf = "";
				const field = fields[active];
				const state = states[active];
				if (isTextareaField(field)) {
					// Move cursor down one line
					const { line, col } = textareaCursorLineCol(
						state.buf,
						state.cursorPos,
					);
					const totalLines = textareaLineCount(state.buf);
					if (line < totalLines - 1) {
						const nextLineLen = state.buf
							.split("\n")
							[line + 1]!.length;
						const newCol = Math.min(col, nextLineLen);
						state.cursorPos = textareaPosFromLineCol(
							state.buf,
							line + 1,
							newCol,
						);
						render();
					}
				} else {
					if (active < fields.length - 1) active++;
					render();
				}
				if (!isTextareaField(field)) return;
			}
			if (buf.includes("\x1b[C")) {
				buf = "";
				const field = fields[active];
				const state = states[active];
				if (isSelectField(field)) {
					cycleSelect(field, state, 1);
					render();
				} else if (state.cursorPos < state.buf.length) {
					state.cursorPos++;
					render();
				}
				return;
			}
			if (buf.includes("\x1b[D")) {
				buf = "";
				const field = fields[active];
				const state = states[active];
				if (isSelectField(field)) {
					cycleSelect(field, state, -1);
					render();
				} else if (state.cursorPos > 0) {
					state.cursorPos--;
					render();
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
				const isLast = active === fields.length - 1;
				if (isLast) {
					// Tab on the last field: validate all and submit
					if (validateField(fields[active], states[active])) {
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
				} else if (validateField(fields[active], states[active])) {
					active++;
					render();
				} else {
					render();
				}
			} else if (lastChar === "\r" || lastChar === "\n") {
				const field = fields[active];
				buf = "";

				// Textarea: Enter inserts a newline instead of advancing
				if (isTextareaField(field)) {
					const state = states[active];
					state.buf =
						state.buf.slice(0, state.cursorPos) +
						"\n" +
						state.buf.slice(state.cursorPos);
					state.cursorPos++;
					state.error = "";
					render();
					return;
				}

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
				if (isEditableField(field)) {
					if (lastChar === "\x7f" || lastChar === "\x08") {
						// Backspace
						if (isTextareaField(field) && state.cursorPos > 0) {
							// In textarea, backspace at position 0 of a
							// non-first line joins with the previous line.
							const before = state.buf.slice(
								0,
								state.cursorPos,
							);
							const lastNl = before.lastIndexOf("\n");
							if (
								state.cursorPos > 0 &&
								state.buf[state.cursorPos - 1] === "\n"
							) {
								// Remove the newline, joining lines
								state.buf =
									state.buf.slice(
										0,
										state.cursorPos - 1,
									) +
									state.buf.slice(state.cursorPos);
								state.cursorPos--;
							} else if (state.cursorPos > 0) {
								state.buf =
									state.buf.slice(
										0,
										state.cursorPos - 1,
									) +
									state.buf.slice(state.cursorPos);
								state.cursorPos--;
							}
							state.error = "";
						} else if (
							!isTextareaField(field) &&
							state.cursorPos > 0
						) {
							state.buf =
								state.buf.slice(0, state.cursorPos - 1) +
								state.buf.slice(state.cursorPos);
							state.cursorPos--;
							state.error = "";
						}
						buf = "";
						render();
					} else if (lastChar === "\x04") {
						// Ctrl+D: ignore
						buf = "";
					} else if (buf.startsWith("\x1b")) {
						// Unrecognized escape sequence — discard
						buf = "";
					} else {
						const printable = text.replace(
							/[\u0000-\u001f\u007f]/g,
							"",
						);
						if (printable) {
							if (isNumberField(field)) {
								// Only accept digits, minus, decimal point
								const filtered = printable.replace(
									/[^0-9.\-]/g,
									"",
								);
								// Allow at most one minus (at start) and one dot
								const cur = state.buf;
								const test =
									cur.slice(0, state.cursorPos) +
									filtered +
									cur.slice(state.cursorPos);
								if (
									isPartialNumber(test) &&
									filtered.length > 0
								) {
									state.buf = test;
									state.cursorPos += filtered.length;
									state.error = "";
								}
							} else {
								state.buf =
									state.buf.slice(0, state.cursorPos) +
									printable +
									state.buf.slice(state.cursorPos);
								state.cursorPos +=
									Array.from(printable).length;
								state.error = "";
							}
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
