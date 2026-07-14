/**
 * Word-level diff using a Myers-style longest-common-subsequence over
 * whitespace- and punctuation-delimited tokens.
 *
 * This intentionally avoids `String.prototype.split`'s trailing-empty
 * quirks by working with a token stream and pairing equal/added/removed
 * segments.
 */

import { diffWordsWithSpace } from "diff";
import type { WordDiffSegment } from "./types";

/**
 * Render a pair of lines with intra-line highlighting, returning the
 * ANSI-formatted strings. Pure — no IO.
 *
 * Note: the default painters below emit raw SGR codes rather than
 * delegating to `colors.bgGreen.black` from `@bdocs/dui`. The
 * latter is gated by `isColorSupported` (computed at module-load
 * via an IIFE in `dui/src/color.ts`), which vitest's worker pool
 * can leave stale (it sees `false` because pre-bundling evaluates
 * the IIFE before `vitest.config.ts`'s `FORCE_COLOR=1` mutation
 * reaches workers). Reading-process-env-at-render-time would not
 * help either, because `NO_COLOR` inherited from the parent shell
 * would still win per https://no-color.org — making the palette
 * permanently disabled in CI-like environments. Emitting raw SGR
 * unconditionally is the simplest correct fix; consumers who want
 * plain output can pass explicit identity painters via `options`.
 */
export function diffWordsRender(
	oldLine: string,
	newLine: string,
	options: {
		addFn?: (s: string) => string;
		delFn?: (s: string) => string;
	} = {},
): { old: string; new: string } {
	const adds = options.addFn ?? defaultAdd;
	const dels = options.delFn ?? defaultDel;
	const segs = diffWords(oldLine, newLine);
	let old = "";
	let next = "";
	for (const s of segs) {
		if (s.added) next += adds(s.value);
		else if (s.removed) old += dels(s.value);
		else {
			old += s.value;
			next += s.value;
		}
	}
	return { old, new: next };
}

/**
 * Myers-style word diff. Returns a flat sequence of segments where
 * each segment carries `added` or `removed` flags (or none for equal).
 */
export function diffWords(oldStr: string, newStr: string): WordDiffSegment[] {
	if (oldStr === newStr) {
		return oldStr === "" ? [] : [{ value: oldStr }];
	}
	// jsdiff's diffWordsWithSpace preserves whitespace boundaries and is
	// ideal for an in-place word-level diff of two lines.
	const segments = diffWordsWithSpace(oldStr, newStr);
	return segments.map((s) => {
		const seg: WordDiffSegment = { value: s.value };
		if (s.added) seg.added = true;
		else if (s.removed) seg.removed = true;
		return seg;
	});
}

// Raw SGR painters (deliberately not gated by `isColorSupported`;
// see `diffWordsRender`'s docstring for the rationale).
const defaultAdd = (s: string): string => `\x1b[42;30m${s}\x1b[49;39m`; // bg green + fg black
const defaultDel = (s: string): string => `\x1b[41;37m${s}\x1b[49;39m`; // bg red + fg white
