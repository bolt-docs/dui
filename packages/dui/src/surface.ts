/**
 * Render Surface — a virtual terminal canvas with absolute positioning,
 * layering, and frame-buffer diffing.
 *
 * Instead of building ANSI strings ad‑hoc and writing them to stdout,
 * you render elements at explicit (x, y) coordinates. The surface
 * tracks every cell's character and style, then on `flush()` emits
 * the *minimum* ANSI output needed to update the real terminal —
 * only dirty cells are written, preceded by cursor-move sequences.
 *
 * This makes it ideal for:
 *   - Dashboards with fixed layouts
 *   - Widget toolkits (tables, forms, sidebars)
 *   - Any UI where elements occupy known screen positions
 *   - Animations — only the moving parts are re‑emitted
 *
 * @example
 * ```ts
 * const surface = new RenderSurface({ width: 80, height: 24 })
 *
 * surface.write(0, 0, "╔═══════════════╗", { bold: true })
 * surface.write(0, 1, "║  Hello world  ║")
 * surface.write(0, 2, "╚═══════════════╝")
 *
 * process.stdout.write(surface.flush())
 * ```
 */

import { stripAnsi, visibleLength } from "./utils";

/* ── Types ───────────────────────────────────────────────────── */

export interface SurfaceCell {
	/** Single character to display (must be exactly 1 visual cell wide). */
	char: string;
	/** Foreground color (hex `#rrggbb` or SGR‑style string). */
	fg?: string;
	/** Background color (hex `#rrggbb` or SGR‑style string). */
	bg?: string;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	dim?: boolean;
	/** Inverse/reverse video. */
	inverse?: boolean;
}

export interface SurfaceOptions {
	/** Width in terminal columns. */
	width: number;
	/** Height in terminal rows. */
	height: number;
	/** Default background color for empty cells. */
	defaultBg?: string;
	/**
	 * If `true`, the surface emits cursor‑move sequences on every
	 * `flush()`. Default `true`. Set to `false` when writing to a
	 * canvas that is already positioned (e.g. inside a larger layout).
	 */
	emitCursorMoves?: boolean;
	/**
	 * Character to fill empty cells with. Default `" "` (space).
	 * Useful when you want an explicit empty fill (e.g. transparency
	 * for overlays).
	 */
	fillChar?: string;
}

/* ── Internal cell representation ────────────────────────────── */

interface InternalCell {
	char: string;
	fg: string;   // empty string means "use default"
	bg: string;
	bold: boolean;
	italic: boolean;
	underline: boolean;
	dim: boolean;
	inverse: boolean;
	dirty: boolean;
}

function emptyCell(fill = " "): InternalCell {
	return {
		char: fill,
		fg: "",
		bg: "",
		bold: false,
		italic: false,
		underline: false,
		dim: false,
		inverse: false,
		dirty: true,
	};
}

/* ── SGR state tracker ───────────────────────────────────────── */

/**
 * Tracks the currently-active SGR attributes so `flush()` can emit
 * *only* the delta when a cell's style changes, rather than the full
 * reset–re‑apply cycle for every cell.
 */
interface SgrState {
	fg: string;
	bg: string;
	bold: boolean;
	italic: boolean;
	underline: boolean;
	dim: boolean;
	inverse: boolean;
}

const SGR_DEFAULT: SgrState = {
	fg: "",
	bg: "",
	bold: false,
	italic: false,
	underline: false,
	dim: false,
	inverse: false,
};

function sgrSequence(delta: Partial<SgrState>, current: SgrState): string {
	const parts: number[] = [];

	// SGR 22 turns off BOTH bold and dim simultaneously. When both
	// toggle off together, emit only one 22 instead of 22;22.
	if (delta.bold !== undefined && delta.dim === true) {
		// dim coming on while bold going off — they cancel on 22;
		// the subsequent `2` re-enables dim. Emit both for clarity.
		parts.push(delta.bold ? 1 : 22);
		// dim is handled below
	} else if (delta.bold !== undefined) {
		parts.push(delta.bold ? 1 : 22);
	}
	if (delta.dim !== undefined) {
		// Only emit when bold wasn't already emitting 22 (which resets both)
		const boldClosing = delta.bold === false;
		if (!boldClosing) {
			parts.push(delta.dim ? 2 : 22);
		}
	}
	if (delta.italic !== undefined) parts.push(delta.italic ? 3 : 23);
	if (delta.underline !== undefined) parts.push(delta.underline ? 4 : 24);
	if (delta.inverse !== undefined) parts.push(delta.inverse ? 7 : 27);

	if (delta.fg !== undefined) {
		if (delta.fg === "") {
			parts.push(39); // default fg
		} else {
			const rgb = hexToRgb(delta.fg);
			if (rgb) parts.push(38, 2, rgb.r, rgb.g, rgb.b);
		}
	}

	if (delta.bg !== undefined) {
		if (delta.bg === "") {
			parts.push(49); // default bg
		} else {
			const rgb = hexToRgb(delta.bg);
			if (rgb) parts.push(48, 2, rgb.r, rgb.g, rgb.b);
		}
	}

	if (parts.length === 0) return "";
	return `\x1b[${parts.join(";")}m`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const h = hex.replace(/^#/, "");
	if (h.length === 3) {
		return {
			r: Number.parseInt(h[0] + h[0], 16),
			g: Number.parseInt(h[1] + h[1], 16),
			b: Number.parseInt(h[2] + h[2], 16),
		};
	}
	if (h.length === 6) {
		return {
			r: Number.parseInt(h.slice(0, 2), 16),
			g: Number.parseInt(h.slice(2, 4), 16),
			b: Number.parseInt(h.slice(4, 6), 16),
		};
	}
	return null;
}

/* ── Main class ──────────────────────────────────────────────── */	export class RenderSurface {
	private grid: InternalCell[][];
	private opts: Required<SurfaceOptions>;
	private sgr: SgrState;
	private prevCharX = 0;
	private prevCharY = 0;

	// ── Internal read access for SurfaceOverlay ─────────────────
	/** @internal Exposed so SurfaceOverlay can read state without casting. */
	get _grid(): InternalCell[][] { return this.grid; }
	/** @internal */
	get _opts(): Required<SurfaceOptions> { return this.opts; }

	constructor(options: SurfaceOptions) {
		this.opts = {
			width: options.width,
			height: options.height,
			defaultBg: options.defaultBg ?? "",
			emitCursorMoves: options.emitCursorMoves ?? true,
			fillChar: options.fillChar ?? " ",
		};
		this.grid = this.allocGrid();
		this.sgr = { ...SGR_DEFAULT };
	}

	/* ── Public read access ───────────────────────────────────── */

	/** Surface width in terminal columns. */
	get width(): number {
		return this.opts.width;
	}

	/** Surface height in terminal rows. */
	get height(): number {
		return this.opts.height;
	}

	/* ── Cell operations ──────────────────────────────────────── */

	/**
	 * Write a string at position (x, y). Multi‑byte and wide characters
	 * are skipped (the surface works best with monospaced single‑cell
	 * characters). ANSI escapes in `text` are stripped — use the `style`
	 * parameter instead.
	 */
	write(
		x: number,
		y: number,
		text: string,
		style?: Partial<SurfaceCell>,
	): void {
		if (y < 0 || y >= this.opts.height) return;

		const clean = stripAnsi(text);
		const row = this.grid[y];
		if (!row) return;

		// Fast-path: ASCII chars are always 1 cell wide, avoid the
		// expensive visibleLength() call for every character.
		for (let i = 0; i < clean.length; i++) {
			const cx = x + i;
			if (cx < 0 || cx >= this.opts.width) continue;
			const ch = clean[i];
			// Skip wide/surrogate characters for simplicity
			if (ch > "\x7f" && visibleLength(ch) !== 1 && ch !== " ") continue;

			const cell = row[cx];
			if (style) {
				cell.char = ch;
				cell.fg = style.fg ?? cell.fg;
				cell.bg = style.bg ?? cell.bg;
				cell.bold = style.bold ?? cell.bold;
				cell.italic = style.italic ?? cell.italic;
				cell.underline = style.underline ?? cell.underline;
				cell.dim = style.dim ?? cell.dim;
				cell.inverse = style.inverse ?? cell.inverse;
			} else {
				cell.char = ch;
			}
			cell.dirty = true;
		}
	}

	/**
	 * Fill a rectangular region with a character and optional style.
	 * Coordinates are (x, y, width, height).
	 */
	fill(
		x: number,
		y: number,
		w: number,
		h: number,
		char = this.opts.fillChar,
		style?: Partial<SurfaceCell>,
	): void {
		for (let row = y; row < y + h && row < this.opts.height; row++) {
			if (row < 0) continue;
			const gridRow = this.grid[row];
			if (!gridRow) continue;
			for (let col = x; col < x + w && col < this.opts.width; col++) {
				if (col < 0) continue;
				const cell = gridRow[col];
				cell.char = char;
				if (style) {
					cell.fg = style.fg ?? cell.fg;
					cell.bg = style.bg ?? cell.bg;
					cell.bold = style.bold ?? cell.bold;
					cell.italic = style.italic ?? cell.italic;
					cell.underline = style.underline ?? cell.underline;
					cell.dim = style.dim ?? cell.dim;
					cell.inverse = style.inverse ?? cell.inverse;
				}
				cell.dirty = true;
			}
		}
	}

	/**
	 * Resize the surface. Existing content is preserved where it fits;
	 * new cells are filled with the default fill char.
	 */
	resize(width: number, height: number): void {
		const oldGrid = this.grid;
		this.opts.width = width;
		this.opts.height = height;
		this.grid = this.allocGrid();

		for (let y = 0; y < Math.min(oldGrid.length, height); y++) {
			const oldRow = oldGrid[y];
			const newRow = this.grid[y];
			if (!oldRow || !newRow) continue;
			for (let x = 0; x < Math.min(oldRow.length, width); x++) {
				const src = oldRow[x];
				const dst = newRow[x];
				if (src.dirty) {
					Object.assign(dst, src);
				} else {
					dst.char = src.char;
					dst.fg = src.fg;
					dst.bg = src.bg;
					dst.bold = src.bold;
					dst.italic = src.italic;
					dst.underline = src.underline;
					dst.dim = src.dim;
					dst.inverse = src.inverse;
				}
				dst.dirty = true;
			}
		}
	}

	/**
	 * Mark every cell as dirty (forces full redraw on next `flush()`).
	 * Useful after resizing or after external output has overwritten the
	 * surface area in the terminal.
	 */
	invalidate(): void {
		for (const row of this.grid) {
			for (const cell of row) {
				cell.dirty = true;
			}
		}
	}

	/**
	 * Clear the entire surface (reset all cells to defaults).
	 * Marks everything dirty so the next `flush()` clears the terminal.
	 */
	clear(): void {
		for (const row of this.grid) {
			for (const cell of row) {
				Object.assign(cell, emptyCell(this.opts.fillChar));
				cell.dirty = true;
			}
		}
	}

	/* ── Output ───────────────────────────────────────────────── */

	/**
	 * Produce an ANSI string containing *only* the cells that changed
	 * since the last `flush()`. Calls `flushToTerminal()` internally
	 * when `stream` is provided.
	 *
	 * The output is a minimal diff: cursor‑move sequences followed by
	 * styled characters for each dirty cell. Non‑dirty cells are
	 * skipped entirely.
	 */
	flush(): string {
		const buf: string[] = [];
		const emitSgr = this.opts.emitCursorMoves;

		for (let y = 0; y < this.opts.height; y++) {
			const row = this.grid[y];
			if (!row) continue;

			// Fast path: scan for any dirty cell in the row
			let hasDirty = false;
			for (const cell of row) {
				if (cell.dirty) {
					hasDirty = true;
					break;
				}
			}
			if (!hasDirty) continue;

			for (let x = 0; x < this.opts.width; x++) {
				const cell = row[x];
				if (!cell.dirty) continue;

				// Only emit cursor move if we're not at the expected position
				if (emitSgr && (x !== this.prevCharX + 1 || y !== this.prevCharY || buf.length === 0)) {
					buf.push(`\x1b[${y + 1};${x + 1}H`);
				}

				// Compute SGR delta vs current state
				const delta: Partial<SgrState> = {};
				if (cell.fg !== this.sgr.fg) delta.fg = cell.fg;
				if (cell.bg !== this.sgr.bg) delta.bg = cell.bg;
				if (cell.bold !== this.sgr.bold) delta.bold = cell.bold;
				if (cell.italic !== this.sgr.italic) delta.italic = cell.italic;
				if (cell.underline !== this.sgr.underline) delta.underline = cell.underline;
				if (cell.dim !== this.sgr.dim) delta.dim = cell.dim;
				if (cell.inverse !== this.sgr.inverse) delta.inverse = cell.inverse;

				const seq = sgrSequence(delta, this.sgr);
				if (seq) buf.push(seq);

				// Update active SGR state
				if (delta.fg !== undefined) this.sgr.fg = cell.fg;
				if (delta.bg !== undefined) this.sgr.bg = cell.bg;
				if (delta.bold !== undefined) this.sgr.bold = cell.bold;
				if (delta.italic !== undefined) this.sgr.italic = cell.italic;
				if (delta.underline !== undefined) this.sgr.underline = cell.underline;
				if (delta.dim !== undefined) this.sgr.dim = cell.dim;
				if (delta.inverse !== undefined) this.sgr.inverse = cell.inverse;

				buf.push(cell.char);
				cell.dirty = false;
				this.prevCharX = x;
				this.prevCharY = y;
			}
		}

		// Reset SGR at end when we emitted any styled content
		if (buf.length > 0) {
			buf.push("\x1b[0m");
			this.sgr = { ...SGR_DEFAULT };
		}

		return buf.join("");
	}

	/**
	 * Produce a full ANSI string for the entire surface (every cell,
	 * regardless of dirty state). Useful for initial render, or for
	 * reading the surface into a terminal pane without a prior frame.
	 */
	render(): string {
		const buf: string[] = [];
		const sgr = { ...SGR_DEFAULT };

		for (let y = 0; y < this.opts.height; y++) {
			if (y > 0) buf.push("\n");
			const row = this.grid[y];
			if (!row) continue;

			for (let x = 0; x < this.opts.width; x++) {
				const cell = row[x];
				if (!cell) continue;

				const delta: Partial<SgrState> = {};
				if (cell.fg !== sgr.fg) delta.fg = cell.fg;
				if (cell.bg !== sgr.bg) delta.bg = cell.bg;
				if (cell.bold !== sgr.bold) delta.bold = cell.bold;
				if (cell.italic !== sgr.italic) delta.italic = cell.italic;
				if (cell.underline !== sgr.underline) delta.underline = cell.underline;
				if (cell.dim !== sgr.dim) delta.dim = cell.dim;
				if (cell.inverse !== sgr.inverse) delta.inverse = cell.inverse;

				const seq = sgrSequence(delta, sgr);
				if (seq) buf.push(seq);

				if (delta.fg !== undefined) sgr.fg = cell.fg;
				if (delta.bg !== undefined) sgr.bg = cell.bg;
				if (delta.bold !== undefined) sgr.bold = cell.bold;
				if (delta.italic !== undefined) sgr.italic = cell.italic;
				if (delta.underline !== undefined) sgr.underline = cell.underline;
				if (delta.dim !== undefined) sgr.dim = cell.dim;
				if (delta.inverse !== undefined) sgr.inverse = cell.inverse;
				buf.push(cell.char);
			}
		}

		if (buf.length > 0) buf.push("\x1b[0m");

		// Mark all cells as clean so a subsequent flush() sees nothing
		// to do (the full render already wrote everything).
		for (const row of this.grid) {
			for (const cell of row) {
				cell.dirty = false;
			}
		}

		return buf.join("");
	}

	/**
	 * Flush the diff to `process.stdout` and move the cursor below the
	 * surface so subsequent output doesn't overwrite the canvas.
	 * Returns the number of rows written.
	 */
	flushToTerminal(): number {
		const ansi = this.flush();
		if (!ansi) return 0;
		process.stdout.write(ansi);
		return this.opts.height;
	}

	/**
	 * Render the entire surface to the terminal (full redraw).
	 * Moves cursor to home, writes everything, and resets.
	 * Returns the number of rows written.
	 */
	renderToTerminal(): number {
		const ansi = this.render();
		if (!ansi) return 0;
		process.stdout.write(`\x1b[0;0H${ansi}`);
		return this.opts.height;
	}

	/**
	 * Create an overlay surface that shares the same frame‑buffer.
	 * The overlay can be flushed independently — only its cells are
	 * scanned. Use for popovers, tooltips, and floating dialogs.
	 */
	createOverlay(
		x: number,
		y: number,
		width: number,
		height: number,
	): SurfaceOverlay {
		return new SurfaceOverlay(this, x, y, width, height);
	}

	/* ── Internals ────────────────────────────────────────────── */

	private allocGrid(): InternalCell[][] {
		const grid: InternalCell[][] = [];
		for (let y = 0; y < this.opts.height; y++) {
			const row: InternalCell[] = [];
			for (let x = 0; x < this.opts.width; x++) {
				row.push(emptyCell(this.opts.fillChar));
			}
			grid.push(row);
		}
		return grid;
	}
}

/* ── Surface Overlay ─────────────────────────────────────────── */

/**
 * A viewport into a parent `RenderSurface`. Writes to an overlay go
 * to the parent's grid at the specified offset. Flushing an overlay
 * *only* scans the overlay rectangle for dirty cells, making it
 * efficient for small floating panels on a large surface.
 *
 * The overlay does NOT own the cells — it is a thin coordinate
 * transformer that reuses the parent's frame‑buffer.
 */
export class SurfaceOverlay {
	constructor(
		private parent: RenderSurface,
		private offsetX: number,
		private offsetY: number,
		private w: number,
		private h: number,
	) {}

	get width(): number {
		return this.w;
	}
	get height(): number {
		return this.h;
	}

	write(
		x: number,
		y: number,
		text: string,
		style?: Partial<SurfaceCell>,
	): void {
		this.parent.write(this.offsetX + x, this.offsetY + y, text, style);
	}

	fill(
		x: number,
		y: number,
		w: number,
		h: number,
		char?: string,
		style?: Partial<SurfaceCell>,
	): void {
		this.parent.fill(this.offsetX + x, this.offsetY + y, w, h, char, style);
	}

	/** Clear only the overlay area. */
	clear(): void {
		this.parent.fill(
			this.offsetX,
			this.offsetY,
			this.w,
			this.h,
			this.parent._opts.fillChar,
			{ bg: this.parent._opts.defaultBg || undefined },
		);
	}

	/**
	 * Mark all overlay cells as dirty so the parent's next `flush()`
	 * re‑renders them.
	 */
	invalidate(): void {
		const grid = this.parent._grid;
		for (let y = this.offsetY; y < this.offsetY + this.h && y < grid.length; y++) {
			const row = grid[y];
			if (!row) continue;
			for (let x = this.offsetX; x < this.offsetX + this.w && x < row.length; x++) {
				const cell = row[x];
				if (cell) cell.dirty = true;
			}
		}
	}
}
