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
	const {
		choices,
		pageSize = 10,
		colors: colorsOverride,
		wheelSensitivity: wheelSensitivityOption,
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
					bounds: {
						left: 0,
						top: 1 + msgRowDelta + 1 + i,
						width: 999,
						height: 1,
					},
					data: { choiceIndex: idx },
				});
				clickableAreaIds.add(areaId);

				registerHoverableArea({
					id: `hover-${areaId}`,
					type: "select",
					bounds: {
						left: 0,
						top: 1 + msgRowDelta + 1 + i,
						width: 999,
						height: 1,
					},
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

			// Process every SGR mouse sequence in arrival order so a
			// single chunk with several wheel ticks (fast scroll)
			// advances the cursor by the full burst count rather
			// than just the last tick. This matches the `multiselect`
			// and `tree` integration so wheel bursts behave identically
			// across all three interactive prompts.
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
							if (
								actualIndex >= 0 &&
								actualIndex < choices.length &&
								!choices[actualIndex].disabled
							) {
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
						// Only mark renderNeeded when the hover index
						// actually changed — gating on `lastMove !== null`
						// would force a redraw for repeated motion events
						// landing on the same coordinate (the pre-refactor
						// legacy contract that the `does not re-render when
						// hovering same item` test pins).
						renderNeeded = true;
					}
				}

				if (renderNeeded) {
					render();
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
