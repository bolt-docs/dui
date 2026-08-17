/**
 * Minimal local type declarations for the `diff` package.
 */

declare module "diff" {
	export interface Change {
		value: string;
		added?: boolean;
		removed?: boolean;
		count?: number;
	}
	export function diffLines(
		oldStr: string,
		newStr: string,
		options?: {
			ignoreWhitespace?: boolean;
			ignoreCase?: boolean;
			newlineIsToken?: boolean;
			context?: number;
		},
	): Change[];
	export function diffWordsWithSpace(
		oldStr: string,
		newStr: string,
		options?: object,
	): Change[];
	export function diffWords(
		oldStr: string,
		newStr: string,
		options?: object,
	): Change[];
	export function diffChars(
		oldStr: string,
		newStr: string,
		options?: object,
	): Change[];
	export interface Hunk {
		oldStart: number;
		oldLines: number;
		newStart: number;
		newLines: number;
		lines: string[];
	}
	export interface StructuredPatch {
		oldFileName: string;
		newFileName: string;
		oldHeader: string;
		newHeader: string;
		hunks: Hunk[];
	}
	export function structuredPatch(
		oldFileName: string,
		newFileName: string,
		oldStr: string,
		newStr: string,
		oldHeader: string,
		newHeader: string,
		options?: { context?: number; ignoreNewlineAtEof?: boolean },
	): StructuredPatch;
	export interface ApplyPatchOptions {
		fuzzFactor?: number;
		autoConvertLineEndings?: boolean;
	}
	export function applyPatch(
		source: string,
		patch: string | StructuredPatch | StructuredPatch[],
		options?: ApplyPatchOptions,
	): string | false;
	export function parsePatch(uniDiff: string): StructuredPatch[];
}
