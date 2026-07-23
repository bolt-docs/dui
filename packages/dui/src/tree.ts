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

export interface TreeNode<T = string> {
	label: string;
	value?: T;
	disabled?: boolean;
	expanded?: boolean;
	children?: TreeNode<T>[];
}

export interface TreeOptions<T = string> {
	tree: TreeNode<T>[];
	pageSize?: number;
	initialExpanded?: boolean;
	/**
	 * How many rows the cursor advances per wheel tick. Defaults
	 * to 1 (one tick = one row). Values `< 1` (including 0 and
	 * negatives) are coerced to 1, so 3 means one tick moves the
	 * cursor three rows. The tree cursor is bounded at the ends
	 * (no wrap), so high values simply hit the ceiling faster.
	 * Fractional values are floored; use integer values only.
	 */
	wheelSensitivity?: number;
	colors?: {
		pointer?: ColorStyle;
		selected?: ColorStyle;
		label?: ColorStyle;
		message?: ColorStyle;
		branch?: ColorStyle;
	};
}

const POINTER = "\u276f";
const COLLAPSED = "\u25b6";
const EXPANDED = "\u25bc";

interface FlatItem<T> {
	label: string;
	value?: T;
	depth: number;
	isBranch: boolean;
	disabled: boolean;
	expanded: boolean;
	node: TreeNode<T>;
}

const MESSAGE_HELP = "(Use arrow keys, space to toggle, or click)";

export async function tree<T = string>(
	message: string,
	options: TreeOptions<T>,
): Promise<T | undefined> {
	const {
		tree: treeData,
		pageSize = 10,
		initialExpanded = false,
		colors: colorsOverride,
		wheelSensitivity: wheelSensitivityOption,
	} = options;

	if (!treeData.length) {
		throw new Error("Tree requires at least one node");
	}

	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		return nonInteractiveTree(message, treeData);
	}

	const wheelSensitivity = Math.max(1, Math.floor(wheelSensitivityOption ?? 1));
	return interactiveTree(
		message,
		treeData,
		pageSize,
		initialExpanded,
		colorsOverride,
		wheelSensitivity,
	);
}

function getFlat<T>(
	nodes: TreeNode<T>[],
	expanded: Set<TreeNode<T>>,
	depth = 0,
): FlatItem<T>[] {
	const result: FlatItem<T>[] = [];
	for (const node of nodes) {
		const isBranch = !!node.children?.length;
		const exp = expanded.has(node);
		result.push({
			label: node.label,
			value: node.value,
			depth,
			isBranch,
			disabled: !!node.disabled,
			expanded: exp,
			node,
		});
		if (isBranch && exp) {
			result.push(...getFlat(node.children!, expanded, depth + 1));
		}
	}
	return result;
}

function initExpanded<T>(
	nodes: TreeNode<T>[],
	expanded: Set<TreeNode<T>>,
	initialExpanded: boolean,
) {
	for (const node of nodes) {
		if (node.children?.length) {
			const expand =
				initialExpanded ||
				(node.expanded === undefined ? false : node.expanded);
			if (expand) expanded.add(node);
			initExpanded(node.children, expanded, initialExpanded);
		}
	}
}

function getAllLeaves<T>(
	nodes: TreeNode<T>[],
): { label: string; value?: T; disabled?: boolean }[] {
	const result: { label: string; value?: T; disabled?: boolean }[] = [];
	for (const node of nodes) {
		if (node.children?.length) {
			result.push(...getAllLeaves(node.children));
		} else {
			result.push({
				label: node.label,
				value: node.value,
				disabled: node.disabled,
			});
		}
	}
	return result;
}

function nonInteractiveTree<T>(
	message: string,
	treeData: TreeNode<T>[],
): Promise<T | undefined> {
	const leaves = getAllLeaves(treeData);
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise<T | undefined>((resolve) => {
		console.log(`\n${message}:`);
		for (let i = 0; i < leaves.length; i++) {
			const c = leaves[i];
			const d = c.disabled ? ` ${colors.dim("(disabled)")}` : "";
			console.log(`  ${i + 1}. ${c.label}${d}`);
		}

		rl.question(`Enter number (1-${leaves.length}): `, (answer) => {
			rl.close();
			const idx = parseInt(answer.trim(), 10) - 1;
			if (idx >= 0 && idx < leaves.length && !leaves[idx].disabled) {
				resolve(leaves[idx].value);
			} else {
				const first = leaves.find((c) => !c.disabled);
				resolve(first ? first.value : undefined);
			}
		});
	});
}

function interactiveTree<T>(
	message: string,
	treeData: TreeNode<T>[],
	pageSize: number,
	initialExpanded: boolean,
	colorsOverride: TreeOptions["colors"],
	wheelSensitivity: number,
): Promise<T | undefined> {
	return new Promise<T | undefined>((resolve, reject) => {
		const stdin = process.stdin;
		const stdout = process.stdout;
		const theme = getConfig().theme;

		enableMouse();
		enableMouseMove();

		const messageColor = resolveColor(
			"tree.message",
			theme,
			colorsOverride?.message,
		).apply;
		const pointerColor = resolveColor(
			"tree.pointer",
			theme,
			colorsOverride?.pointer,
		).apply;
		const selectedColor = resolveColor(
			"tree.selected",
			theme,
			colorsOverride?.selected,
		).apply;
		const labelColor = resolveColor(
			"tree.label",
			theme,
			colorsOverride?.label,
		).apply;
		const branchColor = resolveColor(
			"tree.branch",
			theme,
			colorsOverride?.branch,
		).apply;

		const expanded = new Set<TreeNode<T>>();
		initExpanded(treeData, expanded, initialExpanded);

		const clickableAreaIds = new Set<string>();
		const hoverableAreaIds = new Set<string>();

		let flat = getCurrentFlat();
		let cursor = 0;
		let hoveredIndex: number | null = null;
		let offset = 0;
		let done = false;
		let linesRendered = 0;
		let buf = "";

		function getCurrentFlat(): FlatItem<T>[] {
			return getFlat(treeData, expanded);
		}

		function rebuildFlat(fromNode?: TreeNode<T>) {
			flat = getCurrentFlat();
			if (fromNode) {
				const idx = flat.findIndex((f) => f.node === fromNode);
				if (idx >= 0) {
					cursor = idx;
					return;
				}
			}
			if (cursor >= flat.length && flat.length > 0) {
				cursor = flat.length - 1;
			}
		}

		function render() {
			if (done) return;
			const effective = Math.min(pageSize, flat.length);
			offset = Math.max(0, Math.min(offset, flat.length - effective));

			for (const id of clickableAreaIds) {
				unregisterClickableArea(id);
			}
			clickableAreaIds.clear();
			for (const id of hoverableAreaIds) {
				unregisterHoverableArea(id);
			}
			hoverableAreaIds.clear();

			const visible = flat.slice(offset, offset + effective);
			const lines: string[] = [];

			const msgLine = `${messageColor(`? ${message}`)} ${colors.dim(MESSAGE_HELP)}`;
			lines.push(msgLine);

			const msgRowDelta = Math.floor(visibleLength(msgLine) / terminalWidth());

			for (let i = 0; i < visible.length; i++) {
				const item = visible[i];
				const idx = i + offset;
				const isCursor = idx === cursor;
				const isHovered = idx === hoveredIndex;
				const indent = "  ".repeat(item.depth);
				const pointer = isCursor ? `${pointerColor(POINTER)} ` : "  ";

				let indicator: string;
				if (item.isBranch) {
					indicator = item.expanded
						? `${branchColor(EXPANDED)} `
						: `${branchColor(COLLAPSED)} `;
				} else {
					indicator = "  ";
				}

				let label: string;
				if (item.disabled) {
					label = colors.dim(`${indicator}${item.label} (disabled)`);
				} else if (isHovered) {
					label = `${indicator}${applyClass("hover", selectedColor(item.label))}`;
				} else if (isCursor) {
					label = `${indicator}${selectedColor(item.label)}`;
				} else {
					label = `${indicator}${labelColor(item.label)}`;
				}

				lines.push(`${indent}${pointer}${label}`);

				const areaId = `tree-${i}`;
				const row = 1 + msgRowDelta + 1 + i;
				registerClickableArea({
					id: areaId,
					type: "tree",
					bounds: { left: 0, top: row, width: 999, height: 1 },
					data: { flatIndex: idx },
				});
				clickableAreaIds.add(areaId);

				registerHoverableArea({
					id: `hover-${areaId}`,
					type: "tree",
					bounds: { left: 0, top: row, width: 999, height: 1 },
					data: { flatIndex: idx },
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
			const item = flat[cursor];
			const finalLine = `${messageColor(`? ${message}`)} ${selectedColor(item.label)}\n`;
			if (linesRendered > 0) {
				stdout.write(`\x1b[${linesRendered}A`);
			} else {
				stdout.write("\x1b[H");
			}
			readline.cursorTo(stdout, 0);
			readline.clearScreenDown(stdout);
			stdout.write(finalLine);
			resolve(item.value);
		}

		function handleTreeClick(flatIndex: number) {
			if (flatIndex < 0 || flatIndex >= flat.length) return;
			const item = flat[flatIndex];
			if (item.disabled) return;

			cursor = flatIndex;

			if (item.isBranch) {
				if (item.expanded) {
					expanded.delete(item.node);
				} else {
					expanded.add(item.node);
				}
				rebuildFlat();
				render();
			} else {
				finalize();
			}
		}

		function onData(data: string | Buffer) {
			if (done) return;

			const text = typeof data === "string" ? data : data.toString("utf8");
			buf += text;

			if (buf.length > 256) {
				buf = buf.slice(-32);
			}

			// Process every SGR mouse sequence in arrival order so a
			// single chunk with several wheel ticks (fast scroll in
			// a deep tree) advances the cursor by the full burst
			// count rather than just the last tick. Note that
			// `parseSGRMouseDataAll` calls internal emitMouseEvent
			// for each parsed sequence as a side effect, so external
			// subscribers via onMouseEvent see every tick too.
			const mouseEvents = parseSGRMouseDataAll(buf);
			if (mouseEvents.length > 0) {
				buf = "";

				let wheelUp = 0;
				let wheelDown = 0;
				let lastMove: (typeof mouseEvents)[number] | null = null;
				// Multiple clicks in one chunk toggle each in order;
				// each click looks up the freshly-rebuilt flat so a
				// branch-click that opens new items does not point
				// at a stale index.
				const clickCoordinates: Array<{ x: number; y: number }> = [];

				for (const mouseEvent of mouseEvents) {
					if (mouseEvent.type === "click") {
						clickCoordinates.push({ x: mouseEvent.x, y: mouseEvent.y });
					} else if (mouseEvent.type === "move") {
						lastMove = mouseEvent;
					} else if (mouseEvent.type === "wheel") {
						// Tree cursor is bounded [0, flat.length-1] (no
						// wrap). Each wheel tick still advances one
						// row, so a fast scroll cascades with no upper
						// bound on the burst size other than the array
						// end.
						if (mouseEvent.wheel === "up") wheelUp++;
						else if (mouseEvent.wheel === "down") wheelDown++;
					}
				}

				// Track whether anything visible actually changed so a
				// chunk of repeated motion events landing on the same
				// coordinate does NOT re-render (matches the legacy
				// `does not re-render when hovering same item` contract
				// that select and multiselect pin in their tests).
				let renderNeeded = false;

				if (lastMove) {
					const hoveredArea = getHoveredItem(lastMove.x, lastMove.y);
					const newHovered =
						hoveredArea && hoveredArea.data
							? (hoveredArea.data.flatIndex as number)
							: null;
					if (newHovered !== hoveredIndex) {
						hoveredIndex = newHovered;
						renderNeeded = true;
					}
				}

				const wheelNet = wheelDown - wheelUp;
				if (wheelNet !== 0) {
					hoveredIndex = null;
					// Tree has no wrap-around — cursor is bounded at
					// [0, flat.length - 1]. With sensitivity=N, one
					// tick advances (or retreats) N rows unless the
					// boundary is hit, in which case the remaining
					// steps are no-ops (clamped by `cursor > 0` /
					// `cursor < flat.length - 1`).
					const magnitude = Math.abs(wheelNet) * wheelSensitivity;
					const dir = wheelNet < 0 ? -1 : 1;
					for (let i = 0; i < magnitude; i++) {
						if (dir < 0) {
							if (cursor <= 0) break;
							cursor--;
							if (cursor < offset) offset = cursor;
						} else {
							if (cursor >= flat.length - 1) break;
							cursor++;
							if (cursor >= offset + pageSize) offset = cursor - pageSize + 1;
						}
					}
					renderNeeded = true;
				}

				// Apply clicks in arrival order. Each click looks up
				// the current clickable area at that coordinate, so a
				// branch expansion triggered by the first click makes
				// newly-visible items reachable by subsequent clicks
				// in the same chunk. Branch-click handlers call
				// render() inline because rebuildFlat mutates the
				// visible list immediately.
				let lastLeafClicked = -1;
				for (const { x, y } of clickCoordinates) {
					const clickedArea = getClickedItem(x, y);
					if (!clickedArea || clickedArea.type !== "tree" || !clickedArea.data)
						continue;
					const flatIndex = clickedArea.data.flatIndex as number;
					if (flatIndex < 0 || flatIndex >= flat.length) continue;
					const item = flat[flatIndex];
					if (item.disabled) continue;
					cursor = flatIndex;
					if (item.isBranch) {
						if (item.expanded) expanded.delete(item.node);
						else expanded.add(item.node);
						rebuildFlat();
						render();
					} else {
						lastLeafClicked = flatIndex;
					}
				}
				if (lastLeafClicked >= 0) {
					finalize();
					return;
				}

				if (renderNeeded) {
					render();
				}
				return;
			}

			if (buf.includes("\x1b[A")) {
				buf = "";
				hoveredIndex = null;
				if (cursor > 0) {
					cursor--;
					if (cursor < offset) offset = cursor;
				}
				render();
				return;
			}
			if (buf.includes("\x1b[B")) {
				buf = "";
				hoveredIndex = null;
				if (cursor < flat.length - 1) {
					cursor++;
					if (cursor >= offset + pageSize) offset = cursor - pageSize + 1;
				}
				render();
				return;
			}
			if (buf.includes("\x1b[C")) {
				buf = "";
				const item = flat[cursor];
				if (item && item.isBranch && !item.disabled && !item.expanded) {
					expanded.add(item.node);
					rebuildFlat();
				}
				render();
				return;
			}
			if (buf.includes("\x1b[D")) {
				buf = "";
				const item = flat[cursor];
				if (item && item.isBranch && !item.disabled && item.expanded) {
					expanded.delete(item.node);
					rebuildFlat(item.node);
				} else if (item && item.depth > 0) {
					let ancestor: FlatItem<T> | undefined;
					for (let i = cursor - 1; i >= 0; i--) {
						const a = flat[i];
						if (
							a.isBranch &&
							!a.disabled &&
							a.expanded &&
							a.depth < item.depth
						) {
							ancestor = a;
							break;
						}
					}
					if (ancestor) {
						expanded.delete(ancestor.node);
						rebuildFlat(ancestor.node);
					}
				}
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

			if (lastChar === " ") {
				buf = "";
				const item = flat[cursor];
				if (item && item.isBranch && !item.disabled) {
					if (item.expanded) {
						expanded.delete(item.node);
					} else {
						expanded.add(item.node);
					}
					rebuildFlat();
					render();
				}
			} else if (lastChar === "\r" || lastChar === "\n") {
				buf = "";
				const item = flat[cursor];
				if (item && !item.isBranch && !item.disabled) {
					finalize();
				} else if (item && item.isBranch && !item.disabled) {
					if (item.expanded) {
						expanded.delete(item.node);
					} else {
						expanded.add(item.node);
					}
					rebuildFlat();
					render();
				}
			} else if (lastChar === "\x03") {
				cleanup();
				stdout.write("\n");
				process.exit(1);
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
