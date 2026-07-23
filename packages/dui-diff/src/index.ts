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

// ── Renderers ─────────────────────────────────────────────────
export { diff } from "./core";
// ── Plugin entry point ────────────────────────────────────────
export { diffPlugin } from "./plugin";
export {
	diffDirectories,
	diffFiles,
	diffStat,
	diffWordsRender,
} from "./render";
export { diffSideBySide } from "./side-by-side";
export { DIFF_THEME_SLOTS, getPalette } from "./theme";
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
	PagerOptions,
	PatchOptions,
	WordDiffSegment,
} from "./types";
export { splitLines, truncateTo } from "./utils";
// ── Lower-level utilities (re-exported for advanced users) ─────
export { diffWords } from "./word";
