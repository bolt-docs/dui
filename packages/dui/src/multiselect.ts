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
	/**
	 * How many rows the cursor advances per wheel tick. Defaults
	 * to 1 (one tick = one row). Values `< 1` (including 0 and
	 * negatives) are coerced to 1, so 3 means one tick moves the
	 * cursor three rows. Wheel never toggles the checkbox — it
	 * only scrolls. Fractional values are floored; use integer
	 * values only.
	 */
	wheelSensitivity?: number;
	/**
	 * When `true`, the user can press-and-drag a row to reorder
	 * the list. Off by default to preserve the legacy contract
	 * that the choices array order is preserved end-to-end.
	 *
	 * Semantics:
	 * - Press left mouse button on a row → starts the drag; the
	 *   row gets the `multiselect.dragSource` color.
	 * - Move to another row → that row gets the
	 *   `multiselect.dropTarget` color as a live preview.
	 * - Release on a different enabled row → the dragged row
	 *   MOVES (not swaps) to that position: elements between the
	 *   source and the target shift up by one to make room.
	 * - Release on a disabled row, the same row, or outside any
	 *   row → drag is cancelled (no reorder).
	 * - Release without dragging (i.e. press and release on the
	 *   same row) → behaves as a click: toggles the checkbox.
	 *
	 * The user's `choices` array is never mutated. The component
	 * keeps an internal copy (`activeChoices`) and returns
	 * `.value` entries from that copy, so the original input
	 * keeps its declared order even if the user reordered.
	 *
	 * Checked-state is preserved across a move: the element that
	 * was at the source index retains its checked flag at its
	 * new index, and any rows that fell inside the splice
	 * window follow their new indices in BOTH directions
	 * (downward drag → rows between source and target shift up
	 * by one; upward drag → rows between target and source shift
	 * down by one). The cursor behaves the same way: it stays
	 * visually pinned to whichever logical row it was on
	 * before the move, even though the underlying absolute
	 * index may shift.
	 */
	enableDragReorder?: boolean;
	/**
	 * When `true`, typing filters the choices with fuzzy matching
	 * (Backspace edits the query, Escape clears it). While a query is
	 * active, Space types into the query instead of toggling; with an
	 * empty query Space toggles as usual. Mutually exclusive with
	 * `enableDragReorder` — when both are set, searchable wins.
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
		checked?: ColorStyle;
		label?: ColorStyle;
		message?: ColorStyle;
		dragSource?: ColorStyle;
		dropTarget?: ColorStyle;
	};
}

// Modern Unicode symbols for interactive prompt elements.
// ◆ (U+25C6) — filled diamond as cursor pointer, more visible than ❯
// ◉ (U+25C9) — fisheye for checked state, modern checkbox look
// ○ (U+25CB) — white circle for unchecked state, clean and minimal
const POINTER = "\u25c6";
const CHECKED = "\u25c9";
const UNCHECKED = "\u25cb";

export async function multiselect<T = string>(
	message: string,
	options: MultiselectOptions<T>,
): Promise<T[]> {
	const {
		choices,
		pageSize = 10,
		required = false,
		colors: colorsOverride,
		wheelSensitivity: wheelSensitivityOption,
		enableDragReorder = false,
		searchable = false,
		onCancel,
	} = options;

	if (!choices.length) {
		throw new Error("Multiselect requires at least one choice");
	}

	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		return nonInteractiveMultiselect(message, choices, required);
	}

	const wheelSensitivity = Math.max(1, Math.floor(wheelSensitivityOption ?? 1));
	return interactiveMultiselect(
		message,
		choices,
		pageSize,
		required,
		colorsOverride,
		wheelSensitivity,
		enableDragReorder,
		searchable,
		onCancel,
	);
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
					.filter(
						(idx) => idx >= 0 && idx < choices.length && !choices[idx].disabled,
					);

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
	wheelSensitivity: number,
	enableDragReorder: boolean,
	searchable: boolean,
	onCancel: (() => void) | undefined,
): Promise<T[]> {
	return new Promise<T[]>((resolve, reject) => {
		const stdin = process.stdin;
		const stdout = process.stdout;
		const theme = getConfig().theme;

		enableMouse();
		enableMouseMove();

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
		// Resolve drag colours even when drag is disabled so the
		// defaults are still initialised consistently and the
		// theme system exercises every multiselect slot exactly
		// once on entry. The render path gates the actual use of
		// these on `enableDragReorder` so a user that didn't opt
		// in never sees them.
		const dragSourceColor = resolveColor(
			"multiselect.dragSource",
			theme,
			colorsOverride?.dragSource,
		).apply;
		const dropTargetColor = resolveColor(
			"multiselect.dropTarget",
			theme,
			colorsOverride?.dropTarget,
		).apply;

		// Internal mutable copy of the user's `choices`. When
		// `enableDragReorder` is on, drag-and-drop splices/inserts
		// into THIS array instead of mutating the caller's array.
		// The returned `value`s come from this copy too, so the
		// user-visible order reflects any reordering the user
		// performed. Non-interactive and disabled-drag modes
		// never splice, so the copy is byte-identical to the input.
		const activeChoices = choices.slice();

		let checked = new Set<number>();
		for (let i = 0; i < activeChoices.length; i++) {
			if (activeChoices[i].checked) checked.add(i);
		}
		// `checked` is `let` rather than `const` so the
		// drag-and-drop MOVE handler can reassign it to a fresh
		// `new Set<number>()` after splicing an element across
		// `activeChoices`. Without the reassign, the splice
		// would invalidate the indices stored in the set
		// (e.g. moving index 2 to index 4 would leave the set
		// pointing at the wrong row).

		const clickableAreaIds = new Set<string>();
		const hoverableAreaIds = new Set<string>();

		let cursor = 0;
		let hoveredIndex: number | null = null;
		let offset = 0;
		let done = false;
		let linesRendered = 0;
		let buf = "";
		let query = "";
		let filtered: number[] | null = null;

		// Drag-and-drop state. `dragSource` is the index of the
		// row the user pressed; `dragHover` is the row the cursor
		// is currently over during the drag (live preview of
		// where the drop would land). Both are null when no drag
		// is in progress. The render path uses them to apply
		// `dragSourceColor` / `dropTargetColor` only when
		// `enableDragReorder` is true; otherwise the variables
		// stay null and the render branch is dead code.
		let dragSource: number | null = null;
		let dragHover: number | null = null;

		function totalCount(): number {
			return filtered ? filtered.length : activeChoices.length;
		}

		function itemAt(pos: number): { idx: number; choice: MultiselectChoice<T> } | undefined {
			if (filtered) {
				if (pos < 0 || pos >= filtered.length) return undefined;
				const idx = filtered[pos];
				return { idx, choice: activeChoices[idx] };
			}
			if (pos < 0 || pos >= activeChoices.length) return undefined;
			return { idx: pos, choice: activeChoices[pos] };
		}

		function resetFilter() {
			filtered = null;
			if (query) {
				const hits = filterFuzzy(query, activeChoices, (c) => c.label);
				filtered = hits ? hits.map((h) => activeChoices.indexOf(h.item)) : [];
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

		// Map an OLD index through the splice-based MOVE(src, dst)
		// semantics so the cursor and the `checked` set stay
		// pinned to the same LOGICAL choice across a drag.
		//
		// The MOVE is implemented as
		//   activeChoices.splice(src, 1);
		//   activeChoices.splice(dst, 0, moved);
		// which yields the following OLD→NEW mappings:
		//
		//   downward drag (src < dst):
		//     c < src          → c          (no shift)
		//     c === src        → dst        (drag source follows)
		//     src < c <= dst   → c - 1      (slice window shifts down)
		//     c > dst          → c          (no shift)
		//
		//   upward drag (src > dst):
		//     c < dst          → c          (no shift)
		//     dst <= c < src   → c + 1      (insertion pushes up)
		//     c === src        → dst        (drag source follows)
		//     c > src          → c          (no shift)
		//
		// The cursor that was NOT on the dragged row therefore
		// "follows" its original row's new index — the cursor
		// stays visually pinned to the same choice even though
		// the absolute index may shift. This matches the file
		// manager UX the JSDoc on `enableDragReorder` promises.
		function remapIndex(c: number, src: number, dst: number): number {
			if (c === src) return dst;
			if (src < dst) {
				if (c > src && c <= dst) return c - 1;
			} else if (src > dst) {
				if (c >= dst && c < src) return c + 1;
			}
			return c;
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
				? filtered
						.slice(offset, offset + effective)
						.map((idx) => ({ idx, choice: activeChoices[idx] }))
				: activeChoices
						.slice(offset, offset + effective)
						.map((choice, i) => ({ idx: offset + i, choice }));
			const lines: string[] = [];

			const help = required
				? searchable
					? "(Type to filter, arrows + space to toggle, enter to confirm)"
					: "(Use arrow keys + space, click to toggle, enter to confirm)"
				: searchable
					? "(Type to filter, arrows + space to toggle)"
					: "(Use arrow keys + space, click to toggle)";
			const msgLine = `${messageColor(`? ${message}`)} ${colors.dim(help)}`;
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
				const isChecked = checked.has(idx);
				const isHovered = pos === hoveredIndex;
				// Drag visuals: the source row is the one the user
				// pressed; the drop target is the row currently
				// under the cursor during the drag. They're
				// mutually exclusive visually (a row can't be both
				// the source and its own drop target). The `&&`
				// after `enableDragReorder` keeps the hot path
				// cheap when the feature is off: a single boolean
				// skip instead of an always-on ternary.
				const isDragSource =
					enableDragReorder && idx === dragSource;
				const isDropTarget =
					enableDragReorder &&
					idx === dragHover &&
					idx !== dragSource;
				const pointer = isCursor ? `${pointerColor(POINTER)} ` : "  ";
				const checkbox = isChecked
					? checkedColor(CHECKED)
					: colors.dim(UNCHECKED);
				const highlighted = filtered && query;

				let label: string;
				if (choice.disabled) {
					label = colors.dim(`${checkbox} ${choice.label} (disabled)`);
				} else if (isDragSource) {
					label = `${checkbox} ${dragSourceColor(choice.label)}`;
				} else if (isDropTarget) {
					label = `${checkbox} ${dropTargetColor(choice.label)}`;
				} else if (isHovered) {
					label = highlighted
						? `${checkbox} ${highlightFuzzy(query, choice.label, (ch) =>
								applyClass("hover", selectedColor(ch)),
							)}`
						: `${checkbox} ${applyClass("hover", selectedColor(choice.label))}`;
				} else if (isCursor) {
					label = highlighted
						? `${checkbox} ${highlightFuzzy(query, choice.label, (ch) => selectedColor(ch))}`
						: `${checkbox} ${selectedColor(choice.label)}`;
				} else {
					label = highlighted
						? `${checkbox} ${highlightFuzzy(query, choice.label, (ch) => selectedColor(ch))}`
						: `${checkbox} ${labelColor(choice.label)}`;
				}

				lines.push(`${pointer}${label}`);

				const areaId = `multiselect-${i}`;
				registerClickableArea({
					id: areaId,
					type: "multiselect",
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
				type: "multiselect",
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

		// While a drag is in flight, also register clickable /
		// hoverable areas for choices OUTSIDE the visible window
		// so the user can release on a row past the `pageSize`
		// boundary. Without this, `getClickedItem(x, 14)` returns
		// null once the visible window only covers `[0..9]` and the
		// release falls into the "drag cancelled" branch instead of
		// the MOVE branch — causing a regression where dropping a
		// row past the viewport left the dropped element off-screen
		// while the cursor stayed in view.
		//
		// The y-coordinate of the release maps directly to the
		// logical choice index via `top = 2 + (idx - offset)`
		// (assuming `msgRowDelta === 0`); the registered area's
		// `bounds.top` covers positions both above and below the
		// currently-scrolled window so any drop on the LIST's
		// logical extent — even one past the visible bottom — is
		// resolved to the right `choiceIndex`.
		if (enableDragReorder && dragSource !== null) {
			for (let idx = 0; idx < activeChoices.length; idx++) {
				if (idx >= offset && idx < offset + effective) continue;
				if (activeChoices[idx].disabled) continue;
				const areaTop = 1 + msgRowDelta + 1 + (idx - offset);
				const extId = `multiselect-ext-${idx}`;
				registerClickableArea({
					id: extId,
					type: "multiselect",
					bounds: { left: 0, top: areaTop, width: 999, height: 1 },
					data: { choiceIndex: idx },
				});
				clickableAreaIds.add(extId);
				registerHoverableArea({
					id: `hover-${extId}`,
					type: "multiselect",
					bounds: { left: 0, top: areaTop, width: 999, height: 1 },
					data: { choiceIndex: idx },
				});
				hoverableAreaIds.add(`hover-${extId}`);
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
		}

		function getSelected(): T[] {
			return [...checked].map((i) => activeChoices[i].value);
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
			const selected = getSelected();
			const summary =
				selected.length === 0
					? colors.dim("(none selected)")
					: `${selected.length} selected`;
			const finalLine = `${messageColor(`? ${message}`)} ${summary}\n`;
			if (linesRendered > 0) {
				stdout.write(`\x1b[${linesRendered}A`);
			} else {
				stdout.write("\x1b[H");
			}
			readline.cursorTo(stdout, 0);
			readline.clearScreenDown(stdout);
			stdout.write(finalLine);
			resolve(selected);
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
			// Instead of cancelling immediately, flag a pending escape;
			// if the NEXT chunk doesn't extend it, cancel then.
			// The flag is cleared on every `onData` call so a follow-up
			// byte within the same microtask prevents the cancel.
			if (buf === "\x1b") {
				// Defer cancel: wait for the next data chunk. If it's
				// part of a CSI sequence, buf will no longer be just
				// `"\x1b"` and we'll process it as an escape sequence.
				// If no more data arrives (or the next chunk doesn't
				// complete a CSI sequence), the fallthrough below will
				// clear buf and the next data event will re-evaluate.
				//
				// Use a microtask delay so the next poll round sees
				// whether more bytes are queued before committing to
				// cancel. This avoids the 200 ms timeout approach that
				// would make Escape feel sluggish.
				Promise.resolve().then(() => {
					if (done) return;
					// If buf is still exactly `"\x1b"` after the
					// microtask, no CSI sequence arrived — cancel.
					if (buf !== "\x1b") return;
					buf = "";
					// First Escape clears an active search query.
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
				const clickedIndices: number[] = [];
				let dragJustCommitted = false;
				let renderNeeded = false;

				for (const mouseEvent of mouseEvents) {
					if (mouseEvent.type === "click") {
						dragSource = null;
						dragHover = null;
						const clickedArea = getClickedItem(mouseEvent.x, mouseEvent.y);
						if (
							clickedArea &&
							clickedArea.type === "multiselect" &&
							clickedArea.data
						) {
							const actualIndex = clickedArea.data.choiceIndex as number;
							if (!activeChoices[actualIndex].disabled) {
								clickedIndices.push(actualIndex);
							}
						}
					} else if (mouseEvent.type === "press") {
						if (enableDragReorder && !searchable && mouseEvent.button === "left") {
							const pressedArea = getClickedItem(
								mouseEvent.x,
								mouseEvent.y,
							);
							if (
								pressedArea &&
								pressedArea.type === "multiselect" &&
								pressedArea.data
							) {
								const pressedIdx =
									pressedArea.data.choiceIndex as number;
								if (!activeChoices[pressedIdx].disabled) {
									dragSource = pressedIdx;
									dragHover = pressedIdx;
									renderNeeded = true;
								} else {
									dragSource = null;
									dragHover = null;
								}
							} else {
								dragSource = null;
								dragHover = null;
							}
						}
					} else if (mouseEvent.type === "release") {
						if (
							enableDragReorder &&
							!searchable &&
							mouseEvent.button === "left" &&
							dragSource !== null
						) {
							const releasedArea = getClickedItem(
								mouseEvent.x,
								mouseEvent.y,
							);
							const sourceIdx = dragSource;
							if (
								releasedArea &&
								releasedArea.type === "multiselect" &&
								releasedArea.data
							) {
								const targetIdx =
									releasedArea.data.choiceIndex as number;
								if (
									targetIdx !== sourceIdx &&
									!activeChoices[targetIdx].disabled
								) {
									const [moved] = activeChoices.splice(sourceIdx, 1);
									activeChoices.splice(targetIdx, 0, moved);

									const newChecked = new Set<number>();
									for (const oldIdx of checked) {
										newChecked.add(remapIndex(oldIdx, sourceIdx, targetIdx));
									}
									checked = newChecked;
									cursor = remapIndex(cursor, sourceIdx, targetIdx);

									if (targetIdx < offset) offset = targetIdx;
									else if (targetIdx >= offset + pageSize)
										offset = targetIdx - pageSize + 1;

									if (cursor < offset) offset = cursor;
									if (cursor >= offset + pageSize) offset = cursor - pageSize + 1;

									dragJustCommitted = true;
									renderNeeded = true;
								}
							}
							dragSource = null;
							dragHover = null;
						}
					} else if (mouseEvent.type === "move") {
						lastMove = mouseEvent;
						if (enableDragReorder && dragSource !== null) {
							const hoveredArea = getHoveredItem(
								mouseEvent.x,
								mouseEvent.y,
							);
							const newDragHover =
								hoveredArea && hoveredArea.data
									? (hoveredArea.data.choiceIndex as number)
									: null;
							if (newDragHover !== dragHover) {
								dragHover = newDragHover;
								renderNeeded = true;
							}
						}
					} else if (mouseEvent.type === "wheel") {
						if (mouseEvent.wheel === "up") wheelUp++;
						else if (mouseEvent.wheel === "down") wheelDown++;
						if (enableDragReorder && dragSource !== null) {
							dragSource = null;
							dragHover = null;
						}
					}
				}

				if (lastMove) {
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

				const wheelNet = wheelDown - wheelUp;
				if (wheelNet !== 0) {
					hoveredIndex = null;
					const magnitude = Math.abs(wheelNet) * wheelSensitivity;
					const dir = wheelNet < 0 ? -1 : 1;
					for (let i = 0; i < magnitude; i++) {
						cursor = clampCursor(cursor + dir);
					}
					if (cursor < offset) offset = cursor;
					if (cursor >= offset + pageSize) offset = cursor - pageSize + 1;
					renderNeeded = true;
				}

				for (const pos of clickedIndices) {
					cursor = pos;
					if (cursor < offset) offset = cursor;
					if (cursor >= offset + pageSize) offset = cursor - pageSize + 1;
					renderNeeded = true;
					if (dragJustCommitted) continue;
					const target = filtered ? filtered[cursor] : cursor;
					if (target === undefined) continue;
					if (checked.has(target)) {
						if (required && checked.size <= 1) continue;
						checked.delete(target);
					} else {
						checked.add(target);
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
				// Tab toggles the row under the cursor — Space is taken
				// by the search query, so Tab is the keyboard toggle.
				if (lastChar === "\t") {
					buf = "";
					const target = filtered ? filtered[cursor] : cursor;
					if (target !== undefined && !activeChoices[target].disabled) {
						if (checked.has(target)) {
							if (required && checked.size <= 1) {
								render();
								return;
							}
							checked.delete(target);
						} else {
							checked.add(target);
						}
					}
					render();
					return;
				}
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

			if (lastChar === " ") {
				buf = "";
				// While a search query is active, Space types into the
				// query (space-in-query filtering); with an empty query
				// it toggles the checkbox as usual.
				if (searchable && query.length > 0) {
					query += " ";
					resetFilter();
					render();
					return;
				}
				const target = filtered ? filtered[cursor] : cursor;
				if (target !== undefined && !activeChoices[target].disabled) {
					if (checked.has(target)) {
						if (required && checked.size <= 1) {
							render();
							return;
						}
						checked.delete(target);
					} else {
						checked.add(target);
					}
				}
				render();
			} else if (lastChar === "\r" || lastChar === "\n") {
				buf = "";
				if (required && checked.size === 0) {
					render();
					return;
				}
				finalize();
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
