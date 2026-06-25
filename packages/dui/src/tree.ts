import * as readline from "node:readline";
import { colors } from "./color";
import { getConfig } from "./config";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";
import { countRenderLines } from "./utils";

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

export async function tree<T = string>(
	message: string,
	options: TreeOptions<T>,
): Promise<T | undefined> {
	const {
		tree: treeData,
		pageSize = 10,
		initialExpanded = false,
		colors: colorsOverride,
	} = options;

	if (!treeData.length) {
		throw new Error("Tree requires at least one node");
	}

	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		return nonInteractiveTree(message, treeData);
	}

	return interactiveTree(
		message,
		treeData,
		pageSize,
		initialExpanded,
		colorsOverride,
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
				initialExpanded || (node.expanded === undefined ? false : node.expanded);
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

		rl.question(
			`Enter number (1-${leaves.length}): `,
			(answer) => {
				rl.close();
				const idx = parseInt(answer.trim(), 10) - 1;
				if (
					idx >= 0 &&
					idx < leaves.length &&
					!leaves[idx].disabled
				) {
					resolve(leaves[idx].value);
				} else {
					const first = leaves.find((c) => !c.disabled);
					resolve(first ? first.value : undefined);
				}
			},
		);
	});
}

function interactiveTree<T>(
	message: string,
	treeData: TreeNode<T>[],
	pageSize: number,
	initialExpanded: boolean,
	colorsOverride: TreeOptions["colors"],
): Promise<T | undefined> {
	return new Promise<T | undefined>((resolve, reject) => {
		const stdin = process.stdin;
		const stdout = process.stdout;
		const theme = getConfig().theme;

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

		function getCurrentFlat(): FlatItem<T>[] {
			return getFlat(treeData, expanded);
		}

		let flat = getCurrentFlat();
		let cursor = 0;
		let offset = 0;
		let done = false;
		let linesRendered = 0;

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
			const effective = Math.min(pageSize, flat.length);
			offset = Math.max(0, Math.min(offset, flat.length - effective));

			const visible = flat.slice(offset, offset + effective);
			const lines: string[] = [];

			lines.push(
				`${messageColor(`? ${message}`)} ${colors.dim("(Use arrow keys, space to toggle)")}`,
			);

			for (let i = 0; i < visible.length; i++) {
				const item = visible[i];
				const isCursor = i + offset === cursor;
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
				} else if (isCursor) {
					label = `${indicator}${selectedColor(item.label)}`;
				} else {
					label = `${indicator}${labelColor(item.label)}`;
				}

				lines.push(`${indent}${pointer}${label}`);
			}

			const output = lines.join("\n");

			if (linesRendered > 0) {
				stdout.write("\x1b[u");
			} else {
				stdout.write("\x1b[s");
			}
			readline.cursorTo(stdout, 0);
			readline.clearScreenDown(stdout);
			stdout.write(output);
			linesRendered = lines.reduce((sum, l) => sum + countRenderLines(l), 0);
		}

		function cleanup() {
			if (done) return;
			done = true;
			stdin.setRawMode(false);
			stdin.removeListener("keypress", onKeypress);
		}

		function finalize() {
			cleanup();
			const item = flat[cursor];
			const finalLine = `${messageColor(`? ${message}`)} ${selectedColor(item.label)}\n`;
			stdout.write("\x1b[u");
			readline.cursorTo(stdout, 0);
			readline.clearScreenDown(stdout);
			stdout.write(finalLine);
			resolve(item.value);
		}

		function onKeypress(
			_str: string,
			key: { name?: string; ctrl?: boolean },
		) {
			if (done) return;

			const item = flat[cursor];

			if (key.name === "up") {
				if (cursor > 0) {
					cursor--;
					if (cursor < offset) offset = cursor;
				}
				render();
			} else if (key.name === "down") {
				if (cursor < flat.length - 1) {
					cursor++;
					if (cursor >= offset + pageSize)
						offset = cursor - pageSize + 1;
				}
				render();
			} else if (key.name === "right") {
				if (item && item.isBranch && !item.disabled && !item.expanded) {
					expanded.add(item.node);
					rebuildFlat();
				}
				render();
			} else if (key.name === "left") {
				if (item && item.isBranch && !item.disabled && item.expanded) {
					expanded.delete(item.node);
					rebuildFlat(item.node);
				} else if (item && item.depth > 0) {
					let ancestor: FlatItem<T> | undefined;
					for (let i = cursor - 1; i >= 0; i--) {
						const a = flat[i];
						if (a.isBranch && !a.disabled && a.expanded && a.depth < item.depth) {
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
			} else if (key.name === "space") {
				if (item && item.isBranch && !item.disabled) {
					if (item.expanded) {
						expanded.delete(item.node);
					} else {
						expanded.add(item.node);
					}
					rebuildFlat();
					render();
				}
			} else if (key.name === "return" || key.name === "enter") {
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
			} else if (key.name === "escape") {
				cleanup();
				stdout.write("\x1b[u");
				readline.cursorTo(stdout, 0);
				readline.clearScreenDown(stdout);
				reject(new Error("Cancelled"));
			} else if (key.name === "c" && key.ctrl) {
				cleanup();
				stdout.write("\n");
				process.exit(1);
			}
		}

		readline.emitKeypressEvents(stdin);
		stdin.setRawMode(true);
		stdin.on("keypress", onKeypress);
		render();
	});
}
