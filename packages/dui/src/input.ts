import * as readline from "node:readline";
import { colors } from "./color";
import { getConfig } from "./config";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";
import { stripAnsi } from "./utils";

export interface InputOptions {
	default?: string;
	placeholder?: string;
	validate?: (value: string) => string | true;
	colors?: {
		message?: ColorStyle;
		value?: ColorStyle;
		placeholder?: ColorStyle;
		error?: ColorStyle;
	};
}

export async function input(
	message: string,
	options?: InputOptions,
): Promise<string> {
	const {
		default: defaultValue,
		placeholder,
		validate,
		colors: colorsOverride,
	} = options ?? {};

	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		return new Promise<string>((resolve) => {
			const hint = defaultValue !== undefined
				? ` (${defaultValue})`
				: "";
			rl.question(`${message}${hint}: `, (answer) => {
				rl.close();
				const value = answer.trim() || defaultValue || "";
				if (validate) {
					const result = validate(value);
					if (result !== true) {
						console.log(colors.red(`✖ ${result}`));
						resolve(value);
						return;
					}
				}
				resolve(value);
			});
		});
	}

	return interactiveInput(message, defaultValue, placeholder, validate, colorsOverride);
}

function interactiveInput(
	message: string,
	defaultValue: string | undefined,
	placeholder: string | undefined,
	validate: ((value: string) => string | true) | undefined,
	colorsOverride: InputOptions["colors"],
): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const stdin = process.stdin;
		const stdout = process.stdout;
		const theme = getConfig().theme;

		const messageColor = resolveColor(
			"input.message",
			theme,
			colorsOverride?.message,
		).apply;
		const valueColor = resolveColor(
			"input.value",
			theme,
			colorsOverride?.value,
		).apply;
		const placeholderColor = resolveColor(
			"input.placeholder",
			theme,
			colorsOverride?.placeholder,
		).apply;
		const errorColor = resolveColor(
			"input.error",
			theme,
			colorsOverride?.error,
		).apply;

		let buf = defaultValue ?? "";
		let cursorPos = buf.length;
		let errorMsg = "";
		let done = false;
		let linesRendered = 0;

		function validateBuf(): boolean {
			if (!validate) return true;
			const result = validate(buf);
			if (result !== true) {
				errorMsg = result;
				return false;
			}
			errorMsg = "";
			return true;
		}

		function render() {
			const promptLine = `${messageColor(`? ${message}`)}`;
			const displayValue = buf
				? valueColor(buf)
				: placeholder
					? placeholderColor(colors.dim(placeholder))
					: "";
			const errorLine = errorMsg
				? `  ${errorColor(`✖ ${errorMsg}`)}`
				: "";

			const lines: string[] = [];
			const valueLine = `${promptLine} ${displayValue}`;
			lines.push(valueLine);
			if (errorLine) lines.push(errorLine);

			const output = lines.join("\n");

			if (linesRendered > 0) {
				readline.moveCursor(stdout, 0, -linesRendered);
			}
			readline.cursorTo(stdout, 0);
			readline.clearScreenDown(stdout);
			stdout.write(output);
			linesRendered = lines.length;

			// Position cursor after the prompt text in the input line
			const promptPrefix = `${stripAnsi(promptLine)} `;
			const prefixLen = promptPrefix.length;
			const cursorOffset = prefixLen + buf.slice(0, cursorPos).length;
			readline.cursorTo(stdout, cursorOffset);
		}

		function cleanup() {
			if (done) return;
			done = true;
			stdin.setRawMode(false);
			stdin.removeListener("keypress", onKeypress);
		}

		function finalize() {
			validateBuf();
			cleanup();
			const finalLine = `${messageColor(`? ${message}`)} ${valueColor(buf)}\n`;
			readline.moveCursor(stdout, 0, -linesRendered);
			readline.cursorTo(stdout, 0);
			readline.clearScreenDown(stdout);
			stdout.write(finalLine);
			resolve(buf);
		}

		function onKeypress(_str: string, key: { name?: string; ctrl?: boolean; meta?: boolean }) {
			if (done) return;

			if (key.name === "return" || key.name === "enter") {
				if (!validateBuf()) {
					render();
					return;
				}
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
			} else if (key.name === "backspace") {
				if (cursorPos > 0) {
					buf = buf.slice(0, cursorPos - 1) + buf.slice(cursorPos);
					cursorPos--;
					errorMsg = "";
				}
				render();
			} else if (key.name === "delete") {
				if (cursorPos < buf.length) {
					buf = buf.slice(0, cursorPos) + buf.slice(cursorPos + 1);
					errorMsg = "";
				}
				render();
			} else if (key.name === "left") {
				if (cursorPos > 0) {
					cursorPos--;
					render();
				}
			} else if (key.name === "right") {
				if (cursorPos < buf.length) {
					cursorPos++;
					render();
				}
			} else if (key.name === "home") {
				cursorPos = 0;
				render();
			} else if (key.name === "end") {
				cursorPos = buf.length;
				render();
			} else if (key.name === "u" && key.ctrl) {
				// Ctrl+U: clear line
				buf = "";
				cursorPos = 0;
				errorMsg = "";
				render();
			} else if (key.name === "k" && key.ctrl) {
				// Ctrl+K: delete from cursor to end
				buf = buf.slice(0, cursorPos);
				errorMsg = "";
				render();
			} else if (_str && _str.length === 1 && !key.ctrl && !key.meta) {
				// Printable character
				buf = buf.slice(0, cursorPos) + _str + buf.slice(cursorPos);
				cursorPos++;
				errorMsg = "";
				render();
			}
		}

		readline.emitKeypressEvents(stdin);
		stdin.setRawMode(true);
		stdin.on("keypress", onKeypress);
		render();
	});
}


