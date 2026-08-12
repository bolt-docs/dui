/**
 * Command palette.
 *
 * The VS Code / Raycast-style action picker for the terminal: a
 * search line on top, a fuzzy-filtered list of actions below, arrow
 * navigation, and Enter to run. Built on the shared fuzzy matcher so
 * typing `gb` matches "Go to Browser" with the matches highlighted.
 *
 * Keys:
 * - Type — fuzzy filter by label and keywords
 * - ↑/↓ — move the cursor
 * - Enter — run the selected action (resolves with its value)
 * - Escape — clear the query; a second Escape cancels
 *
 * In non-TTY mode the palette prints a numbered list and reads a
 * number, so scripts can drive it via pipes.
 *
 * @example
 * ```ts
 * import { palette } from "@bdocs/dui"
 *
 * const action = await palette("Run command", {
 *   items: [
 *     { label: "Deploy to production", value: "deploy", description: "git push + release", shortcut: "d" },
 *     { label: "Run tests", value: "test", keywords: ["vitest", "unit"], shortcut: "t" },
 *   ],
 * })
 * ```
 */

import * as readline from "node:readline";
import { colors } from "./color";
import { getConfig } from "./config";
import { filterFuzzy, highlightFuzzy } from "./fuzzy";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";
import { computeLinesRendered, terminalWidth, visibleLength } from "./utils";

export interface PaletteItem<T = string> {
	label: string;
	value: T;
	description?: string;
	/** Extra terms the fuzzy matcher also considers. */
	keywords?: string[];
	/** Shortcut hint shown right-aligned (e.g. `"⌘K"` or `"d"`). */
	shortcut?: string;
	disabled?: boolean;
}

export interface PaletteOptions<T = string> {
	items: PaletteItem<T>[];
	pageSize?: number;
	placeholder?: string;
	/**
	 * Called once when the palette is cancelled — Escape with an empty
	 * query or Ctrl+C. Use it to restore terminal state or release
	 * resources before the promise rejects / the process exits.
	 */
	onCancel?: () => void;
	colors?: {
		message?: ColorStyle;
		label?: ColorStyle;
		match?: ColorStyle;
		description?: ColorStyle;
		shortcut?: ColorStyle;
	};
}

function searchText(item: PaletteItem<unknown>): string {
	return [item.label, ...(item.keywords ?? [])].join(" ");
}

/**
 * Run an interactive command palette and resolve with the selected
 * item's value. Rejects with `new Error("Cancelled")` on Escape when
 * the query is empty.
 */
export async function palette<T = string>(
	message: string,
	options: PaletteOptions<T>,
): Promise<T> {
	const { items, pageSize = 8, placeholder = "Type to search…", onCancel } = options;

	if (!items.length) {
		throw new Error("Palette requires at least one item");
	}

	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		return nonInteractivePalette(message, items);
	}

	return interactivePalette(
		message,
		items,
		pageSize,
		placeholder,
		onCancel,
		options.colors,
	);
}

function nonInteractivePalette<T>(
	message: string,
	items: PaletteItem<T>[],
): Promise<T> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise<T>((resolve) => {
		console.log(`\n${message}:`);
		for (let i = 0; i < items.length; i++) {
			const it = items[i];
			const d = it.disabled ? ` ${colors.dim("(disabled)")}` : "";
			const desc = it.description ? ` ${colors.dim(`— ${it.description}`)}` : "";
			console.log(`  ${i + 1}. ${it.label}${desc}${d}`);
		}

		rl.question(`Enter number (1-${items.length}): `, (answer) => {
			rl.close();
			const idx = Number.parseInt(answer.trim(), 10) - 1;
			if (idx >= 0 && idx < items.length && !items[idx].disabled) {
				resolve(items[idx].value);
			} else {
				const first = items.find((it) => !it.disabled);
				resolve((first as PaletteItem<T>).value);
			}
		});
	});
}

function interactivePalette<T>(
	message: string,
	items: PaletteItem<T>[],
	pageSize: number,
	placeholder: string,
	onCancel: (() => void) | undefined,
	colorsOverride: PaletteOptions["colors"],
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const stdin = process.stdin;
		const stdout = process.stdout;
		const theme = getConfig().theme;

		const messageColor = resolveColor(
			"palette.message",
			theme,
			colorsOverride?.message,
		).apply;
		const labelColor = resolveColor(
			"palette.label",
			theme,
			colorsOverride?.label,
		).apply;
		const matchColor = resolveColor(
			"palette.match",
			theme,
			colorsOverride?.match,
		).apply;
		const descriptionColor = resolveColor(
			"palette.description",
			theme,
			colorsOverride?.description,
		).apply;
		const shortcutColor = resolveColor(
			"palette.shortcut",
			theme,
			colorsOverride?.shortcut,
		).apply;

		let query = "";
		let cursor = 0;
		let offset = 0;
		let done = false;
		let linesRendered = 0;
		let buf = "";

		// Cached filtered results: positions in `items`.
		let filteredPositions: number[] | null = null;

		function computeFilter() {
			filteredPositions = null;
			if (query) {
				const hits = filterFuzzy(query, items, searchText);
				filteredPositions = hits ? hits.map((h) => items.indexOf(h.item)) : [];
			}
			cursor = 0;
			offset = 0;
		}

		function totalCount(): number {
			return filteredPositions ? filteredPositions.length : items.length;
		}

		function itemAt(pos: number): PaletteItem<T> | undefined {
			if (filteredPositions) {
				if (pos < 0 || pos >= filteredPositions.length) return undefined;
				return items[filteredPositions[pos]];
			}
			return items[pos];
		}

		function render() {
			if (done) return;
			const effective = Math.min(pageSize, totalCount());
			offset = Math.max(0, Math.min(offset, totalCount() - effective));

			const positions = filteredPositions ?? items.map((_, idx) => idx);
			const visible = positions
				.slice(offset, offset + effective)
				.map((pos) => ({ pos, item: items[pos] }));

			const lines: string[] = [];

			const msgLine = `${messageColor(`? ${message}`)}`;
			const searchLine = `${colors.cyan("\u25b8")} ${query || colors.dim(placeholder)}`;
			lines.push(msgLine);
			lines.push(`  ${searchLine}`);

			const msgRowDelta = Math.floor(visibleLength(msgLine) / terminalWidth());
			const searchRowCount = Math.max(
				1,
				Math.ceil(visibleLength(searchLine) / terminalWidth()),
			);
			const listTop = 1 + msgRowDelta + searchRowCount;

			for (let i = 0; i < visible.length; i++) {
				const { pos, item } = visible[i];
				const isCursor = pos === cursor;
				const pointer = isCursor ? `${matchColor("\u25c6")} ` : "  ";

				let label: string;
				if (item.disabled) {
					label = colors.dim(item.label);
				} else if (filteredPositions && query) {
					label = highlightFuzzy(query, item.label, (ch) => matchColor(ch));
				} else if (isCursor) {
					label = labelColor(item.label);
				} else {
					label = colors.dim(item.label);
				}

				const desc = item.description
					? ` ${descriptionColor(colors.dim(`— ${item.description}`))}`
					: "";
				const shortcut = item.shortcut
					? ` ${shortcutColor(colors.dim(item.shortcut))}`
					: "";

				const row = `${pointer}${label}${desc}${shortcut}`;
				lines.push(isCursor ? `${labelColor(row)}` : row);
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

			// Put the caret at the end of the search input.
			readline.moveCursor(stdout, 0, -(linesRendered - (listTop - 1)));
			readline.cursorTo(stdout, 4 + visibleLength(query));
		}

		function cleanup() {
			if (done) return;
			done = true;
			stdin.setRawMode(false);
			stdin.removeListener("data", onData);
		}

		function finalize() {
			cleanup();
			const chosen = itemAt(cursor);
			const finalLine = `${messageColor(`? ${message}`)} ${labelColor(
				chosen?.label ?? "",
			)}\n`;
			if (linesRendered > 0) {
				stdout.write(`\x1b[${linesRendered}A`);
			} else {
				stdout.write("\x1b[H");
			}
			readline.cursorTo(stdout, 0);
			readline.clearScreenDown(stdout);
			stdout.write(finalLine);
			resolve(chosen?.value as T);
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
				if (cursor > 0) {
					cursor--;
					if (cursor < offset) offset = cursor;
				}
				render();
				return;
			}
			if (buf.includes("\x1b[B")) {
				buf = "";
				if (cursor < totalCount() - 1) {
					cursor++;
					if (cursor >= offset + pageSize) offset = cursor - pageSize + 1;
				}
				render();
				return;
			}

			if (buf === "\x1b") {
				Promise.resolve().then(() => {
					if (done) return;
					if (buf !== "\x1b") return;
					buf = "";
					if (query.length > 0) {
						query = "";
						computeFilter();
						render();
						return;
					}
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

			if (lastChar === "\x7f" || lastChar === "\x08") {
				buf = "";
				if (query.length > 0) {
					query = query.slice(0, -1);
					computeFilter();
				}
				render();
			} else if (lastChar === "\r" || lastChar === "\n") {
				buf = "";
				const chosen = itemAt(cursor);
				if (chosen && !chosen.disabled) finalize();
			} else if (lastChar === "\x03") {
				onCancel?.();
				cleanup();
				stdout.write("\n");
				process.exit(130);
			} else {
				const printable = text.replace(/[\u0000-\u001f\u007f]/g, "");
				if (printable) {
					buf = "";
					query += printable;
					computeFilter();
				} else {
					buf = "";
				}
				render();
			}
		}

		stdin.setRawMode(true);
		stdin.setEncoding("utf8");
		stdin.on("data", onData);
		render();
	});
}
