/**
 * High-level helpers reused by other modules.
 *
 * IMPORTANT: this file deliberately emits raw SGR codes (e.g.
 * `\x1b[32m`) instead of delegating to `colors.X` from
 * `@bdocs/dui`. The latter is gated by `isColorSupported` (a
 * module-load-time IIFE in `dui/src/color.ts`) which vitest's
 * pre-bundling + worker pool can leave stale, so any code that
 * depended on it would silently emit plain text in tests
 * (the same hazard documented in `theme.ts` / `word.ts`).
 * Consumers who want plain output can pass explicit identity
 * painters via the per-call options / theme config.
 */

import { diff } from "./core";
import { getPalette } from "./theme";
import type {
	DiffOptions,
	DiffResult,
	MultiFileDiffInput,
	MultiFileDiffResult,
	WordDiffSegment,
} from "./types";
import { diffWords } from "./word";

export type { WordDiffSegment };

/** Wrap a string in bold + reset. */
const bold = (s: string): string => `\x1b[1m${s}\x1b[22m`;
/** Wrap a string in green fg. */
const green = (s: string): string => `\x1b[32m${s}\x1b[39m`;
/** Wrap a string in red fg. */
const red = (s: string): string => `\x1b[31m${s}\x1b[39m`;
/** Wrap a string in bg-green + fg-black (badge style). */
const badgeGreen = (s: string): string => `\x1b[42;30m${s}\x1b[49;39m`;
/** Wrap a string in bg-red + fg-white (badge style). */
const badgeRed = (s: string): string => `\x1b[41;37m${s}\x1b[49;39m`;
/** Wrap a string in bg-yellow + fg-black (badge style). */
const badgeYellow = (s: string): string => `\x1b[43;30m${s}\x1b[49;39m`;

/**
 * Render a one-line summary widget like `2 files changed, +12, -3`.
 */
export function diffStat(result: DiffResult | MultiFileDiffResult): string {
	if ("totals" in result) {
		const t = result.totals;
		return (
			bold(`  ${t.files} file${t.files === 1 ? "" : "s"} changed`) +
			", " +
			green(`+${t.additions}`) +
			", " +
			red(`-${t.deletions}`)
		);
	}
	const r = result;
	return (
		bold(`  ${r.hunks} hunk${r.hunks === 1 ? "" : "s"}`) +
		", " +
		green(`+${r.additions}`) +
		", " +
		red(`-${r.deletions}`)
	);
}

/**
 * Render the word-level differences for one modified line pair as
 * ANSI-formatted strings ready to drop into a UI. Uses raw SGR
 * (see `word.ts` for the same rationale).
 */
export function diffWordsRender(
	oldLine: string,
	newLine: string,
): { old: string; new: string } {
	const segs = diffWords(oldLine, newLine);
	let old = "";
	let next = "";
	for (const s of segs) {
		if (s.added) next += badgeGreen(s.value);
		else if (s.removed) old += badgeRed(s.value);
		else {
			old += s.value;
			next += s.value;
		}
	}
	return { old, new: next };
}

/**
 * Compose a multi-file diff from a list of file pairs. Each file gets
 * its own section with status badge and per-file stats.
 */
export interface MultiDiffExtra {
	showFileHeaders?: boolean;
	sortFiles?: boolean;
}

export function diffFiles(
	files: MultiFileDiffInput[],
	options: MultiDiffExtra & Partial<DiffOptions> = {},
): MultiFileDiffResult {
	const sorted = options.sortFiles
		? [...files].sort((a, b) =>
				(a.newPath || a.oldPath).localeCompare(b.newPath || b.oldPath),
			)
		: files;

	// Forward every per-call palette override so `diffFiles([…], { addColor,
	// hunkColor, ... })` matches the contract of `diff()` and
	// `diffSideBySide()`.
	const palette = getPalette(options as Partial<DiffOptions>);
	const newBadge = (s: string) => badgeGreen(` ${s} `);
	const delBadge = (s: string) => badgeRed(` ${s} `);
	const modBadge = (s: string) => badgeYellow(` ${s} `);

	const results: MultiFileDiffResult["files"] = [];
	let totalAdds = 0;
	let totalDels = 0;
	const outParts: string[] = [];

	outParts.push(
		palette.fileHeader(
			`  Diff of ${sorted.length} file${sorted.length === 1 ? "" : "s"}`,
		),
	);

	for (const file of sorted) {
		const status: "added" | "removed" | "modified" = (() => {
			if (file.status) return file.status;
			if (file.oldContent === "" && file.newContent !== "") return "added";
			if (file.oldContent !== "" && file.newContent === "") return "removed";
			return "modified";
		})();

		const statusBadge =
			status === "added"
				? newBadge("NEW")
				: status === "removed"
					? delBadge("DEL")
					: modBadge("MOD");

		const sub = diff(file.oldContent, file.newContent, {
			...options,
			filename: file.newPath,
			header: false,
		});

		results.push({
			oldPath: file.oldPath,
			newPath: file.newPath,
			status,
			result: sub,
		});
		totalAdds += sub.additions;
		totalDels += sub.deletions;

		if (options.showFileHeaders !== false) {
			outParts.push("");
			outParts.push(palette.gutter("─".repeat(60)));
			outParts.push(
				`  ${statusBadge} ${palette.fileHeader(file.newPath || file.oldPath)}`,
			);
			outParts.push(
				palette.stat(
					`  ${sub.additions} insertions(+), ${sub.deletions} deletions(-)`,
				),
			);
			outParts.push(palette.gutter("─".repeat(60)));
		}
		outParts.push(sub.output);
	}

	const output =
		outParts.join("\n") +
		"\n\n" +
		bold(`  ${sorted.length} file${sorted.length === 1 ? "" : "s"} changed`) +
		", " +
		green(`+${totalAdds}`) +
		", " +
		red(`-${totalDels}`);

	return {
		output,
		files: results,
		totals: {
			files: sorted.length,
			additions: totalAdds,
			deletions: totalDels,
		},
	};
}

/**
 * Read two directory trees and produce a multi-file diff.
 */
export async function diffDirectories(
	oldDir: string,
	newDir: string,
	options: Parameters<typeof diffFiles>[1] = {},
): Promise<MultiFileDiffResult> {
	const fs = await import("node:fs/promises");
	const path = await import("node:path");

	async function* walk(root: string, rel = ""): AsyncGenerator<string> {
		const dir = path.join(root, rel);
		const entries = await fs
			.readdir(dir, { withFileTypes: true })
			.catch(() => null);
		if (!entries) return;
		for (const entry of entries) {
			const childRel = rel ? `${rel}/${entry.name}` : entry.name;
			if (entry.isDirectory()) yield* walk(root, childRel);
			else yield childRel;
		}
	}

	const oldFiles = new Set<string>();
	const newFiles = new Set<string>();
	for await (const f of walk(oldDir)) oldFiles.add(f);
	for await (const f of walk(newDir)) newFiles.add(f);

	const all = new Set<string>([...oldFiles, ...newFiles]);
	const pairs: MultiFileDiffInput[] = [];

	for (const rel of all) {
		const oldPath = path.join(oldDir, rel);
		const newPath = path.join(newDir, rel);

		let oldContent = "";
		let newContent = "";
		let oldExists = false;
		let newExists = false;

		try {
			oldContent = await fs.readFile(oldPath, "utf8");
			oldExists = true;
		} catch {
			/* not present */
		}
		try {
			newContent = await fs.readFile(newPath, "utf8");
			newExists = true;
		} catch {
			/* not present */
		}

		if (oldContent === newContent && oldExists && newExists) continue;

		if (!oldExists) {
			pairs.push({
				oldPath: rel,
				newPath: rel,
				oldContent: "",
				newContent,
				status: "added",
			});
		} else if (!newExists) {
			pairs.push({
				oldPath: rel,
				newPath: rel,
				oldContent,
				newContent: "",
				status: "removed",
			});
		} else {
			pairs.push({
				oldPath: rel,
				newPath: rel,
				oldContent,
				newContent,
				status: "modified",
			});
		}
	}

	return diffFiles(pairs, options);
}
