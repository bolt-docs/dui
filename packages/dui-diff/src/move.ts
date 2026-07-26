/**
 * Move detection for diffs — identify when code blocks were moved
 * within a file rather than deleted and added independently.
 *
 * ## Algorithm
 *
 * 1. Split the diff's removed (`-`) and added (`+`) lines into
 *    contiguous blocks (runs of consecutive removed or added lines).
 * 2. For each block, compute a content hash (SHA-1-like fingerprint
 *    of the block's text).
 * 3. Match removed blocks to added blocks by exact hash equality.
 *    When a match is found, mark both as "moved" — the removed block
 *    is a "move source" and the added block is a "move destination".
 * 4. Blocks smaller than `minLines` are excluded from detection to
 *    avoid false positives on boilerplate (e.g. closing braces).
 * 5. Unmatched blocks remain as regular deletions/insertions.
 *
 * The algorithm is O(n²) in the number of blocks, which is typically
 * small (single-digit) even for large diffs.
 *
 * @example
 * ```ts
 * import { detectMoves } from "@dui-toolkit/plugin-diff"
 *
 * const moves = detectMoves(removedBlocks, addedBlocks)
 * // moves → [{ source: { lines, oldStart }, dest: { lines, newStart } }]
 * ```
 */

/**
 * A contiguous block of lines that were all removed or all added.
 */
export interface LineBlock {
	/** 1-based line number where this block starts. */
	startLine: number;
	/** The raw lines in this block (without `+`/`-` prefixes). */
	lines: string[];
	/** Hash of concatenated lines (hex string). */
	hash: string;
}

/**
 * A matched pair: a removed block that was moved to a new location.
 */
export interface MovePair {
	source: LineBlock;
	dest: LineBlock;
}

export interface MoveDetectOptions {
	/**
	 * Minimum number of consecutive lines for a block to be considered
	 * for move detection. Smaller blocks are unlikely to be meaningful
	 * moves. Default: `3`.
	 */
	minLines?: number;
}

/* ── Hashing ─────────────────────────────────────────────────── */

/**
 * Simple non-cryptographic hash for line-block content.
 * Uses DJB2 (xor variant) — fast, deterministic, no dependencies.
 */
function hashBlock(lines: string[]): string {
	let hash = 5381;
	for (const line of lines) {
		for (let i = 0; i < line.length; i++) {
			hash = ((hash << 5) - hash + line.charCodeAt(i)) | 0;
		}
		// Include newline separator in hash
		hash = ((hash << 5) - hash + 10) | 0; // 10 = \n
	}
	// Return as unsigned hex string
	return (hash >>> 0).toString(16).padStart(8, "0");
}

/* ── Block extraction ────────────────────────────────────────── */

/**
 * Split an array of lines (with their 1-based line numbers) into
 * contiguous blocks of consecutive lines.
 *
 * @param lines - Array of `{ text, lineNo }` pairs
 * @param minLines - Minimum block size
 * @returns Array of blocks
 */
function extractBlocks(
	lines: Array<{ text: string; lineNo: number }>,
	minLines: number,
): LineBlock[] {
	const blocks: LineBlock[] = [];
	let current: LineBlock | null = null;

	for (const entry of lines) {
		if (!current) {
			current = {
				startLine: entry.lineNo,
				lines: [entry.text],
				hash: "",
			};
			continue;
		}

		// Check if this line is consecutive (lineNo === prev + 1)
		const prevLineNo: number = current.startLine + current.lines.length;
		if (entry.lineNo === prevLineNo) {
			current.lines.push(entry.text);
		} else {
			// Block ended — flush
			if (current.lines.length >= minLines) {
				current.hash = hashBlock(current.lines);
				blocks.push(current);
			}
			current = {
				startLine: entry.lineNo,
				lines: [entry.text],
				hash: "",
			};
		}
	}

	// Flush last block
	if (current && current.lines.length >= minLines) {
		current.hash = hashBlock(current.lines);
		blocks.push(current);
	}

	return blocks;
}

/* ── Main detection ──────────────────────────────────────────── */

/**
 * Detect moved blocks in a diff by matching removed blocks to added
 * blocks via content hash.
 *
 * @param removedLines - Array of `{ text, lineNo }` for removed lines
 * @param addedLines - Array of `{ text, lineNo }` for added lines
 * @param options - Detection options
 * @returns Array of matched `MovePair` objects (empty when no moves)
 *
 * @example
 * ```ts
 * const removed = [
 *   { text: "function oldName() {", lineNo: 10 },
 *   { text: "  return 42",          lineNo: 11 },
 *   { text: "}",                     lineNo: 12 },
 * ]
 * const added = [
 *   { text: "function oldName() {", lineNo: 42 },
 *   { text: "  return 42",          lineNo: 43 },
 *   { text: "}",                     lineNo: 44 },
 * ]
 * const moves = detectMoves(removed, added, { minLines: 3 })
 * // moves[0].source.startLine === 10
 * // moves[0].dest.startLine === 42
 * ```
 */
export function detectMoves(
	removedLines: Array<{ text: string; lineNo: number }>,
	addedLines: Array<{ text: string; lineNo: number }>,
	options: MoveDetectOptions = {},
): MovePair[] {
	const { minLines = 3 } = options;

	const removedBlocks = extractBlocks(removedLines, minLines);
	const addedBlocks = extractBlocks(addedLines, minLines);

	if (removedBlocks.length === 0 || addedBlocks.length === 0) {
		return [];
	}

	// Build a hash → block map for added blocks (O(n) lookup)
	const addedByHash = new Map<string, LineBlock>();
	for (const block of addedBlocks) {
		// Use the LAST occurrence of each hash so we match the closest
		// destination — avoids matching a function moved to an earlier
		// copy when it was actually moved to a later one.
		addedByHash.set(block.hash, block);
	}

	// Match removed blocks to added blocks
	const moves: MovePair[] = [];
	const matchedDestHashes = new Set<string>();

	for (const removedBlock of removedBlocks) {
		const dest = addedByHash.get(removedBlock.hash);
		if (!dest) continue;
		if (matchedDestHashes.has(removedBlock.hash)) continue;

		matchedDestHashes.add(removedBlock.hash);
		moves.push({ source: removedBlock, dest });
	}

	return moves;
}
