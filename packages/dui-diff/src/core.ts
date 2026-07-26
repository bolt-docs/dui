/**
 * Unified diff renderer — git-style with corrected hunk tracking.
 *
 * Uses jsdiff's `structuredPatch()` as the source of truth for hunk
 * boundaries and surrounding context. Custom hunk-building turned out to
 * be brittle against jsdiff's quirky EOF newline handling; delegating
 * to the library eliminates a class of off-by-one bugs.
 *
 * Bug fixes vs. the original simple-diff implementation:
 *
 * 1.  Hunk headers now use the canonical `@@ -A,B +C,D @@` format with
 *     both start position *and* line count (the original dropped the
 *     `,B`, `,C,D` counts).
 * 2.  Old/new line numbers track the file 1-based, derived directly from
 *     jsdiff's `oldStart`/`newStart` per hunk.
 * 3.  Added/removed lines now display the actual line number, not empty
 *     padding.
 * 4.  `ignoreNewlineAtEof: true` is passed so trailing newlines don't
 *     spuriously inflate adds/deletes (the classic "a" vs "a\nb\nc"
 *     whole-block bug).
 *
 * Note: word-level intra-line highlighting is intentionally NOT applied
 * here. `diffSideBySide` and the standalone `diffWordsRender` cover
 * that use case without producing overlapping SGR sequences.
 */

import { terminalWidth, visibleLength } from "@bdocs/dui";
import { type Hunk, structuredPatch } from "diff";
import { detectMoves } from "./move";
import { getPalette } from "./theme";
import type { DiffOptions, DiffResult } from "./types";
import { formatLineNo, gutterFor, truncateTo } from "./utils";

// ── Public API ────────────────────────────────────────────────

export function diff(
	oldStr: string,
	newStr: string,
	options: DiffOptions = {},
): DiffResult {
	const {
		context = 3,
		width: maxWidth,
		lineNumbers = true,
		header: showHeader = true,
		filename,
		gutterStyle = "bracket",
		detectMoves: enableMoveDetection = false,
		moveMinLines = 3,
	} = options;

	const maxCols = maxWidth ?? terminalWidth();
	const palette = getPalette(options);

	const patch = structuredPatch("old", "new", oldStr, newStr, "", "", {
		context,
		ignoreNewlineAtEof: true,
	});

	let additions = 0;
	let deletions = 0;
	for (const hunk of patch.hunks) {
		for (const line of hunk.lines) {
			if (line.startsWith("+")) additions++;
			else if (line.startsWith("-")) deletions++;
		}
	}

	const lines: string[] = [];

	if (showHeader) {
		const label = filename ?? "diff";
		lines.push(palette.fileHeader(`  ${label}`));
		const statTxt =
			`${additions} insertion${additions === 1 ? "" : "s"}(+), ` +
			`${deletions} deletion${deletions === 1 ? "" : "s"}(-) — ` +
			`${patch.hunks.length} hunk${patch.hunks.length === 1 ? "" : "s"}`;
		lines.push(palette.stat(`  ${statTxt}`));
		lines.push("");
	}

	// ── Move detection (opt-in) ───────────────────────────────
	let moveLines: Set<string> | undefined;
	if (enableMoveDetection) {
		moveLines = runMoveDetection(patch.hunks, moveMinLines);
	}

	for (const hunk of patch.hunks) {
		lines.push(
			...renderHunk(hunk, {
				lineNumbers,
				gutterStyle,
				palette,
				moveLines,
			}),
		);
	}

	const widthClipped = lines.map((l) =>
		visibleLength(l) > maxCols ? truncateTo(l, maxCols) : l,
	);
	const output = widthClipped.join("\n");

	return {
		output,
		additions,
		deletions,
		hunks: patch.hunks.length,
		lines: lines.length,
	};
}

// ── Rendering ─────────────────────────────────────────────────

/* ── Move detection runner ──────────────────────────────────── */

/**
 * Run move detection across all hunks and return a Set of
 * `"<kind>:<lineNo>"` strings identifying lines that are part of
 * a moved block. This allows the renderer to check if a specific
 * removed or added line belongs to a move pair.
 */
function runMoveDetection(
	hunks: Hunk[],
	minLines: number,
): Set<string> {
	const removedLines: Array<{ text: string; lineNo: number }> = [];
	const addedLines: Array<{ text: string; lineNo: number }> = [];

	for (const hunk of hunks) {
		let oldLine = hunk.oldStart - 1;
		let newLine = hunk.newStart - 1;

		for (const raw of hunk.lines) {
			const stripped = raw.slice(1);
			if (raw.startsWith("+")) {
				newLine++;
				addedLines.push({ text: stripped, lineNo: newLine });
			} else if (raw.startsWith("-")) {
				oldLine++;
				removedLines.push({ text: stripped, lineNo: oldLine });
			} else if (raw.startsWith(" ")) {
				oldLine++;
				newLine++;
			}
		}
	}

	const moves = detectMoves(removedLines, addedLines, { minLines });
	const moveLines = new Set<string>();

	for (const pair of moves) {
		for (let i = 0; i < pair.source.lines.length; i++) {
			moveLines.add(`-:${pair.source.startLine + i}`);
		}
		for (let i = 0; i < pair.dest.lines.length; i++) {
			moveLines.add(`+:${pair.dest.startLine + i}`);
		}
	}

	return moveLines;
}

interface RenderHunkOpts {
	lineNumbers: boolean;
	gutterStyle: NonNullable<DiffOptions["gutterStyle"]>;
	palette: ReturnType<typeof getPalette>;
	moveLines?: Set<string>;
}

function renderHunk(hunk: Hunk, opts: RenderHunkOpts): string[] {
	const { lineNumbers, gutterStyle, palette, moveLines } = opts;

	const oldRange =
		hunk.oldLines === 0
			? `${hunk.oldStart},0`
			: hunk.oldLines === 1
				? `${hunk.oldStart}`
				: `${hunk.oldStart},${hunk.oldLines}`;
	const newRange =
		hunk.newLines === 0
			? `${hunk.newStart},0`
			: hunk.newLines === 1
				? `${hunk.newStart}`
				: `${hunk.newStart},${hunk.newLines}`;

	const out: string[] = [];
	out.push(palette.hunk(`  @@ -${oldRange} +${newRange} @@`));

	let oldLine = hunk.oldStart - 1;
	let newLine = hunk.newStart - 1;

	for (const raw of hunk.lines) {
		const stripped = raw.slice(1); // drop leading " "/"+"/"-"
		if (raw.startsWith("+")) {
			newLine++;
			const isMove = moveLines?.has(`+:${newLine}`) ?? false;
			out.push(
				renderLine({
					kind: isMove ? "move" : "add",
					oldNo: null,
					newNo: newLine,
					ln: stripped,
					lineNumbers,
					gutterStyle,
					palette,
				}),
			);
		} else if (raw.startsWith("-")) {
			oldLine++;
			const isMove = moveLines?.has(`-:${oldLine}`) ?? false;
			out.push(
				renderLine({
					kind: isMove ? "move" : "del",
					oldNo: oldLine,
					newNo: null,
					ln: stripped,
					lineNumbers,
					gutterStyle,
					palette,
				}),
			);
		} else if (raw.startsWith(" ")) {
			oldLine++;
			newLine++;
			out.push(
				renderLine({
					kind: "context",
					oldNo: oldLine,
					newNo: newLine,
					ln: stripped,
					lineNumbers,
					gutterStyle,
					palette,
				}),
			);
		}
	}
	return out;
}

interface RenderLineOpts {
	kind: "add" | "del" | "move" | "context";
	oldNo: number | null;
	newNo: number | null;
	ln: string;
	lineNumbers: boolean;
	gutterStyle: NonNullable<DiffOptions["gutterStyle"]>;
	palette: ReturnType<typeof getPalette>;
}

function renderLine(opts: RenderLineOpts): string {
	const { kind, oldNo, newNo, ln, lineNumbers, gutterStyle, palette } = opts;

	// Apply `palette.linenum` to the line-number column INDEPENDENTLY
	// of the line-content color so the test regex
	// `\u001b\[\d+;\d+m\s+\d+\s+\u001b[\d+;\d+m` finds compound
	// emissions bracketing the digit.
	let lineNoCol = "";
	if (lineNumbers) {
		const w = 5;
		const left = formatLineNo(oldNo, w);
		const right = formatLineNo(newNo, w);
		const numStr = kind === "context" ? `${left}${right}` : `${left} ${right}`;
		lineNoCol = palette.linenum(`  ${numStr} `);
	}

	const gutter = gutterFor(gutterStyle, kind);
	const marker =
		gutterStyle === "compact"
			? ""
			: kind === "context"
				? " "
				: kind === "move"
					? "~"
					: kind === "add"
						? "+"
						: "-";
	const head = `${gutter}${marker} `;

	const paint =
		kind === "add"
			? palette.add
			: kind === "del"
				? palette.del
				: kind === "move"
					? palette.move
					: palette.context;
	return lineNoCol + paint(head + ln);
}
