/**
 * @dui-toolkit/plugin-diff
 *
 * Diff viewer for the terminal — renders:
 *   -  Unified diff (git-style with correct hunk headers)
 *   -  Side-by-side diff (column-aligned rows)
 *   -  Word-level diff (intra-line highlighting)
 *   -  Multi-file / multi-directory diffs
 *
 * Designed to slot into DUI's `colors`, `usePlugin`, and `DuiTheme`
 * systems so its visuals can be themed project-wide.
 */

// ── Public types ──────────────────────────────────────────────
export type {
	DiffColorPalette,
	DiffOptions,
	DiffResult,
	GutterStyle,
	JsonDiffOptions,
	MultiDiffOptions,
	MultiFileDiffEntry,
	MultiFileDiffInput,
	MultiFileDiffResult,
	PatchOptions,
	PagerOptions,
	WordDiffSegment,
} from "./types";

export { DIFF_THEME_SLOTS } from "./theme";

// ── Renderers ─────────────────────────────────────────────────
export { diff } from "./core";
export { diffSideBySide } from "./side-by-side";
export { diffWordsRender, diffStat, diffFiles, diffDirectories } from "./render";

// ── Plugin entry point ────────────────────────────────────────
export { diffPlugin } from "./plugin";

// ── Lower-level utilities (re-exported for advanced users) ─────
export { diffWords } from "./word";
export { getPalette } from "./theme";
export { splitLines, truncateTo } from "./utils";
