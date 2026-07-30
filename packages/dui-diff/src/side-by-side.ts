/**
 * Side-by-side diff renderer with two-column row alignment.
 *
 * Built on jsdiff's `structuredPatch()` so the hunk metadata (start
 * positions, line counts, surrounding context) is correct against
 * jsdiff's quirky EOF newline handling.
 *
 * Layout:
 *
 *   old    │  new
 *   ───────┼───────
 *    3│L3  │   3│L3       ← context (matched across both)
 *    4│-L4 │   0│         ← removed (right column empty)
 *    0│    │   4│+L4      ← added (left column empty)
 *    5│-L5 │   5│+L5       ← modified pair, word-diff highlighted
 */

import { terminalWidth, visibleLength } from "@bdocs/dui";
import { type Hunk, structuredPatch } from "diff";
import { getPalette } from "./theme";
import type { DiffOptions, DiffResult } from "./types";
import { formatLineNo, padVisible, truncateTo } from "./utils";
import { diffWords } from "./word";

// ── Public API ────────────────────────────────────────────────

export function diffSideBySide(
	oldStr: string,
	newStr: string,
	options: DiffOptions = {},
): DiffResult {
	const {
		context = 3,
		width: maxWidth,
		header: showHeader = true,
		filename,
		wordHighlight = true,
	} = options;

	const maxCols = maxWidth ?? terminalWidth();
	const palette = getPalette(options);

	const separator = " │ ";
	const sepLen = visibleLength(separator);
	const pad = 2;
	const usable = Math.max(20, maxCols - sepLen - pad);
	// Distribute columns: left gets the extra column when usable is odd
	// (ceil), right gets the remainder (floor). This prevents overflow
	// AND avoids wasting the extra column.
	const colRight = Math.max(8, Math.floor(usable / 2));
	const colLeft = Math.max(8, Math.ceil(usable / 2));

	const patch = structuredPatch("old", "new", oldStr, newStr, "", "", {
		context,
		ignoreNewlineAtEof: true,
	});

	const rows = buildRows(patch.hunks);

	let additions = 0;
	let deletions = 0;
	for (const row of rows) {
		if (row.kind === "added") additions++;
		else if (row.kind === "removed") deletions++;
		else if (row.kind === "modified") {
			additions += row.right.length;
			deletions += row.left.length;
		}
	}

	const out: string[] = [];

	if (showHeader) {
		const label = filename ?? "diff";
		out.push(palette.fileHeader(`  ${label} (side-by-side)`));
		out.push(
			palette.stat(
				`  ${colLeft}/${colRight}-column view · ${rows.length} row${rows.length === 1 ? "" : "s"}`,
			),
		);
		out.push("");
	}

	// Header row
	out.push(
		"  " +
			palette.gutter(padVisible("old", colLeft)) +
			palette.gutter(separator) +
			palette.gutter(padVisible("new", colRight)),
	);
	out.push(
		"  " +
			palette.gutter("\u2500".repeat(colLeft)) +
			palette.gutter(separator) +
			palette.gutter("\u2500".repeat(colRight)),
	);

	for (const row of rows) {
		if (row.kind === "context") {
			out.push(renderContextRow(row, colLeft, colRight, palette, separator));
		} else if (row.kind === "removed") {
			out.push(renderRemovedRow(row, colLeft, colRight, palette, separator));
		} else if (row.kind === "added") {
			out.push(renderAddedRow(row, colLeft, colRight, palette, separator));
		} else if (row.kind === "modified") {
			for (const line of renderModifiedPair(
				row,
				colLeft,
				colRight,
				palette,
				separator,
				wordHighlight,
			))
				out.push(line);
		}
	}

	const clipped = out.map((l) =>
		visibleLength(l) > maxCols ? truncateTo(l, maxCols) : l,
	);
	const output = clipped.join("\n");

	return {
		output,
		additions,
		deletions,
		hunks: patch.hunks.length,
		lines: out.length,
	};
}

// ── Row builder ───────────────────────────────────────────────

type Row =
	| {
			kind: "context";
			left: string;
			right: string;
			oldNo: number;
			newNo: number;
	  }
	| { kind: "removed"; left: string; oldNo: number }
	| { kind: "added"; right: string; newNo: number }
	| {
			kind: "modified";
			left: string[];
			right: string[];
			leftNos: number[];
			rightNos: number[];
	  };

function buildRows(hunks: Hunk[]): Row[] {
	const rows: Row[] = [];

	for (const hunk of hunks) {
		const removedBuffer: string[] = [];
		const addedBuffer: string[] = [];
		const removedNos: number[] = [];
		const addedNos: number[] = [];
		let oldLine = hunk.oldStart - 1;
		let newLine = hunk.newStart - 1;

		const flushPair = () => {
			const maxLen = Math.max(removedBuffer.length, addedBuffer.length);
			if (maxLen === 0) return;
			for (let k = 0; k < maxLen; k++) {
				const left = removedBuffer[k];
				const right = addedBuffer[k];
				if (left !== undefined && right !== undefined) {
					rows.push({
						kind: "modified",
						left: [left],
						right: [right],
						leftNos: [removedNos[k] ?? 0],
						rightNos: [addedNos[k] ?? 0],
					});
				} else if (left !== undefined) {
					rows.push({
						kind: "removed",
						left,
						oldNo: removedNos[k] ?? 0,
					});
				} else if (right !== undefined) {
					rows.push({
						kind: "added",
						right,
						newNo: addedNos[k] ?? 0,
					});
				}
			}
			removedBuffer.length = 0;
			addedBuffer.length = 0;
			removedNos.length = 0;
			addedNos.length = 0;
		};

		for (const raw of hunk.lines) {
			const stripped = raw.slice(1);
			if (raw.startsWith(" ")) {
				flushPair();
				oldLine++;
				newLine++;
				rows.push({
					kind: "context",
					left: stripped,
					right: stripped,
					oldNo: oldLine,
					newNo: newLine,
				});
			} else if (raw.startsWith("-")) {
				oldLine++;
				removedBuffer.push(stripped);
				removedNos.push(oldLine);
			} else if (raw.startsWith("+")) {
				newLine++;
				addedBuffer.push(stripped);
				addedNos.push(newLine);
			}
		}
		flushPair();
	}

	return rows;
}

// ── Sub-renderers ─────────────────────────────────────────────

function renderContextRow(
	row: Extract<Row, { kind: "context" }>,
	colLeft: number,
	colRight: number,
	palette: ReturnType<typeof getPalette>,
	separator: string,
): string {
	const leftLine =
		formatLineNo(row.oldNo, 4) + " │ " + truncateTo(row.left, colLeft - 7);
	const rightLine =
		formatLineNo(row.newNo, 4) + " │ " + truncateTo(row.right, colRight - 7);
	return (
		"  " +
		palette.context(padVisible(leftLine, colLeft)) +
		palette.gutter(separator) +
		palette.context(padVisible(rightLine, colRight))
	);
}

function renderRemovedRow(
	row: Extract<Row, { kind: "removed" }>,
	colLeft: number,
	colRight: number,
	palette: ReturnType<typeof getPalette>,
	separator: string,
): string {
	const leftLine =
		formatLineNo(row.oldNo, 4) + " │ " + truncateTo(row.left, colLeft - 7);
	const empty = formatLineNo(null, 4) + " │ ";
	return (
		"  " +
		palette.del(padVisible(leftLine, colLeft)) +
		palette.gutter(separator) +
		palette.context(padVisible(empty, colRight))
	);
}

function renderAddedRow(
	row: Extract<Row, { kind: "added" }>,
	colLeft: number,
	colRight: number,
	palette: ReturnType<typeof getPalette>,
	separator: string,
): string {
	const empty = formatLineNo(null, 4) + " │ ";
	const rightLine =
		formatLineNo(row.newNo, 4) + " │ " + truncateTo(row.right, colRight - 7);
	return (
		"  " +
		palette.context(padVisible(empty, colLeft)) +
		palette.gutter(separator) +
		palette.add(padVisible(rightLine, colRight))
	);
}

function renderModifiedPair(
	row: Extract<Row, { kind: "modified" }>,
	colLeft: number,
	colRight: number,
	palette: ReturnType<typeof getPalette>,
	separator: string,
	wordHighlight: boolean,
): string[] {
	const out: string[] = [];
	const linePairs = Math.max(row.left.length, row.right.length);

	for (let k = 0; k < linePairs; k++) {
		const leftText = row.left[k] ?? "";
		const rightText = row.right[k] ?? "";
		const oldNo = row.leftNos[k] ?? 0;
		const newNo = row.rightNos[k] ?? 0;

		let leftRendered = leftText;
		let rightRendered = rightText;
		if (
			wordHighlight &&
			leftText !== "" &&
			rightText !== "" &&
			leftText !== rightText
		) {
			const segs = diffWords(leftText, rightText);
			leftRendered = "";
			rightRendered = "";
			for (const s of segs) {
				if (s.added) rightRendered += palette.wordAdd(s.value);
				else if (s.removed) leftRendered += palette.wordDel(s.value);
				else {
					leftRendered += s.value;
					rightRendered += s.value;
				}
			}
		}

		const leftFull =
			formatLineNo(oldNo, 4) + " │ " + truncateTo(leftRendered, colLeft - 7);
		const rightFull =
			formatLineNo(newNo, 4) + " │ " + truncateTo(rightRendered, colRight - 7);

		out.push(
			"  " +
				palette.del(padVisible(leftFull, colLeft)) +
				palette.gutter(separator) +
				palette.add(padVisible(rightFull, colRight)),
		);
	}
	return out;
}
