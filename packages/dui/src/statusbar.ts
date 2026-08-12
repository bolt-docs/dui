/**
 * Persistent status bar.
 *
 * A single full-width line pinned to the bottom row of the terminal —
 * the classic editor/pager status line (think vim's statusline or
 * `less`'s prompt). Left/center/right segments can be updated
 * in-place without flickering the rest of the screen. Pairs naturally
 * with `withAltScreen()` + `RenderSurface` for full-screen TUIs.
 *
 * In plain mode the bar prints once as a plain text line (no ANSI,
 * no cursor games) so screen readers and log scrapers still capture
 * the state.
 *
 * @example
 * ```ts
 * import { createStatusBar } from "@bdocs/dui"
 *
 * const bar = createStatusBar({ left: "main.ts", right: "utf-8" })
 * bar.update({ left: "main.ts", center: "12:34", right: "4, 8" })
 * // ... later
 * bar.clear()
 * ```
 */

import { isPlainMode } from "./accessibility";
import { getConfig } from "./config";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";
import { fitWidth, padRight, terminalWidth, visibleLength } from "./utils";

export interface StatusBarParts {
	left?: string;
	center?: string;
	right?: string;
}

export interface StatusBarOptions extends StatusBarParts {
	colors?: {
		left?: ColorStyle;
		center?: ColorStyle;
		right?: ColorStyle;
	};
	stream?: NodeJS.WriteStream;
}

export interface StatusBar {
	/** Replace the segment text and redraw. */
	update(parts: StatusBarParts): void;
	/** Redraw the bar with the current segments. */
	render(): void;
	/** Clear the bar from the screen. */
	clear(): void;
}

export function createStatusBar(options?: StatusBarOptions): StatusBar {
	const stream = options?.stream ?? (typeof process !== "undefined" ? process.stdout : undefined);

	let left = options?.left ?? "";
	let center = options?.center ?? "";
	let right = options?.right ?? "";
	let cleared = false;
	const plain = isPlainMode();

	const theme = getConfig().theme;
	const leftColor = resolveColor(
		"statusbar.left",
		theme,
		options?.colors?.left,
	).apply;
	const centerColor = resolveColor(
		"statusbar.center",
		theme,
		options?.colors?.center,
	).apply;
	const rightColor = resolveColor(
		"statusbar.right",
		theme,
		options?.colors?.right,
	).apply;

	function buildLine(): string {
		const width = terminalWidth();
		const leftText = left ? ` ${left} ` : "";
		const rightText = right ? ` ${right} ` : "";
		const centerText = center ? ` ${center} ` : "";

		// Right-align the right segment, then fit the left and center
		// around it so the total never exceeds the terminal width.
		const available = Math.max(10, width - visibleLength(rightText));
		let line = fitWidth(`${leftColor(leftText)}${centerText ? centerColor(centerText) : ""}`, available);
		line = padRight(line, width - visibleLength(rightText)) + rightColor(rightText);
		return line;
	}

	function render() {
		if (plain) {
			const parts = [left, center, right].filter((s) => s);
			if (parts.length > 0 && stream) stream.write(`${parts.join(" | ")}\n`);
			return;
		}
		if (!stream || !stream.isTTY) return;
		cleared = false;
		const rows = stream.rows ?? 24;
		// Hide the cursor while painting the bottom row so the write
		// never leaves the cursor flashing mid-bar.
		stream.write("\u001b[?25l");
		stream.write(`\x1b[${rows};1H`);
		stream.write("\u001b[2K");
		stream.write(buildLine());
		stream.write("\u001b[?25h");
	}

	function clear() {
		if (plain) return;
		if (cleared || !stream || !stream.isTTY) return;
		cleared = true;
		const rows = stream.rows ?? 24;
		stream.write(`\x1b[${rows};1H`);
		stream.write("\u001b[2K");
	}

	return {
		update(parts: StatusBarParts) {
			if (parts.left !== undefined) left = parts.left;
			if (parts.center !== undefined) center = parts.center;
			if (parts.right !== undefined) right = parts.right;
			render();
		},
		render,
		clear,
	};
}
