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

/**
 * A single node in the tree hierarchy.
 *
 * @template T The type of the value associated with this node (default `string`).
 */
export interface TreeNode<T = string> {
	/** Display label shown in the tree. */
	label: string;
	/** Value returned when this node (or a leaf under it) is selected. */
	value?: T;
	/** When true, the node cannot be selected or toggled. */
	disabled?: boolean;
	/**
	 * Initial expanded state for branch nodes (ignored for leaves).
	 * Takes precedence over `initialExpanded` when explicitly set.
	 */
	expanded?: boolean;
	/**
	 * Child nodes. If present and non-empty, this node is treated as a
	 * branch (collapsible/expandable). Omit or set to empty for leaves.
	 *
	 * To load children lazily, pass a **function** returning a promise
	 * of nodes: the first time the branch is expanded the loader runs
	 * once (the result is cached), the row shows a `…` spinner while it
	 * loads, and subsequent expand/collapse toggles are instant.
	 *
	 * ```ts
	 * const fs = await tree("Pick a file", {
	 *   tree: [{
	 *     label: "src",
	 *     children: async () => (await listDir("src")).map(...),
	 *   }],
	 * })
	 * ```
	 */
	children?: TreeNode<T>[] | (() => Promise<TreeNode<T>[]>);
}

/**
 * Options for configuring the tree prompt.
 *
 * @template T The type of values in the tree (default `string`).
 */
export interface TreeOptions<T = string> {
	/** Root-level tree nodes to display. Must have at least one entry. */
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
	/**
	 * When `true`, typing filters the visible nodes with fuzzy
	 * matching against their labels. Non-matching subtrees collapse
	 * out of view; matched nodes keep their original depth indent.
	 * Backspace edits the query and Escape clears it (a second
	 * Escape cancels).
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
		branch?: ColorStyle;
	};
}

// ◆ (U+25C6) — filled diamond as cursor pointer, consistent with multiselect/select
const POINTER = "\u25c6";
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

/** A branch when it has array children or a lazy loader. */
function isBranchNode<T>(node: TreeNode<T>): boolean {
	if (typeof node.children === "function") return true;
	return !!node.children?.length;
}

/**
 * Resolve a node's children — for lazy nodes this returns the cached
 * result (or `[]` while the loader is still in flight).
 */
function getChildren<T>(
	node: TreeNode<T>,
	cache: Map<TreeNode<T>, TreeNode<T>[]>,
): TreeNode<T>[] {
	if (typeof node.children === "function") {
		return cache.get(node) ?? [];
	}
	return node.children ?? [];
}

const MESSAGE_HELP =
	"(Use arrow keys, space to toggle, or click)";
const MESSAGE_HELP_SEARCH =
	"(Type to filter, arrows to move, enter to select)";

/**
 * Interactive tree navigation prompt.
 *
 * Renders a tree structure where users can navigate with arrow keys,
 * expand/collapse branches with ←/→ or Space, and select a leaf with
 * Enter. Supports mouse click and hover, wheel scrolling with
 * configurable sensitivity, disabled nodes, and non-TTY fallback.
 *
 * @param message Prompt text shown above the tree.
 * @param options Tree nodes and configuration.
 * @returns The value of the selected leaf, or `undefined` if cancelled.
 * @throws {Error} When `options.tree` is empty or user presses Escape.
 *
 * @example
 * ```ts
 * const file = await tree('Select a file', {
 *   tree: [
 *     {
 *       label: 'src',
 *       children: [
 *         { label: 'index.ts', value: 'src/index.ts' },
 *         { label: 'utils.ts', value: 'src/utils.ts' },
 *       ],
 *     },
 *     { label: 'package.json', value: 'package.json' },
 *   ],
 *   initialExpanded: true,
 * })
 * ```
 */
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
		searchable = false,
		onCancel,
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
		searchable,
		onCancel,
	);
}

function getFlat<T>(
	nodes: TreeNode<T>[],
	expanded: Set<TreeNode<T>>,
	lazyCache: Map<TreeNode<T>, TreeNode<T>[]>,
	depth = 0,
): FlatItem<T>[] {
	const result: FlatItem<T>[] = [];
	for (const node of nodes) {
		const isBranch = isBranchNode(node);
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
			result.push(...getFlat(getChildren(node, lazyCache), expanded, lazyCache, depth + 1));
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
		if (!isBranchNode(node)) continue;
		const expand =
			initialExpanded ||
			(node.expanded === undefined ? false : node.expanded);
		if (expand) expanded.add(node);
		// Lazy nodes have no static children to walk eagerly.
		if (typeof node.children !== "function") {
			initExpanded(node.children ?? [], expanded, initialExpanded);
		}
	}
}

function getAllLeaves<T>(
	nodes: TreeNode<T>[],
): { label: string; value?: T; disabled?: boolean }[] {
	const result: { label: string; value?: T; disabled?: boolean }[] = [];
	for (const node of nodes) {
		// Lazy branches can't be walked synchronously — in the non-TTY
		// fallback they surface as plain entries (their `value`, if any).
		if (Array.isArray(node.children) && node.children.length) {
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
	searchable: boolean,
	onCancel: (() => void) | undefined,
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

		// Lazy-loading state: resolved children per node (cached after the
		// first load) and the set of nodes whose loader is in flight.
		const lazyCache = new Map<TreeNode<T>, TreeNode<T>[]>();
		const loadingNodes = new Set<TreeNode<T>>();

		// Start loading any lazy branch that was initially expanded (via
		// `initialExpanded` or an explicit `expanded: true` on the node).
		// Deferred to a microtask so the setup below (flat, render, …)
		// completes before the loader's first synchronous render.
		for (const node of expanded) {
			if (typeof node.children === "function") {
				Promise.resolve().then(() => void loadNode(node));
			}
		}

		const clickableAreaIds = new Set<string>();
		const hoverableAreaIds = new Set<string>();

		let flat = getCurrentFlat();
		let cursor = 0;
		let hoveredIndex: number | null = null;
		let offset = 0;
		let done = false;
		let linesRendered = 0;
		let buf = "";
		let query = "";
		let filteredPositions: number[] | null = null;

		function getCurrentFlat(): FlatItem<T>[] {
			return getFlat(treeData, expanded, lazyCache);
		}

		async function loadNode(node: TreeNode<T>) {
			if (lazyCache.has(node) || loadingNodes.has(node)) return;
			const loader = node.children;
			if (typeof loader !== "function") return;
			loadingNodes.add(node);
			render();
			try {
				const loaded = await loader();
				lazyCache.set(node, loaded ?? []);
			} finally {
				loadingNodes.delete(node);
				if (!done) {
					rebuildFlat();
					render();
				}
			}
		}

		function expandNode(item: FlatItem<T>) {
			expanded.add(item.node);
			rebuildFlat();
			render();
			// Kick off the lazy loader (if any) after the row is drawn so
			// the `…` indicator shows while children stream in.
			if (typeof item.node.children === "function") {
				void loadNode(item.node);
			}
		}

		function collapseNode(item: FlatItem<T>) {
			expanded.delete(item.node);
			rebuildFlat();
			render();
		}

		function totalCount(): number {
			return filteredPositions ? filteredPositions.length : flat.length;
		}

		function itemAt(pos: number): FlatItem<T> | undefined {
			if (filteredPositions) {
				if (pos < 0 || pos >= filteredPositions.length) return undefined;
				return flat[filteredPositions[pos]];
			}
			return flat[pos];
		}

		function resetFilter() {
			filteredPositions = null;
			if (query) {
				const hits = filterFuzzy(query, flat, (f) => f.label);
				filteredPositions = hits ? hits.map((h) => flat.indexOf(h.item)) : [];
			}
			cursor = 0;
			offset = 0;
			hoveredIndex = null;
		}

		function rebuildFlat(fromNode?: TreeNode<T>) {
			flat = getCurrentFlat();
			if (fromNode) {
				const idx = flat.findIndex((f) => f.node === fromNode);
				if (idx >= 0) {
					cursor = idx;
				} else if (cursor >= flat.length && flat.length > 0) {
					cursor = flat.length - 1;
				}
			} else if (cursor >= flat.length && flat.length > 0) {
				cursor = flat.length - 1;
			}
			resetFilter();
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

			const visible = filteredPositions
				? filteredPositions.slice(offset, offset + effective).map((pos) => ({ pos, item: flat[pos] }))
				: flat.slice(offset, offset + effective).map((item, i) => ({ pos: offset + i, item }));
			const lines: string[] = [];

			const msgLine = `${messageColor(`? ${message}`)} ${colors.dim(
				searchable ? MESSAGE_HELP_SEARCH : MESSAGE_HELP,
			)}`;
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
				const { pos, item } = visible[i];
				const isCursor = pos === cursor;
				const isHovered = pos === hoveredIndex;
				const indent = "  ".repeat(item.depth);
				const pointer = isCursor ? `${pointerColor(POINTER)} ` : "  ";

				let indicator: string;
				if (item.isBranch) {
					const isLoading = item.expanded && loadingNodes.has(item.node);
					indicator = isLoading
						? `${colors.dim("…")} `
						: item.expanded
							? `${branchColor(EXPANDED)} `
							: `${branchColor(COLLAPSED)} `;
				} else {
					indicator = "  ";
				}

				const highlighted = filteredPositions && query;
				let label: string;
				if (item.disabled) {
					label = colors.dim(`${indicator}${item.label} (disabled)`);
				} else if (isHovered) {
					label = highlighted
						? `${indicator}${highlightFuzzy(query, item.label, (ch) =>
								applyClass("hover", selectedColor(ch)),
							)}`
						: `${indicator}${applyClass("hover", selectedColor(item.label))}`;
				} else if (isCursor) {
					label = highlighted
						? `${indicator}${highlightFuzzy(query, item.label, (ch) => selectedColor(ch))}`
						: `${indicator}${selectedColor(item.label)}`;
				} else {
					label = highlighted
						? `${indicator}${highlightFuzzy(query, item.label, (ch) => selectedColor(ch))}`
						: `${indicator}${labelColor(item.label)}`;
				}

				lines.push(`${indent}${pointer}${label}`);

				const areaId = `tree-${i}`;
				const row = listTop + 1 + i;
				registerClickableArea({
					id: areaId,
					type: "tree",
					bounds: { left: 0, top: row, width: 999, height: 1 },
					data: { flatIndex: pos },
				});
				clickableAreaIds.add(areaId);

				registerHoverableArea({
					id: `hover-${areaId}`,
					type: "tree",
					bounds: { left: 0, top: row, width: 999, height: 1 },
					data: { flatIndex: pos },
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
			const item = itemAt(cursor) ?? flat[0];
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

		function onData(data: string | Buffer) {
			if (done) return;

			const text = typeof data === "string" ? data : data.toString("utf8");
			buf += text;

			if (buf.length > 256) {
				buf = buf.slice(-32);
			}

			// ── Arrow keys FIRST ──────────────────────────────────────
			// Check keyboard navigation BEFORE mouse events so arrow keys
			// are never eaten by mouse-tracking data. The tree has 4
			// keyboard directions (↑↓ for cursor, ←→ for collapse/expand)
			// so check all four before falling through to mouse parsing.
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
				if (cursor < totalCount() - 1) {
					cursor++;
					if (cursor >= offset + pageSize) offset = cursor - pageSize + 1;
				}
				render();
				return;
			}
			if (buf.includes("\x1b[C")) {
				buf = "";
				const item = itemAt(cursor);
				if (item && item.isBranch && !item.disabled && !item.expanded) {
					expandNode(item);
				}
				render();
				return;
			}
			if (buf.includes("\x1b[D")) {
				buf = "";
				const item = itemAt(cursor);
				if (item && item.isBranch && !item.disabled && item.expanded) {
					collapseNode(item);
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

			// ── Escape key (debounced) ────────────────────────────────
			// Defer cancel via microtask so a partially-arrived CSI
			// sequence has time to complete before committing to cancel.
			if (buf === "\x1b") {
				Promise.resolve().then(() => {
					if (done) return;
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
			// checked. This includes wheel events for fast scrolling,
			// click detection, and hover tracking.
			const mouseEvents = parseSGRMouseDataAll(buf);
			if (mouseEvents.length > 0) {
				buf = "";

				let wheelUp = 0;
				let wheelDown = 0;
				let lastMove: (typeof mouseEvents)[number] | null = null;
				const clickCoordinates: Array<{ x: number; y: number }> = [];

				for (const mouseEvent of mouseEvents) {
					if (mouseEvent.type === "click") {
						clickCoordinates.push({ x: mouseEvent.x, y: mouseEvent.y });
					} else if (mouseEvent.type === "move") {
						lastMove = mouseEvent;
					} else if (mouseEvent.type === "wheel") {
						if (mouseEvent.wheel === "up") wheelUp++;
						else if (mouseEvent.wheel === "down") wheelDown++;
					}
				}

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
					const magnitude = Math.abs(wheelNet) * wheelSensitivity;
					const dir = wheelNet < 0 ? -1 : 1;
					for (let i = 0; i < magnitude; i++) {
						if (dir < 0) {
							if (cursor <= 0) break;
							cursor--;
							if (cursor < offset) offset = cursor;
						} else {
							if (cursor >= totalCount() - 1) break;
							cursor++;
							if (cursor >= offset + pageSize) offset = cursor - pageSize + 1;
						}
					}
					renderNeeded = true;
				}

				// Apply clicks in arrival order. Each click looks up
				// the current clickable area at that coordinate.
				let lastLeafClicked = -1;
				for (const { x, y } of clickCoordinates) {
					const clickedArea = getClickedItem(x, y);
					if (!clickedArea || clickedArea.type !== "tree" || !clickedArea.data)
						continue;
					const flatIndex = clickedArea.data.flatIndex as number;
					if (flatIndex < 0 || flatIndex >= totalCount()) continue;
					const item = itemAt(flatIndex);
					if (!item || item.disabled) continue;
					cursor = flatIndex;
					if (item.isBranch) {
						if (item.expanded) collapseNode(item);
						else expandNode(item);
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

			if (lastChar === " ") {
				buf = "";
				const item = itemAt(cursor);
				if (item && item.isBranch && !item.disabled) {
					if (item.expanded) collapseNode(item);
					else expandNode(item);
				}
			} else if (lastChar === "\r" || lastChar === "\n") {
				buf = "";
				const item = itemAt(cursor);
				if (item && !item.isBranch && !item.disabled) {
					finalize();
				} else if (item && item.isBranch && !item.disabled) {
					if (item.expanded) collapseNode(item);
					else expandNode(item);
				}
			} else if (lastChar === "\x03") {
				onCancel?.();
				cleanup();
				stdout.write("\n");
				// Standard Unix convention: 128 + SIGINT(2) = 130.
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
