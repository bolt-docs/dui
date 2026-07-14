/**
 * Public types for @dui-toolkit/plugin-diff.
 */

import type { ColorStyle } from "@bdocs/dui";

export type GutterStyle = "bracket" | "bar" | "compact" | "arrow";

/**
 * Options accepted by every diff renderer in this package.
 *
 * `ColorStyle` accepts any color the DUI core understands:
 * a named color (`"green"`), a hex string (`"#ff8800"`),
 * an rgb()/rgba() string, or `{ fg, bg }`.
 */
export interface DiffOptions {
	/** Number of context lines around each hunk (default: 3). */
	context?: number;
	/** Maximum width in columns (default: terminal width). */
	width?: number;
	/** Whether to show line numbers (default: true). */
	lineNumbers?: boolean;
	/** Whether to show the file header (default: true). */
	header?: boolean;
	/** Custom filename for the diff header. */
	filename?: string;
	/** Highlight changed words within modified lines (default: true). */
	wordHighlight?: boolean;
	/** Visual style for the gutter column. */
	gutterStyle?: GutterStyle;
	/** Override addition color (default: green). */
	addColor?: ColorStyle;
	/** Override deletion color (default: red). */
	delColor?: ColorStyle;
	/** Override context color (default: dim). */
	contextColor?: ColorStyle;
	/** Override hunk header color (default: cyan). */
	hunkColor?: ColorStyle;
	/** Override line number color (default: dim). */
	linenumColor?: ColorStyle;
	/** Override gutter color (default: dim). */
	gutterColor?: ColorStyle;
	/** Override file header color (default: bold white). */
	fileHeaderColor?: ColorStyle;
	/** Override stat line color (default: dim). */
	statColor?: ColorStyle;
	/** Override word-level add highlight color (default: bgGreen). */
	wordAddColor?: ColorStyle;
	/** Override word-level del highlight color (default: bgRed). */
	wordDelColor?: ColorStyle;
}

export interface DiffResult {
	/** ANSI-formatted diff string, ready to print or log. */
	output: string;
	/** Total number of added lines across all hunks. */
	additions: number;
	/** Total number of deleted lines across all hunks. */
	deletions: number;
	/** Number of hunks in the diff. */
	hunks: number;
	/** Total visible lines of the rendered output. */
	lines: number;
}

export interface WordDiffSegment {
	/** Literal text of the segment. */
	value: string;
	/** Set when this segment is present in `newStr` but not `oldStr`. */
	added?: boolean;
	/** Set when this segment is present in `oldStr` but not `newStr`. */
	removed?: boolean;
}

export interface MultiFileDiffInput {
	oldPath: string;
	newPath: string;
	oldContent: string;
	newContent: string;
	status?: "added" | "removed" | "modified";
	options?: DiffOptions;
}

export interface MultiFileDiffEntry {
	oldPath: string;
	newPath: string;
	status: "added" | "removed" | "modified";
	result: DiffResult;
}

export interface MultiFileDiffResult {
	output: string;
	files: MultiFileDiffEntry[];
	totals: { files: number; additions: number; deletions: number };
}

export interface MultiDiffOptions extends DiffOptions {
	showFileHeaders?: boolean;
	sortFiles?: boolean;
}

export interface PagerOptions {
	/** Page size in lines (default: terminal rows - 4). */
	pageSize?: number;
	/** Disable interactivity (e.g. in CI) (default: false). */
	disable?: boolean;
}

export interface JsonDiffOptions extends DiffOptions {
	/** Indent step for JSON rendering (default: 2). */
	indent?: number;
	/** Show value previews for changed primitives (default: true). */
	showValues?: boolean;
}

export interface PatchOptions {
	oldPath?: string;
	newPath?: string;
	/** Include `diff --git` headers (default: true when one path given). */
	includeHeaders?: boolean;
}

/**
 * Resolved color palette used by the renderer.
 * Each slot is a function that wraps a string with the appropriate ANSI codes.
 */
export type DiffColorPalette = {
	add: (s: string) => string;
	del: (s: string) => string;
	context: (s: string) => string;
	hunk: (s: string) => string;
	linenum: (s: string) => string;
	gutter: (s: string) => string;
	fileHeader: (s: string) => string;
	stat: (s: string) => string;
	wordAdd: (s: string) => string;
	wordDel: (s: string) => string;
};
