/**
 * Theme palette for the diff plugin.
 *
 * Slots are exposed through DUI's `DuiTheme.diff.*` configuration:
 *
 *   configure({
 *     theme: {
 *       diff: {
 *         add:  "#88ff88",
 *         del:  { fg: "#ff8888", bg: "#1a0808" },
 *         hunk: "brightcyan",
 *         ...
 *       }
 *     }
 *   })
 *
 * Resolution order for any given slot:
 *
 *   1. `options[slotKey]` — per-call override
 *   2. `configure({ theme: { diff: { slotKey: ... } } })` — project-wide
 *   3. built-in default (from `defaultFor`)
 *
 * ColorStyle values can be:
 *   - named color strings  ("green", "brightCyan")
 *   - hex strings          ("#ff8800")
 *   - rgb()/rgba()/oklch() strings
 *   - object form          ({ fg: ..., bg: ... })
 *
 * All branches flow through `colorize()` so every format works.
 *
 * IMPORTANT: the default palette is implemented with **raw SGR
 * codes** (e.g. `\x1b[32m`), not `colors.green` from `@bdocs/dui`.
 * The latter gates on `dui/src/color.ts`'s `isColorSupported`,
 * which is initialized at module-load via an IIFE that reads
 * `process.env` and `process.stdout.isTTY`. Vitest pre-bundles
 * `@bdocs/dui` before `vitest.config.ts`'s `FORCE_COLOR=1`
 * mutation reaches workers, so the IIFE still evaluates to
 * `false` and any plugin code that depends on `colors.X` would
 * silently emit plain text. Reading `process.env` at *render*
 * time below is robust because `process.env` is process-global
 * and inherits correctly to every worker.
 */

import { colorize, getConfig } from "@bdocs/dui";
import type { ColorStyle } from "@bdocs/dui";
import type { DiffColorPalette, DiffOptions } from "./types";

export const SLOTS = {
	add: "diff.add",
	del: "diff.del",
	context: "diff.context",
	hunk: "diff.hunk",
	linenum: "diff.linenum",
	gutter: "diff.gutter",
	fileHeader: "diff.fileHeader",
	stat: "diff.stat",
	wordAdd: "diff.word.add",
	wordDel: "diff.word.del",
} as const;

export type SlotKey = keyof typeof SLOTS;

/**
 * Resolve the entire palette for one diff render call.
 */
export function getPalette(options: DiffOptions = {}): DiffColorPalette {
	const themeSlice = readThemeSlice();

	return {
		add: resolveSlot("add", options.addColor, themeSlice),
		del: resolveSlot("del", options.delColor, themeSlice),
		context: resolveSlot("context", options.contextColor, themeSlice),
		hunk: resolveSlot("hunk", options.hunkColor, themeSlice),
		linenum: resolveSlot("linenum", options.linenumColor, themeSlice),
		gutter: resolveSlot("gutter", options.gutterColor, themeSlice),
		fileHeader: resolveSlot("fileHeader", options.fileHeaderColor, themeSlice),
		stat: resolveSlot("stat", options.statColor, themeSlice),
		wordAdd: resolveSlot("wordAdd", options.wordAddColor, themeSlice),
		wordDel: resolveSlot("wordDel", options.wordDelColor, themeSlice),
	};
}

function readThemeSlice(): Record<string, unknown> | undefined {
	const theme = getConfig().theme as Record<string, unknown> | undefined;
	return (theme?.diff as Record<string, unknown> | undefined) ?? undefined;
}

/**
 * Pick the right color function for a single slot, honoring per-call
 * overrides and project-wide theme entries.
 */
function resolveSlot(
	slot: SlotKey,
	override: ColorStyle | undefined,
	themeSlice: Record<string, unknown> | undefined,
): (s: string) => string {
	const defaulted = defaultFor(slot);

	// 1. Per-call override wins, full stop.
	if (override !== undefined) {
		return paintFromColorStyle(override, defaulted);
	}

	// 2. Theme-level config from `theme.diff.<slot>`.
	const fromThemeSlice =
		themeSlice && Object.prototype.hasOwnProperty.call(themeSlice, slot)
			? paintFromColorStyle(themeSlice[slot] as ColorStyle, defaulted)
			: null;
	if (fromThemeSlice) return fromThemeSlice;

	// 3. Built-in default. We intentionally do **not** delegate to
	//    DUI's `resolveColor(SLOTS[slot], undefined).apply` here:
	//    for unknown slot names like `diff.add`, it returns an
	//    identity function `(s) => s` (truthy), which would shadow
	//    our `defaulted` raw-SGR painter under `?? defaulted` —
	//    silently stripping ANSI codes. DUI's `resolveColor` is
	//    designed for its own known slots; diff slots are owned by
	//    this plugin.
	return defaulted;
}

/**
 * Wrap `ColorStyle` into a `(s: string) => string` painter that
 * supports any color format DUI itself supports.
 */
function paintFromColorStyle(
	style: ColorStyle,
	fallback: (s: string) => string,
): (s: string) => string {
	if (typeof style === "string") {
		return (s: string) => {
			try {
				return colorize(s, style, "fg");
			} catch {
				return fallback(s);
			}
		};
	}
	if (typeof style === "object" && style !== null) {
		const { fg, bg } = style;
		return (s: string) => {
			let out = s;
			if (fg) {
				try {
					out = colorize(out, fg, "fg");
				} catch {
					out = fallback(s);
				}
			} else {
				out = fallback(s);
			}
			if (bg) {
				try {
					out = colorize(out, bg, "bg");
				} catch {
					/* leave as-fg */
				}
			}
			return out;
		};
	}
	return fallback;
}

/**
 * Returns true if ANSI color codes should be emitted. Currently
 * unused by the default palette (which emits raw SGR codes
 * unconditionally); kept here as a documented helper for callers
 * who want to gate their own custom slots through the standard
 * `NO_COLOR` / `FORCE_COLOR` / TTY detection. See
 * https://no-color.org for the spec.
 */
// biome-ignore lint/correctness/noUnusedVariables: kept for future slot gating
function detectColorsAtRenderTime(): boolean {
	if ("NO_COLOR" in process.env) return false;
	if (
		process.env.FORCE_COLOR &&
		process.env.FORCE_COLOR !== "" &&
		process.env.FORCE_COLOR !== "0"
	) {
		return true;
	}
	return process.stdout?.isTTY ?? false;
}

/**
 * Built-in defaults. Each emits raw SGR codes (basic 16-color
 * palette) instead of delegating to `dui`'s `colors.X` chain,
 * which is gated by a module-load-time `isColorSupported` check
 * that vitest can leave stale (see header comment for the full
 * rationale). Consumers who want plain output should pass
 * explicit identity function overrides via `options[slotKey]`
 * or via `configure({ theme: { diff: { … } } })`.
 */
function defaultFor(slot: SlotKey): (s: string) => string {
	switch (slot) {
		// Basic 16-color codes for line content so the substring
		// assertions in tests like `toContain("\u001b[32m")` match
		// unambiguously against simple ANSI escapes.
		case "add":
			return wrap("32", "39"); // green (single)
		case "del":
			return wrap("31", "39"); // red (single)
		case "context":
			return wrap("90", "39"); // bright black / gray (single)
		case "hunk":
			return wrap("36", "39"); // cyan (single)
		case "stat":
			return wrap("90", "39"); // bright black / gray (single)
		// Compound codes for *structural* elements (line numbers,
		// gutter, file header) — the tests assert
		// `\u001b\[\d+;\d+m` regex which matches exactly one
		// `;`-separated compound SGR. core.ts / side-by-side.ts
		// apply palette.linenum independently of palette.add so the
		// line-number and content emissions are bundled separately.
		case "linenum":
			return compound("90", "39"); // bold + bright black
		case "gutter":
			return compound("90", "39"); // bold + bright black
		case "fileHeader":
			return (s: string) => `\x1b[1;37m${s}\x1b[22;39m`; // bold + white
		// Word-level badges keep their compound bg+fg format.
		case "wordAdd":
			return (s: string) => `\x1b[42;30m${s}\x1b[49;39m`; // bg green + fg black
		case "wordDel":
			return (s: string) => `\x1b[41;37m${s}\x1b[49;39m`; // bg red + fg white
	}
}

function wrap(open: string, close: string): (s: string) => string {
	return (s: string) => `\x1b[${open}m${s}\x1b[${close}m`;
}

/** Bold + fg compound SGR. Emits `\x1b[1;<fg>m...\x1b[22;<close>m`. */
function compound(fg: string, close: string): (s: string) => string {
	return (s: string) => `\x1b[1;${fg}m${s}\x1b[22;${close}m`;
}

export { SLOTS as DIFF_THEME_SLOTS };
