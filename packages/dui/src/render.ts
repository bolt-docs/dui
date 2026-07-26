/**
 * Shared rendering helpers for the progress-bar widget family.
 *
 * These pure functions are used by `createProgressBar`,
 * `createAnimatedProgressBar`, and `createMultiProgressBar` (all in
 * `progress.ts`) so the computation and string-formatting logic lives
 * in one place rather than being duplicated across three closures.
 *
 * They are also exported so plugin authors and custom bar implementors
 * can compose them without importing the heavyweight `progress.ts`
 * factory functions.
 *
 * @example
 * ```ts
 * import { calcPercentage, buildBarString, formatProgressLine } from "@bdocs/dui"
 *
 * const pct = calcPercentage(100, 50)    // → 50
 * const bar = buildBarString(50, 20, "█", "░")  // → "██████████░░░░░░░░░░"
 * const line = formatProgressLine(50, bar, "fetching", "dl", "MB")
 * // → "dl ██████████░░░░░░░░░░  50% | fetching MB"
 * ```
 */

/** Compute percentage (0–100) from raw step count and total. */
export function calcPercentage(total: number, current: number): number {
	if (total <= 0) return 0;
	return Math.min(100, Math.max(0, (current / total) * 100));
}

/** Build the visual bar string from filled + empty characters. */
export function buildBarString(
	pct: number,
	width: number,
	barChar: string,
	emptyChar: string,
): string {
	const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
	const empty = Math.max(0, width - filled);
	return barChar.repeat(filled) + emptyChar.repeat(empty);
}

/**
 * Format a progress line: `[prefix] [bar] [NN%] [| message] [suffix]`.
 * All text segments are optional — empty strings are filtered out.
 */
export function formatProgressLine(
	pct: number,
	barStr: string,
	msg: string,
	prefix: string,
	suffix: string,
): string {
	const pctStr = `${Math.round(pct)}%`.padStart(4);
	const parts = [prefix, barStr, pctStr];
	if (msg) parts.push("|", msg);
	if (suffix) parts.push(suffix);
	return parts.filter(Boolean).join(" ");
}
