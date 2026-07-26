/**
 * Accessibility re-export + plain-mode text emitter for
 * `@dui-toolkit/plugin-notify`.
 *
 * The accessibility heuristics live in `@bdocs/dui/accessibility`
 * (single source of truth). This module re-exports the public
 * getters and adds a single `plainEmit(opts)` helper that produces
 * the multi-line prefix-annotated text notification rendering —
 * consumed by every backend path when `isPlainMode(opts)` resolves
 * true.
 *
 * Output format:
 *
 *     notify.error: <title>
 *       body: <body line 1>
 *       body: <body line 2>
 *     actions:
 *       [open-logs] Open logs
 *       [rerun] Re-run CI
 *
 * The `body:` prefix fires once per body line so multi-line bodies
 * retain their newlines in plain output. The action block is only
 * emitted when `opts.actions` is present and non-empty.
 */

export {
	getAccessibilityInfo,
	isPlainMode,
	isReducedMotion,
	refreshAccessibility,
	type AccessibilityInfo,
} from "@bdocs/dui";

import type { NotifyOptions } from "./types.js";

const LEVEL_PREFIX: Record<string, string> = {
	success: "notify.success",
	info: "notify.info",
	warning: "notify.warning",
	error: "notify.error",
	neutral: "notify.neutral",
};

/** Compose the multi-line plain output for a notify call. */
export function plainEmit(opts: NotifyOptions): string {
	const level = opts.level ?? "info";
	const prefix = LEVEL_PREFIX[level] ?? `notify.${level}`;
	const out: string[] = [];

	const title = opts.title?.trim() ?? "";
	// Always emit the level-prefix line — the caller expects to see
	// `notify.error:` / `notify.info:` / etc even when there's no
	// title, so log scrapers and screen readers can identify the
	// notification severity without parsing ANSI or box glyphs.
	if (title) {
		out.push(`${prefix}: ${title}`);
	} else {
		out.push(`${prefix}:`);
	}

	const body = opts.body ?? "";
	if (body.length > 0) {
		for (const line of body.split("\n")) out.push(`  body: ${line}`);
	}

	if (opts.actions && opts.actions.length > 0) {
		out.push("");
		out.push("actions:");
		for (const a of opts.actions) out.push(`  [${a.id}] ${a.label}`);
	}

	return out.join("\n");
}
