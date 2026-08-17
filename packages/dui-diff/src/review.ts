/**
 * Diff review — interactive hunk-by-hunk application (diff v2).
 *
 * Builds on jsdiff's `structuredPatch()` (the same source of truth as
 * `core.ts` / `side-by-side.ts`) and exposes:
 *
 *   - `parseDiff()`        — pure hunk parsing with per-hunk stats
 *   - `serializeHunks()`   — rebuild a unified patch string from selected
 *                            hunks (pure)
 *   - `applyHunks()`       — apply selected hunks to content (pure,
 *                            delegates to jsdiff's battle-tested
 *                            `applyPatch()` so offsets stay correct)
 *   - `reviewDiff()`       — interactive picker (git-add-p style keys:
 *                            `j`/`k` navigate, `a`/`d` apply/discard,
 *                            `A`/`D` all, `?` help, `q`/Esc quit,
 *                            Ctrl+C cancels). Falls back to a non-TTY
 *                            mode when stdin/stdout aren't terminals.
 *   - `applyDiff()`        — apply the reviewed result to the working
 *                            tree (node:fs).
 *
 * The interactive keymap deliberately mirrors `git add -p` so muscle
 * memory transfers: `y` applies a hunk, `n` skips it, `A`/`D` decide
 * the rest at once, `q` quits leaving undecided hunks untouched.
 */

import { applyPatch, structuredPatch } from "diff";
import { getPalette } from "./theme";
import type { DiffOptions } from "./types";
import { truncateTo } from "./utils";

// ── Data model ─────────────────────────────────────────────────

/** One parsed hunk with its own stats and raw `prefix + text` lines. */
export interface DiffHunk {
	index: number;
	oldStart: number;
	oldLines: number;
	newStart: number;
	newLines: number;
	additions: number;
	deletions: number;
	/** Raw jsdiff lines (" x", "-x", "+x"). */
	lines: string[];
	/** Lines with the prefix stripped. */
	content: string[];
}

/** A parsed diff — hunks + aggregate stats. */
export interface DiffReview {
	hunks: DiffHunk[];
	additions: number;
	deletions: number;
}

/** Result of `reviewDiff()` / `applyDiff()`. */
export interface DiffReviewResult {
	review: DiffReview;
	/** Per-hunk decision (`true` = apply). */
	applied: boolean[];
	/** Unified patch of the selected hunks only ("" when none). */
	patch: string;
	/** Content after applying the selected hunks (original when none). */
	output: string;
	/** Stats of the selected hunks only. */
	additions: number;
	deletions: number;
	/** True when at least one hunk was applied. */
	changed: boolean;
	/** True when the user cancelled (Ctrl+C) before finishing. */
	cancelled: boolean;
}

export interface ReviewDiffOptions extends DiffOptions {
	/**
	 * Force the non-interactive path even on a TTY (useful for tests,
	 * CI, or embedding in pipelines). Default: `false`.
	 */
	disable?: boolean;
	/**
	 * In non-interactive mode, start with every hunk applied. Default:
	 * `false` (review-only — nothing is applied unless a TTY picker
	 * decides otherwise).
	 */
	defaultApply?: boolean;
	/**
	 * Number of diff lines to show for the focused hunk. Default: 12.
	 */
	hunkSize?: number;
	/** Override file label shown in the review header. */
	filename?: string;
}

// ── Pure helpers ───────────────────────────────────────────────

/**
 * Parse a diff between two strings into hunks with per-hunk stats.
 * Pure — no IO, no terminal interaction.
 */
export function parseDiff(
	oldContent: string,
	newContent: string,
	options: DiffOptions = {},
): DiffReview {
	const patch = structuredPatch("old", "new", oldContent, newContent, "", "", {
		context: options.context ?? 3,
		ignoreNewlineAtEof: true,
	});

	const hunks: DiffHunk[] = patch.hunks.map((h, i) => {
		let additions = 0;
		let deletions = 0;
		for (const line of h.lines) {
			if (line.startsWith("+")) additions++;
			else if (line.startsWith("-")) deletions++;
		}
		return {
			index: i,
			oldStart: h.oldStart,
			oldLines: h.oldLines,
			newStart: h.newStart,
			newLines: h.newLines,
			additions,
			deletions,
			lines: [...h.lines],
			content: h.lines.map((l) => l.slice(1)),
		};
	});

	return {
		hunks,
		additions: hunks.reduce((s, h) => s + h.additions, 0),
		deletions: hunks.reduce((s, h) => s + h.deletions, 0),
	};
}

/** Render a hunk back into unified patch text. Pure. */	export function serializeHunk(hunk: DiffHunk): string {
		// jsdiff's own `formatPatch` renders a zero-count side as `0,0`
		// (not `start,0`) — matching that convention keeps `applyPatch`
		// round-trips exact (a `1,0` old side makes jsdiff insert a
		// spurious leading newline on pure additions).
		const oldRange =
			hunk.oldLines === 0
				? "0,0"
				: hunk.oldLines === 1
					? `${hunk.oldStart}`
					: `${hunk.oldStart},${hunk.oldLines}`;
		const newRange =
			hunk.newLines === 0
				? "0,0"
				: hunk.newLines === 1
					? `${hunk.newStart}`
					: `${hunk.newStart},${hunk.newLines}`;
		return `@@ -${oldRange} +${newRange} @@\n${hunk.lines.join("\n")}\n`;
	}

/**
 * Serialize a subset of hunks (by `applied` mask) into one unified
 * patch string. Pure.
 */
export function serializeHunks(
	hunks: DiffHunk[],
	applied: boolean[],
): string {
	let out = "";
	for (let i = 0; i < hunks.length; i++) {
		if (applied[i]) out += serializeHunk(hunks[i]);
	}
	return out;
}

/**
 * Apply the selected hunks to `oldContent`, returning the resulting
 * text. Delegates to jsdiff's `applyPatch()` so line offsets between
 * non-contiguous hunks are handled correctly. Pure.
 */
export function applyHunks(
	oldContent: string,
	hunks: DiffHunk[],
	applied: boolean[],
): string {
	const any = applied.some(Boolean);
	if (!any || hunks.length === 0) return oldContent;

	const patchText = serializeHunks(hunks, applied);
	const result = applyPatch(oldContent, patchText);
	if (typeof result === "string") return result;
	// jsdiff returns `false` when the patch cannot be applied cleanly.
	// Fall back to a manual merge rather than silently dropping hunks.
	return applyHunksManual(oldContent, hunks, applied);
}

/**
 * Deterministic fallback merge: walk the old file line-by-line and
 * splice in the selected hunks, tracking the offset introduced by
 * previously applied hunks. Only used when jsdiff's `applyPatch`
 * refuses a patch (e.g. ambiguous context).
 */
function applyHunksManual(
	oldContent: string,
	hunks: DiffHunk[],
	applied: boolean[],
): string {
	const lines = splitKeepTrailing(oldContent);
	const out: string[] = [];
	let pos = 0;

	for (let i = 0; i < hunks.length; i++) {
		if (!applied[i]) continue;
		const h = hunks[i];
		// Hunk starts at 1-based oldStart in the ORIGINAL file; `pos`
		// tracks how many original lines we have already consumed.
		const start = h.oldStart - 1;
		if (start < pos || start > lines.length) continue;
		// Copy untouched lines up to the hunk start.
		while (pos < start) out.push(lines[pos++]);
		// Consume hunk lines: context/removed come from `lines`, added
		// are inserted.
		for (const raw of h.lines) {
			if (raw.startsWith("+")) {
				out.push(raw.slice(1));
			} else {
				// Context or removal — both consume one source line.
				const src = lines[pos];
				if (src !== undefined) {
					if (raw.startsWith(" ")) out.push(src);
					pos++;
				}
			}
		}
	}

	while (pos < lines.length) out.push(lines[pos++]);
	return joinKeepingTrailing(out, lines);
}

/** Split preserving a trailing empty element so EOF newlines round-trip. */
function splitKeepTrailing(text: string): string[] {
	return text.split("\n");
}

/** Re-join lines, preserving the original trailing-newline state. */
function joinKeepingTrailing(lines: string[], original: string[]): string {
	const trailing = original.length > 0 && original[original.length - 1] === "";
	const joined = lines.join("\n");
	return trailing && !joined.endsWith("\n") ? `${joined}\n` : joined;
}

// ── Interactive review ─────────────────────────────────────────

/**
 * Interactive hunk-by-hunk review of `oldContent` → `newContent`.
 *
 * On a TTY the user navigates hunks with `j`/`k` (or arrows) and
 * decides each with `a`/`y` (apply) or `d`/`n` (discard); `A`/`D`
 * apply/discard every remaining hunk at once; `?` toggles the help
 * line; `q`/Esc finishes with the current selections; Ctrl+C cancels
 * the whole review (`cancelled: true`, nothing applied).
 *
 * Without a TTY (or with `disable: true`) it skips straight to the
 * result — every hunk left unapplied unless `defaultApply: true`.
 */
export async function reviewDiff(
	oldContent: string,
	newContent: string,
	options: ReviewDiffOptions = {},
): Promise<DiffReviewResult> {
	const review = parseDiff(oldContent, newContent, options);
	const interactive =
		!options.disable &&
		!!process.stdin.isTTY &&
		!!process.stdout.isTTY;

	if (!interactive) {
		const applied = review.hunks.map(() => options.defaultApply ?? false);
		return buildResult(review, applied, oldContent);
	}

	return interactiveReview(oldContent, review, options);
}

/** Build the final result object from a decision mask. Pure. */
function buildResult(
	review: DiffReview,
	applied: boolean[],
	oldContent: string,
): DiffReviewResult {
	const output = applyHunks(oldContent, review.hunks, applied);
	let additions = 0;
	let deletions = 0;
	for (let i = 0; i < review.hunks.length; i++) {
		if (applied[i]) {
			additions += review.hunks[i].additions;
			deletions += review.hunks[i].deletions;
		}
	}
	return {
		review,
		applied: [...applied],
		patch: serializeHunks(review.hunks, applied),
		output,
		additions,
		deletions,
		changed: additions + deletions > 0,
		cancelled: false,
	};
}

/** Rows (plain text) of one rendered hunk for the interactive view. */
function renderHunkPlain(
	hunk: DiffHunk,
	applied: boolean,
	maxLines: number,
): string[] {
	const out: string[] = [];
	const status = applied ? "✓ apply" : "· skip";
	out.push(`  hunk ${hunk.index + 1}  ${status}`);
	const lines = hunk.lines;
	const head = lines.length > maxLines ? maxLines : lines.length;
	for (let i = 0; i < head; i++) {
		const raw = lines[i];
		const prefix = raw[0];
		const text = raw.slice(1);
		out.push(`  ${prefix === "+" ? "+" : prefix === "-" ? "-" : " "} ${text}`);
	}
	if (lines.length > maxLines) {
		out.push(`  … ${lines.length - maxLines} more line(s)`);
	}
	return out;
}

function interactiveReview(
	oldContent: string,
	review: DiffReview,
	options: ReviewDiffOptions,
): Promise<DiffReviewResult> {
	return new Promise<DiffReviewResult>((resolve, reject) => {
		const stdin = process.stdin;
		const stdout = process.stdout;
		const palette = getPalette(options);
		const hunks = review.hunks;

		if (hunks.length === 0) {
			resolve(buildResult(review, [], oldContent));
			return;
		}

		const hunkSize = options.hunkSize ?? 12;
		let cursor = 0;
		let applied = review.hunks.map(() => false);
		let showHelp = false;
		let done = false;
		let linesRendered = 0;
		let buf = "";

		const paint = (s: string, kind: "add" | "del" | "context" | "stat" | "hunk") =>
			kind === "add"
				? palette.add(s)
				: kind === "del"
					? palette.del(s)
					: kind === "context"
						? palette.context(s)
						: kind === "stat"
							? palette.stat(s)
							: palette.hunk(s);

		const truncate = (s: string, max: number): string =>
			truncateTo(s, max);

		function render() {
			if (done) return;
			const maxCols = options.width ?? 120;
			const lines: string[] = [];
			const filename = options.filename ?? "diff";
			const sel = applied.filter(Boolean).length;
			lines.push(
				palette.fileHeader(
					truncate(`  ${filename} — review ${cursor + 1}/${hunks.length}`, maxCols),
				),
			);
			lines.push(
				palette.stat(
					truncate(
						`  ${review.additions} additions, ${review.deletions} deletions · ` +
							`${sel} applied, ${hunks.length - sel} skipped`,
						maxCols,
					),
				),
			);
			lines.push("");

			const hunk = hunks[cursor];
			const hunkLines = renderHunkPlain(hunk, applied[cursor], hunkSize);
			// First row is the hunk header — paint it in the applied/hunk color.
			lines.push(paint(truncate(hunkLines[0], maxCols), applied[cursor] ? "add" : "hunk"));
			for (let i = 1; i < hunkLines.length; i++) {
				const l = hunkLines[i];
				const marker = l[2]; // after the leading "  "
				const painted =
					marker === "+"
						? paint(truncate(l, maxCols), "add")
						: marker === "-"
							? paint(truncate(l, maxCols), "del")
							: paint(truncate(l, maxCols), "context");
				lines.push(painted);
			}

			const help =
				"  j/k move · a/y apply · d/n discard · A apply all · D discard all · q quit · ? help";
			const hint = showHelp ? help : "  j/k navigate, a/d decide, q quit, ? help";
			lines.push("");
			lines.push(palette.stat(truncate(hint, maxCols)));

			const output = lines.join("\n");
			if (linesRendered > 0) {
				stdout.write(`\x1b[${linesRendered}A`);
			} else {
				stdout.write("\x1b[H");
			}
			// readline.cursorTo + clearScreenDown equivalents (raw SGR
			// keeps this module free of the color-gating hazard).
			stdout.write("\x1b[0G");
			stdout.write("\x1b[J");
			stdout.write(output);
			linesRendered = lines.length;
		}

		function cleanup() {
			if (done) return;
			done = true;
			stdin.removeListener("data", onData);
			stdin.setRawMode(false);
		}

		function finish(cancelled: boolean) {
			cleanup();
			// Clear the interactive frame.
			if (linesRendered > 0) {
				stdout.write(`\x1b[${linesRendered}A`);
			}
			stdout.write("\x1b[0G");
			stdout.write("\x1b[J");
			if (cancelled) {
				const r = buildResult(review, [], oldContent);
				r.cancelled = true;
				resolve(r);
			} else {
				resolve(buildResult(review, applied, oldContent));
			}
		}

		function onData(data: string | Buffer) {
			if (done) return;
			const text = typeof data === "string" ? data : data.toString("utf8");
			buf += text;
			if (buf.length > 64) buf = buf.slice(-16);

			if (buf.includes("\x1b[A")) {
				buf = "";
				cursor = cursor <= 0 ? hunks.length - 1 : cursor - 1;
				render();
				return;
			}
			if (buf.includes("\x1b[B")) {
				buf = "";
				cursor = cursor >= hunks.length - 1 ? 0 : cursor + 1;
				render();
				return;
			}
			if (buf === "\x1b") {
				Promise.resolve().then(() => {
					if (done || buf !== "\x1b") return;
					buf = "";
					finish(false);
				});
				return;
			}

			const last = buf[buf.length - 1];
			switch (last) {
				case "j":
					buf = "";
					cursor = cursor >= hunks.length - 1 ? 0 : cursor + 1;
					render();
					break;
				case "k":
					buf = "";
					cursor = cursor <= 0 ? hunks.length - 1 : cursor - 1;
					render();
					break;
				case "a":
				case "y":
					buf = "";
					applied[cursor] = true;
					cursor = cursor >= hunks.length - 1 ? 0 : cursor + 1;
					render();
					break;
				case "d":
				case "n":
					buf = "";
					applied[cursor] = false;
					cursor = cursor >= hunks.length - 1 ? 0 : cursor + 1;
					render();
					break;
				case "A":
					buf = "";
					applied = applied.map(() => true);
					finish(false);
					break;
				case "D":
					buf = "";
					applied = applied.map(() => false);
					finish(false);
					break;
				case "?":
					buf = "";
					showHelp = !showHelp;
					render();
					break;
				case "q":
					buf = "";
					finish(false);
					break;
				case "\r":
				case "\n":
					buf = "";
					finish(false);
					break;
				case "\x03": {
					buf = "";
					finish(true);
					break;
				}
				default:
					if (buf.length > 1) buf = "";
			}
		}

		stdin.setRawMode(true);
		stdin.setEncoding("utf8");
		stdin.on("data", onData);
		render();
	});
}

// ── Apply to the working tree ─────────────────────────────────

export interface DiffFileEntry {
	/** Absolute or cwd-relative path to write. */
	path: string;
	oldContent: string;
	newContent: string;
	/** Display label (defaults to `path`). */
	filename?: string;
	options?: ReviewDiffOptions;
}

export interface ApplyDiffResult {
	files: Array<{
		path: string;
		changed: boolean;
		cancelled: boolean;
		additions: number;
		deletions: number;
		output: string;
	}>;
	changedFiles: number;
	skippedFiles: number;
}

/**
 * Run an interactive (or non-interactive) review for each entry and
 * write the resulting content to disk. Pass `options.disable: true`
 * (or `defaultApply: true`) to skip interactivity in pipelines.
 *
 * The `writeFile` parameter is injectable for tests; it defaults to
 * `node:fs/promises.writeFile`.
 */
export async function applyDiff(
	entries: DiffFileEntry[],
	options: {
		writeFile?: (path: string, content: string) => Promise<void>;
		/** Skip writing entirely — useful as a dry-run. */
		dryRun?: boolean;
	} = {},
): Promise<ApplyDiffResult> {
	const write = options.writeFile ?? (async (p, c) => {
		const fs = await import("node:fs/promises");
		await fs.writeFile(p, c, "utf8");
	});

	const files: ApplyDiffResult["files"] = [];
	let changedFiles = 0;
	let skippedFiles = 0;

	for (const entry of entries) {
		const result = await reviewDiff(
			entry.oldContent,
			entry.newContent,
			{ ...entry.options, filename: entry.filename ?? entry.path },
		);
		const record = {
			path: entry.path,
			changed: result.changed,
			cancelled: result.cancelled,
			additions: result.additions,
			deletions: result.deletions,
			output: result.output,
		};
		files.push(record);
		if (result.cancelled) {
			skippedFiles++;
			continue;
		}
		if (result.changed) {
			if (!options.dryRun) {
				await write(entry.path, result.output);
			}
			changedFiles++;
		} else {
			skippedFiles++;
		}
	}

	return { files, changedFiles, skippedFiles };
}
