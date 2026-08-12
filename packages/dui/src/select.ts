import * as readline from "node:readline";
import { colors } from "./color";
import { getConfig } from "./config";
import {
	disableMouse,
	enableMouse,
	enableMouseMove,
	getClickedItem,
	getHoveredItem,
	parseSGRMouseDataAll,
	registerClickableArea,
	registerHoverableArea,
	unregisterClickableArea,
	unregisterHoverableArea,
} from "./mouse";
import { filterFuzzy, highlightFuzzy } from "./fuzzy";
import { applyClass } from "./style";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";
import { computeLinesRendered, terminalWidth, visibleLength } from "./utils";

export interface SelectChoice<T = string> {
	label: string;
	value: T;
	disabled?: boolean;
}

export interface SelectOptions<T = string> {
	choices: SelectChoice<T>[];
	pageSize?: number;
	/**
	 * How many rows the cursor advances per wheel tick. Defaults
	 * to 1 (one tick = one row). Values `< 1` are coerced to 1,
	 * so 3 means one tick moves the cursor three rows. Useful
	 * for long lists where a single tick feels too granular.
	 */
	wheelSensitivity?: number;
	/**
	 * When `true`, typing filters the choices with fuzzy matching.
	 * Matched characters are highlighted, Backspace edits the query,
	 * and Escape clears it (a second Escape cancels). Off by default
	 * to keep the legacy key contract.
	 */
	searchable?: boolean;
	/**
	 * Called once when the prompt is cancelled — Escape (with an empty
	 * query) or Ctrl+C. Use it to restore terminal state or release
	 * resources before the promise rejects / the process exits.
	 */
	onCancel?: () => void;
	colors?: {
		pointer?: ColorStyle;
		selected?: ColorStyle;
		label?: ColorStyle;
		message?: ColorStyle;
	};
}

// ◆ (U+25C6) — filled diamond as cursor pointer, consistent with multiselect
const POINTER = "\u25c6";

export async function select<T = string>(
	message: string,
	options: SelectOptions<T>,
): Promise<T> {
	const {
		choices,
		pageSize = 10,
		colors: colorsOverride,
		wheelSensitivity: wheelSensitivityOption,
		searchable = false,
		onCancel,
	} = options;

	if (!choices.length) {
		throw new Error("Select requires at least one choice");
	}

	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		return nonInteractiveSelect(message, choices);
	}

	const wheelSensitivity = Math.max(1, Math.floor(wheelSensitivityOption ?? 1));
	return interactiveSelect(
		message,
		choices,
		pageSize,
		colorsOverride,
		wheelSensitivity,
		searchable,
		onCancel,
	);
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
	wheelSensitivity: number,
	searchable: boolean,
	onCancel: (() => void) | undefined,
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

		const MESSAGE_HELP = searchable
			? "(Type to filter, arrows to move, enter to select)"
			: "(Use arrow keys or click to select)";

		let cursor = 0;
		let hoveredIndex: number | null = null;
		const clickableAreaIds = new Set<string>();
		const hoverableAreaIds = new Set<string>();
		let offset = 0;
		let done = false;
		let linesRendered = 0;
		let buf = "";
		let query = "";
		let filtered: number[] | null = null;

		function totalCount(): number {
			return filtered ? filtered.length : choices.length;
		}

		function itemAt(pos: number): { idx: number; choice: SelectChoice<T> } | undefined {
			if (filtered) {
				if (pos < 0 || pos >= filtered.length) return undefined;
				const idx = filtered[pos];
				return { idx, choice: choices[idx] };
			}
			if (pos < 0 || pos >= choices.length) return undefined;
			return { idx: pos, choice: choices[pos] };
		}

		function resetFilter() {
			filtered = null;
			if (query) {
				const hits = filterFuzzy(query, choices, (c) => c.label);
				filtered = hits ? hits.map((h) => choices.indexOf(h.item)) : [];
			}
			cursor = 0;
			offset = 0;
			hoveredIndex = null;
		}

		function clampCursor(pos: number): number {
			const total = totalCount();
			if (total === 0) return 0;
			const p = ((pos % total) + total) % total;
			const item = itemAt(p);
			if (!item || !item.choice.disabled) return p;
			const dir = pos > cursor ? 1 : -1;
			let next = p;
			for (let i = 0; i < total; i++) {
				next = (((next + dir) % total) + total) % total;
				const it = itemAt(next);
				if (it && !it.choice.disabled) return next;
			}
			return cursor;
		}

		function render() {
			if (done) return;
			const effective = Math.min(pageSize, totalCount());
			offset = Math.max(0, Math.min(offset, totalCount() - effective));

			for (const id of clickableAreaIds) {
				unregisterClickableArea(id);
			}
			clickableAreaIds.clear();
			for (const id of hoverableAreaIds) {
				unregisterHoverableArea(id);
			}
			hoverableAreaIds.clear();

			const visible = filtered
				? filtered.slice(offset, offset + effective).map((idx) => ({ idx, choice: choices[idx] }))
				: choices
						.slice(offset, offset + effective)
						.map((choice, i) => ({ idx: offset + i, choice }));
			const lines: string[] = [];

			const msgLine = `${messageColor(`? ${message}`)} ${colors.dim(MESSAGE_HELP)}`;
			lines.push(msgLine);

			const filterLine = searchable
				? `  ${colors.cyan("\u25b8")} ${query}`
				: "";
			if (filterLine) lines.push(filterLine);

			const msgRowDelta = Math.floor(visibleLength(msgLine) / terminalWidth());
			const filterRowCount = filterLine
				? Math.max(1, Math.ceil(visibleLength(filterLine) / terminalWidth()))
				: 0;
			const listTop = 1 + msgRowDelta + filterRowCount;

			for (let i = 0; i < visible.length; i++) {
				const pos = offset + i;
				const { idx, choice } = visible[i];
				const isCursor = pos === cursor;
				const isHovered = pos === hoveredIndex;
				const prefix = isCursor ? `${pointerColor(POINTER)} ` : "  ";
				const highlighted = filtered && query;

				let label: string;
				if (choice.disabled) {
					label = colors.dim(`${choice.label} (disabled)`);
				} else if (isHovered) {
					label = highlighted
						? highlightFuzzy(query, choice.label, (ch) =>
								applyClass("hover", selectedColor(ch)),
						)
						: applyClass("hover", selectedColor(choice.label));
				} else if (isCursor) {
					label = highlighted
						? highlightFuzzy(query, choice.label, (ch) => selectedColor(ch))
						: selectedColor(choice.label);
				} else {
					label = highlighted
						? highlightFuzzy(query, choice.label, (ch) => selectedColor(ch))
						: labelColor(choice.label);
				}

				lines.push(`${prefix}${label}`);

				const areaId = `select-${i}`;
				registerClickableArea({
					id: areaId,
					type: "select",
					bounds: {
						left: 0,
						top: listTop + 1 + i,
						width: 999,
						height: 1,
					},
					data: { choiceIndex: pos },
				});
				clickableAreaIds.add(areaId);

				registerHoverableArea({
					id: `hover-${areaId}`,
					type: "select",
					bounds: {
						left: 0,
						top: listTop + 1 + i,
						width: 999,
						height: 1,
					},
					data: { choiceIndex: pos },
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
			const chosen = itemAt(cursor)?.choice ?? choices[0];
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

			// ── Arrow keys FIRST ──────────────────────────────────────
			// Check keyboard navigation BEFORE mouse events so arrow keys
			// are never eaten by mouse-tracking data arriving in the same
			// chunk. Mouse events are only processed when no arrow key
			// matched, ensuring keyboard always has priority.
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

			// ── Escape key (debounced) ────────────────────────────────
			// When `\x1b` arrives alone it might be the start of a CSI
			// sequence (arrow key, function key) split across chunks.
			// Instead of cancelling immediately, defer via microtask
			// so the next poll round sees whether more bytes arrive.
			if (buf === "\x1b") {
				Promise.resolve().then(() => {
					if (done) return;
					if (buf !== "\x1b") return;
					buf = "";
					// First Escape clears an active search query instead of
					// cancelling; a second Escape (now empty query) cancels.
					if (searchable && query.length > 0) {
						query = "";
						resetFilter();
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

			// ── Mouse events ──────────────────────────────────────────
			// Process SGR mouse sequences only after keyboard has been
			// checked. Mouse data is consumed from buf here so arrow key
			// bytes are preserved by the earlier checks.
			const mouseEvents = parseSGRMouseDataAll(buf);
			if (mouseEvents.length > 0) {
				buf = "";

				let wheelUp = 0;
				let wheelDown = 0;
				let lastMove: (typeof mouseEvents)[number] | null = null;
				// Multiple clicks in one chunk: pick the LAST click that
				// landed on an enabled choice, mirroring the legacy
				// single-click behaviour (finalize on hit). Earlier misses
				// are discarded because finalize is the terminal state.
				let lastEnabledClickIndex = -1;

				for (const mouseEvent of mouseEvents) {
					if (mouseEvent.type === "click") {
						const clickedArea = getClickedItem(mouseEvent.x, mouseEvent.y);
						if (
							clickedArea &&
							clickedArea.type === "select" &&
							clickedArea.data
						) {
							const actualIndex = clickedArea.data.choiceIndex as number;
							const clicked = itemAt(actualIndex);
							if (clicked && !clicked.choice.disabled) {
								lastEnabledClickIndex = actualIndex;
							}
						}
					} else if (mouseEvent.type === "move") {
						lastMove = mouseEvent;
					} else if (mouseEvent.type === "wheel") {
						// Wheel events behave identical to ↑/↓: wrap to
						// the opposite end and skip disabled choices.
						// Burst handling is the key fix — three wheel-up
						// ticks in one chunk move the cursor three rows,
						// not one.
						if (mouseEvent.wheel === "up") wheelUp++;
						else if (mouseEvent.wheel === "down") wheelDown++;
					}
				}

				// Click wins over wheel (the user's intent finalized,
				// so wheel-driven deltas wouldn't matter).
				if (lastEnabledClickIndex >= 0) {
					cursor = lastEnabledClickIndex;
					finalize();
					return;
				}

				let renderNeeded = false;
				const wheelNet = wheelDown - wheelUp;
				if (wheelNet !== 0) {
					hoveredIndex = null;
					// `wheelSensitivity` multiplies the per-burst magnitude
					// — with sensitivity=3 and wheelDown=2, the cursor
					// advances 6 rows. Sensitive values < 1 are already
					// coerced to 1 in `select(...)` so the loop count is
					// always a positive integer and disabled-skip still
					// fires per row via `clampCursor`.
					const magnitude = Math.abs(wheelNet) * wheelSensitivity;
					const dir = wheelNet < 0 ? -1 : 1;
					for (let i = 0; i < magnitude; i++) {
						cursor = clampCursor(cursor + dir);
					}
					if (cursor < offset) offset = cursor;
					if (cursor >= offset + pageSize) offset = cursor - pageSize + 1;
					renderNeeded = true;
				}

				if (lastMove !== null) {
					const hoveredArea = getHoveredItem(lastMove.x, lastMove.y);
					const newHovered =
						hoveredArea && hoveredArea.data
							? (hoveredArea.data.choiceIndex as number)
							: null;
					if (newHovered !== hoveredIndex) {
						hoveredIndex = newHovered;
						renderNeeded = true;
					}
				}

				if (renderNeeded) {
					render();
				}
				return;
			}

			// ── Searchable: feed printable characters into the query ──
			if (searchable) {
				const lastChar = buf[buf.length - 1];
				if (lastChar === "\x7f" || lastChar === "\x08") {
					buf = "";
					if (query.length > 0) {
						query = query.slice(0, -1);
						resetFilter();
						render();
					}
					return;
				}
				const printable = text.replace(/[\u0000-\u001f\u007f]/g, "");
				if (printable) {
					buf = "";
					query += printable;
					resetFilter();
					render();
					return;
				}
			}

			const lastChar = buf[buf.length - 1];

			if (lastChar === "\r" || lastChar === "\n") {
				buf = "";
				const current = itemAt(cursor);
				if (current && !current.choice.disabled) finalize();
			} else if (lastChar === "\x03") {
				onCancel?.();
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
