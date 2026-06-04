import stringWidth from "string-width";

const ANSI_RE =
	/[\u001b\u009b](?:\[[0-9;:<=>?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\-_])/g;

export function stripAnsi(s: string): string {
	return s.replace(ANSI_RE, "");
}

export function visibleLength(s: string): number {
	return stringWidth(s);
}

export function padCenter(s: string, w: number): string {
	const len = visibleLength(s);
	const pad = Math.max(0, w - len);
	return " ".repeat(Math.floor(pad / 2)) + s + " ".repeat(Math.ceil(pad / 2));
}

export function fitWidth(s: string, w: number): string {
	const len = visibleLength(s);
	if (len >= w) return s;
	return s + " ".repeat(w - len);
}

export function padRight(s: string, w: number): string {
	return fitWidth(s, w);
}

export function terminalWidth(): number {
	if (typeof process !== "undefined" && process.stdout?.columns) {
		return process.stdout.columns;
	}
	return 80;
}

interface Token {
	type: "ansi" | "word" | "space" | "newline";
	value: string;
	width: number;
}

export function tokenizeAnsi(text: string): Token[] {
	const tokens: Token[] = [];
	const ansiRegex =
		/^(?:[\u001b\u009b](?:\[[0-9;:<=>?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\-_]))/;

	let i = 0;
	let currentWord = "";
	let currentWordWidth = 0;

	const flushWord = () => {
		if (currentWord) {
			tokens.push({
				type: "word",
				value: currentWord,
				width: currentWordWidth,
			});
			currentWord = "";
			currentWordWidth = 0;
		}
	};

	while (i < text.length) {
		const remaining = text.slice(i);
		const ansiMatch = remaining.match(ansiRegex);

		if (ansiMatch) {
			flushWord();
			tokens.push({ type: "ansi", value: ansiMatch[0], width: 0 });
			i += ansiMatch[0].length;
		} else {
			const char = text[i];
			if (char === "\n") {
				flushWord();
				tokens.push({ type: "newline", value: "\n", width: 0 });
				i++;
			} else if (char === " " || char === "\t") {
				flushWord();
				let spaces = "";
				let spacesWidth = 0;
				while (i < text.length && (text[i] === " " || text[i] === "\t")) {
					spaces += text[i];
					spacesWidth += text[i] === "\t" ? 8 : 1;
					i++;
				}
				tokens.push({ type: "space", value: spaces, width: spacesWidth });
			} else {
				let charStr = char;
				const code = text.charCodeAt(i);
				if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
					charStr += text[i + 1];
					i++;
				}
				currentWord += charStr;
				currentWordWidth += visibleLength(charStr);
				i++;
			}
		}
	}
	flushWord();
	return tokens;
}

export function wrapAnsiWord(text: string, maxWidth: number): string[] {
	if (maxWidth <= 0) return [text];
	const tokens = tokenizeAnsi(text);

	const lines: string[] = [];
	let currentLine = "";
	let currentWidth = 0;
	const activeStyles = new Set<string>();

	let pendingSpace = "";
	let pendingSpaceWidth = 0;

	const startNewLine = () => {
		if (activeStyles.size > 0) {
			currentLine += "\u001b[0m";
		}
		lines.push(currentLine);
		currentLine = Array.from(activeStyles).join("");
		currentWidth = 0;
		pendingSpace = "";
		pendingSpaceWidth = 0;
	};

	for (let idx = 0; idx < tokens.length; idx++) {
		const token = tokens[idx];

		if (token.type === "newline") {
			startNewLine();
		} else if (token.type === "ansi") {
			currentLine += token.value;
			if (token.value === "\u001b[0m" || token.value === "\u001b[m") {
				activeStyles.clear();
			} else if (
				token.value.startsWith("\u001b[") &&
				token.value.endsWith("m")
			) {
				activeStyles.add(token.value);
			}
		} else if (token.type === "space") {
			if (currentWidth > 0) {
				pendingSpace = token.value;
				pendingSpaceWidth = token.width;
			}
		} else {
			if (token.width <= maxWidth) {
				if (currentWidth + pendingSpaceWidth + token.width <= maxWidth) {
					if (pendingSpace) {
						currentLine += pendingSpace;
						currentWidth += pendingSpaceWidth;
						pendingSpace = "";
						pendingSpaceWidth = 0;
					}
					currentLine += token.value;
					currentWidth += token.width;
				} else {
					startNewLine();
					currentLine += token.value;
					currentWidth += token.width;
				}
			} else {
				if (pendingSpace && currentWidth + pendingSpaceWidth < maxWidth) {
					currentLine += pendingSpace;
					currentWidth += pendingSpaceWidth;
					pendingSpace = "";
					pendingSpaceWidth = 0;
				} else if (pendingSpace) {
					startNewLine();
				}

				let i = 0;
				while (i < token.value.length) {
					let charStr = token.value[i];
					const code = token.value.charCodeAt(i);
					if (code >= 0xd800 && code <= 0xdbff && i + 1 < token.value.length) {
						charStr += token.value[i + 1];
						i++;
					}
					const charWidth = visibleLength(charStr);

					if (currentWidth + charWidth > maxWidth) {
						startNewLine();
					}
					currentLine += charStr;
					currentWidth += charWidth;
					i++;
				}
			}
		}
	}

	if (currentLine || lines.length === 0) {
		if (activeStyles.size > 0 && !currentLine.endsWith("\u001b[0m")) {
			currentLine += "\u001b[0m";
		}
		lines.push(currentLine);
	}

	return lines;
}

let cachedReadline: typeof import("node:readline") | undefined;

/**
 * Writes `text` to `stream` (default stdout), overwriting the current line.
 * Useful for spinners, progress bars, countdowns — anything that updates in-place.
 *
 * @example
 * renderLine(colors.cyan(`Progress: ${percent}%`))
 * renderLine(colors.red('Error!'), process.stderr)
 */
export function renderLine(
	text: string,
	stream: NodeJS.WriteStream = process.stdout,
): void {
	if (stream.isTTY) {
		if (!cachedReadline) {
			cachedReadline =
				require("node:readline") as typeof import("node:readline");
		}
		cachedReadline.cursorTo(stream, 0);
		cachedReadline.clearLine(stream, 0);
	}
	stream.write(text);
}

/**
 * Writes `text` + newline to `stream` (default stdout).
 * Use after a series of `renderLine()` calls to finalize output.
 *
 * @example
 * renderLine(colors.cyan('Loading...'))
 * // ... later
 * renderStatic(colors.green('Done!'))
 */
export function renderStatic(
	text: string,
	stream: NodeJS.WriteStream = process.stdout,
): void {
	stream.write(text + "\n");
}
