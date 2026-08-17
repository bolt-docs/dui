/**
 * Fuzzy matching and highlighting helpers.
 *
 * Shared engine behind the `searchable` mode of `select`, `multiselect`
 * and `tree`, and the `palette()` command palette. The matcher is a
 * subsequence scorer: it finds the best way to line the query's
 * characters up inside the candidate text (case-insensitively) and
 * returns a score plus the matched character indices, so callers can
 * highlight the matches.
 *
 * @example
 * ```ts
 * import { fuzzyMatch, highlightFuzzy } from "@bdocs/dui"
 *
 * fuzzyMatch("fb", "file-browser") // → { score: 3, indices: [0, 5] }
 * fuzzyMatch("xyz", "hello")       // → null
 *
 * highlightFuzzy("fb", "file-browser", (s) => `\u001b[1m${s}\u001b[0m`)
 * // → "\u001b[1mf\u001b[0mile-\u001b[1mb\u001b[0mrowser"
 * ```
 */

export interface FuzzyResult {
	/** Higher is better. */
	score: number;
	/** Indices (into the candidate) of the matched characters. */
	indices: number[];
}

/**
 * Case-insensitive subsequence match of `query` inside `text`.
 *
 * Returns `null` when the query can't be lined up in order. Scoring
 * rewards:
 * - exact-case matches (slightly),
 * - characters that continue a run of consecutive matches,
 * - characters at word boundaries (start of string, or right after
 *   `-`, `_`, `.`, `/`, `:`, or whitespace),
 * and penalizes the gap between consecutive matches so compact hits
 * beat spread-out ones.
 *
 * @example
 * ```ts
 * fuzzyMatch("fb", "file-browser") // → { score: 3, indices: [0, 5] }
 * fuzzyMatch("br", "file-browser") // → { score: 13, indices: [5, 6] }
 * fuzzyMatch("xyz", "hello")       // → null
 * ```
 */
export function fuzzyMatch(query: string, text: string): FuzzyResult | null {
	if (!query) return { score: 0, indices: [] };

	const q = query.toLowerCase();
	const t = text.toLowerCase();
	const qChars = Array.from(q);
	const tChars = Array.from(t);
	const n = tChars.length;

	// states[j] = best score matching q[0..qi] with the last matched
	// char sitting EXACTLY at candidate index j (requires t[j]==q[qi]).
	// prev[j] = the candidate index of the previous query char in that
	// best alignment, or null when qi === 0.
	let states = new Array<number>(n).fill(-Infinity);
	let prev = new Array<number | null>(n).fill(null);

	const first = qChars[0];
	for (let j = 0; j < n; j++) {
		if (tChars[j] === first) {
			states[j] = boundaryScore(text, j) + (text[j] === first ? 2 : 0);
		}
	}

	for (let qi = 1; qi < qChars.length; qi++) {
		// Prefix-max over the previous row with argmax, so we can find
		// the best alignment that ends at any k < j.
		const bestUpTo = new Array<number>(n).fill(-Infinity);
		const bestUpToArg = new Array<number | null>(n).fill(null);
		{
			let best = -Infinity;
			let bestArg: number | null = null;
			for (let j = 0; j < n; j++) {
				if (states[j] > best) {
					best = states[j];
					bestArg = j;
				}
				bestUpTo[j] = best;
				bestUpToArg[j] = bestArg;
			}
		}

		const nextStates = new Array<number>(n).fill(-Infinity);
		const nextPrev = new Array<number | null>(n).fill(null);
		for (let j = 0; j < n; j++) {
			if (tChars[j] !== qChars[qi]) continue;
			const k = bestUpToArg[j - 1];
			if (k === null || k === undefined) continue;
			const base = states[k];
			let score = base;
			if (j === k + 1) score += 6; // consecutive run
			score += boundaryScore(text, j);
			score -= (j - k - 1) * 2; // gap penalty
			if (text[j] === qChars[qi]) score += 2; // exact case
			nextStates[j] = score;
			nextPrev[j] = k;
		}
		states = nextStates;
		prev = nextPrev;
	}

	let best = -Infinity;
	let bestEnd = -1;
	for (let j = 0; j < n; j++) {
		if (states[j] > best) {
			best = states[j];
			bestEnd = j;
		}
	}
	if (bestEnd < 0) return null;

	// Backtrack to recover the matched indices.
	const indices: number[] = [];
	let at: number | null = bestEnd;
	while (at !== null) {
		indices.unshift(at);
		at = prev[at];
	}

	return { score: best, indices };
}

/** Bonus for a match that starts a word (or the string itself). */
function boundaryScore(text: string, j: number): number {
	if (j === 0) return 4;
	const prev = text[j - 1];
	if (
		prev === " " ||
		prev === "-" ||
		prev === "_" ||
		prev === "." ||
		prev === "/" ||
		prev === ":"
	) {
		return 3;
	}
	return 0;
}

/**
 * Highlight the fuzzy matches in `text` by wrapping each matched
 * character with `matchFn`. Characters that are NOT matches pass
 * through untouched (they are not wrapped, which keeps ANSI output
 * clean for width math and plain-mode consumers).
 *
 * @example
 * ```ts
 * highlightFuzzy("fb", "file-browser", (s) => `\u001b[1m${s}\u001b[0m`)
 * // → "\u001b[1mf\u001b[0mile-\u001b[1mb\u001b[0mrowser"
 * ```
 */
export function highlightFuzzy(
	query: string,
	text: string,
	matchFn: (char: string) => string,
): string {
	const result = fuzzyMatch(query, text);
	if (!result || result.indices.length === 0) return text;

	const chars = Array.from(text);
	const set = new Set(result.indices);
	let out = "";
	for (let i = 0; i < chars.length; i++) {
		out += set.has(i) ? matchFn(chars[i]) : chars[i];
	}
	return out;
}

/**
 * Filter a list of candidates by a fuzzy query. Returns the matched
 * candidates (best score first) with their result objects, or `null`
 * when the query is empty (meaning "show all").
 *
 * @example
 * ```ts
 * const hits = filterFuzzy("br", ["file-browser", "readme"], (c) => c)
 * // hits![0].item === "file-browser"
 * ```
 */
export function filterFuzzy<T>(
	query: string,
	items: readonly T[],
	labelOf: (item: T) => string,
): { item: T; result: FuzzyResult }[] | null {
	if (!query) return null;
	const out: { item: T; result: FuzzyResult }[] = [];
	for (const item of items) {
		const result = fuzzyMatch(query, labelOf(item));
		if (result) out.push({ item, result });
	}
	out.sort((a, b) => b.result.score - a.result.score);
	return out;
}
