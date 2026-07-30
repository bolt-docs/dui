/**
 * Pagination system for long-form terminal output.
 *
 * Splits multi-line content into pages that fit the terminal viewport and
 * renders a scrollable footer with page indicator. Supports keyboard
 * (↑/↓/Page Up/Page Down) and mouse wheel navigation.
 *
 * @example
 * ```ts
 * import { paginate, paginateInteractive } from "@bdocs/dui"
 *
 * // Non-interactive: split content, get pages, render one
 * const pages = paginate(longDiffOutput)
 * pages.forEach(page => console.log(page))
 *
 * // Interactive: render a scrollable view
 * await paginateInteractive(longDiffOutput)
 * ```
 */

import * as readline from "node:readline";
import { stripAnsi, terminalWidth } from "./utils";

/* ── Options ─────────────────────────────────────────────────── */

export interface PaginateOptions {
	/**
	 * Number of terminal rows per page. Defaults to `terminalHeight() - 2`
	 * (terminal height minus one row for the footer and one for breathing
	 * room). Provide an explicit value to override auto-detection.
	 */
	pageSize?: number;
	/**
	 * Footer text template. `{current}` and `{total}` are replaced with
	 * the actual page numbers. Default: `"▴ {current}/{total} ▾  [↑↓] scroll  [q] quit"`.
	 */
	footer?: string;
	/**
	 * When `true`, the footer is omitted and the function returns an array
	 * of page-sized strings with no decoration. Default: `false`.
	 */
	noFooter?: boolean;
}

/* ── Defaults ────────────────────────────────────────────────── */

const DEFAULT_FOOTER = "\u001b[90m\u25b4 {current}/{total} \u25be  [\u2191\u2193] scroll  [q] quit\u001b[0m";

/**
 * Return the terminal height (rows). Falls back to 24 when stdout is
 * not a TTY or the info is unavailable.
 */
export function terminalHeight(): number {
	if (
		typeof process !== "undefined" &&
		process.stdout?.isTTY &&
		process.stdout.rows
	) {
		return process.stdout.rows;
	}
	return 24;
}

/* ── Splitter ────────────────────────────────────────────────── */

/**
 * Split multi-line text into pages that fit within `pageSize` terminal
 * rows. Each element in the returned array is a string that can be
 * written directly to stdout (it ends with a trailing newline).
 *
 * Lines longer than the terminal width are wrapped by counting their
 * visual length, so a line that occupies 3 terminal rows counts as 3
 * toward the page budget, not 1.
 *
 * @param content - The full text content to paginate. May contain ANSI codes.
 * @param options - Pagination options.
 * @returns Array of page strings. Index 0 = first page.
 */
export function paginate(
	content: string,
	options: PaginateOptions = {},
): string[] {
	const { pageSize: rawPageSize, footer = DEFAULT_FOOTER, noFooter = false } = options;

	const lines = content.split("\n");
	const width = terminalWidth();
	const pageSize = rawPageSize ?? terminalHeight() - 2;
	const effectiveSize = Math.max(1, pageSize);
	const totalLines = lines.length;

	// If everything fits on one page and no footer, return early.
	if (effectiveSize >= totalLines && noFooter) {
		return [content];
	}

	// Compute visual row consumption per logical line using the same
	// logic as computeLinesRendered from utils.
	const lineRows: number[] = lines.map((line) => {
		const len = stripAnsi(line).length;
		if (width <= 0) return 1;
		return Math.max(1, Math.ceil(len / width));
	});

	// Build pages by accumulating visual rows until the budget is used up.
	const pages: string[] = [];
	let currentPageLines: string[] = [];
	let currentRowCount = 0;

	function flushPage() {
		if (currentPageLines.length === 0) return;
		pages.push(currentPageLines.join("\n"));
		currentPageLines = [];
		currentRowCount = 0;
	}

	for (let i = 0; i < totalLines; i++) {
		const rowsNeeded = lineRows[i];
		if (currentRowCount + rowsNeeded > effectiveSize && currentPageLines.length > 0) {
			flushPage();
		}
		currentPageLines.push(lines[i]);
		currentRowCount += rowsNeeded;
	}
	flushPage();

	if (noFooter) {
		return pages;
	}

	// Add footer to each page.
	const total = pages.length;
	return pages.map((page, idx) => {
		const footerLine = footer
			.replace("{current}", String(idx + 1))
			.replace("{total}", String(total));
		return `${page}\n${footerLine}`;
	});
}

/* ── Interactive mode ─────────────────────────────────────────── */

/**
 * Interactive pagination — renders `content` one page at a time and
 * lets the user scroll with ↑/↓, Page Up/Page Down, mouse wheel, or
 * 'q' / Escape to quit.
 *
 * Resolves once the user quits. The last visible page remains on
 * screen (the caller is responsible for managing the output surface).
 */
export async function paginateInteractive(
	content: string,
	options: PaginateOptions & {
		/** Stream to write to. Default: `process.stdout`. */
		stream?: NodeJS.WriteStream;
	} = {},
): Promise<void> {
	const stream = options.stream ?? process.stdout;
	const rawPages = paginate(content, { ...options, noFooter: true });
	const totalPages = rawPages.length;

	if (totalPages <= 1) {
		stream.write(`${rawPages[0] ?? content}\n`);
		return;
	}

	// Non-TTY fallback: show page count and suggest piping.
	if (!stream.isTTY) {
		stream.write(`${rawPages[0] ?? content}\n`);
		stream.write(
			`\u001b[90m[${totalPages} pages — pipe to \`less\` for interactive scrolling]\u001b[0m\n`,
		);
		return;
	}

	const stdin = process.stdin;

	let currentPage = 0;
	let done = false;
	let resolvePromise: () => void = () => {};
	let buf = "";

	const footer = options.footer ?? DEFAULT_FOOTER;

	function renderPage() {
		if (done) return;
		const page = rawPages[currentPage];
		const footerLine = footer
			.replace("{current}", String(currentPage + 1))
			.replace("{total}", String(totalPages));
		readline.cursorTo(stream, 0);
		readline.clearScreenDown(stream);
		stream.write(`${page}\n${footerLine}`);
	}

	function cleanup() {
		if (done) return;
		done = true;
		stdin.removeListener("data", onData);
		if (stdin.isTTY) stdin.setRawMode(false);
		resolvePromise();
	}

	function onData(data: string | Buffer) {
		if (done) return;
		const text = typeof data === "string" ? data : data.toString("utf8");
		buf += text;

		// Keep buffer bounded
		if (buf.length > 256) {
			buf = buf.slice(-64);
		}

		// SGR mouse events: wheel-up (64), wheel-down (65)
		const sgrMatch = buf.match(/\u001b\[<(\d+);(\d+);(\d+)([Mm~])/);
		if (sgrMatch) {
			buf = "";
			const code = Number.parseInt(sgrMatch[1], 10);
			const isWheel = sgrMatch[4] === "~";
			if (isWheel) {
				const base = code & ~0x1c;
				if (base === 64 && currentPage > 0) {
					currentPage--;
					renderPage();
				} else if (base === 65 && currentPage < totalPages - 1) {
					currentPage++;
					renderPage();
				}
			}
			return;
		}

		// Arrow keys: ↑ / ↓
		if (buf.includes("\u001b[A")) {
			buf = "";
			if (currentPage > 0) {
				currentPage--;
				renderPage();
			}
			return;
		}
		if (buf.includes("\u001b[B")) {
			buf = "";
			if (currentPage < totalPages - 1) {
				currentPage++;
				renderPage();
			}
			return;
		}

		// Page Up / Page Down
		if (buf.includes("\u001b[5~")) {
			buf = "";
			currentPage = Math.max(0, currentPage - Math.min(5, totalPages));
			renderPage();
			return;
		}
		if (buf.includes("\u001b[6~")) {
			buf = "";
			currentPage = Math.min(totalPages - 1, currentPage + Math.min(5, totalPages));
			renderPage();
			return;
		}

		// Home / End
		if (buf.includes("\u001b[H")) {
			buf = "";
			currentPage = 0;
			renderPage();
			return;
		}
		if (buf.includes("\u001b[F")) {
			buf = "";
			currentPage = totalPages - 1;
			renderPage();
			return;
		}

		// Escape = quit (deferred microtask to avoid catching partial CSI
		// sequences like \x1b[A arriving across chunks)
		if (buf === "\u001b") {
			Promise.resolve().then(() => {
				if (done) return;
				if (buf !== "\u001b") return;
				buf = "";
				cleanup();
			});
			return;
		}

		const lastChar = buf[buf.length - 1];
		if (lastChar === "q" || lastChar === "Q") {
			buf = "";
			cleanup();
			return;
		}
		if (lastChar === "\u0003") {
			cleanup();
			stream.write("\n");
			process.exit(130);
		}
		if (lastChar !== "\u001b" && (buf.length > 1 || buf.length > 0)) {
			// Non-matching input — clear buffer so it doesn't accumulate
			if (!text.startsWith("\u001b") || lastChar !== "\u001b") {
				buf = "";
			}
		}
	}

	stdin.setRawMode(true);
	stdin.setEncoding("utf8");
	stdin.on("data", onData);
	renderPage();

	await new Promise<void>((resolve) => {
		resolvePromise = resolve;
	});
}
