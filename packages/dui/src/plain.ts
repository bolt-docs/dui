/**
 * Plain-mode text formatter for the @bdocs/dui widget set.
 *
 * When `isPlainMode()` returns true, every widget that paints
 * borders / colour escapes falls back to a multi-line text output
 * with `<prefix>: <content>` style annotations. The output has no
 * ANSI, no box-drawing glyphs, no audible bell trigger, and reads
 * top-down with one indent level per nested element. The format
 * composes with screen readers, log scrapers, and dumb terminals.
 *
 * Consumers that want stricter formatting (fixed-width tables,
 * deterministic padding) should bypass these helpers and emit their
 * own plain text — the helpers are intentionally minimal and
 * ship with deliberate assumptions about indent width (2 spaces),
 * prefix casing (lowercase widget id), and action-list grammar.
 */

import type { ColorStyle } from "./theme";

export interface BoxLikeOpts {
	title?: string;
	colors?: Record<string, ColorStyle | undefined>;
}

export interface ActionInput {
	id: string;
	label: string;
}

/**
 * Format a `box(...)` render as plain text:
 *
 *     box: <title>
 *       <line1>
 *       <line2>
 *     actions:
 *       [<id>] <label>
 *       [<id2>] <label2>
 *
 * Empty titles emit a `box:` header without trailing content. The
 * action block is suppressed when there are no actions.
 */
export function formatBoxPlain(
	lines: readonly string[],
	opts: BoxLikeOpts & { actions?: readonly ActionInput[] } = {},
): string {
	const out: string[] = [];
	const title = opts.title?.trim() ?? "";
	if (title) out.push(`box: ${title}`);
	if (actionsLength(opts.actions) > 0 && out.length > 0) out.push("");
	for (const line of lines) out.push(`  ${line}`);
	if (actionsLength(opts.actions) > 0) {
		out.push("");
		out.push("actions:");
		for (const a of opts.actions!) out.push(`  [${a.id}] ${a.label}`);
	}
	return out.join("\n");
}

/** `badge: [ <label> ]` — strip colour, keep ASCII brackets. */
export function formatBadgePlain(
	label: string,
	status?: string,
): string {
	const trimmed = label.trim();
	if (status) return `${status}: [ ${trimmed} ]`;
	return `badge: [ ${trimmed} ]`;
}

/**
 * `section: -- <title> --`
 * Width is informational only in plain mode — we ship a consistent
 * 5-dash lead/trail so the section header is recognizable in scrollback.
 */
export function formatSectionPlain(title: string): string {
	const trimmed = title.trim();
	if (!trimmed) return `section: ${"-".repeat(20)}`;
	return `section: -- ${trimmed} --`;
}

/** `divider: --------` — plain ASCII dashes, no theme colour. */
export function formatDividerPlain(length = 20): string {
	const len = Math.max(1, Math.floor(length));
	return `divider: ${"-".repeat(len)}`;
}

/** `modal: <title>` for the modal widget. */
export function formatModalPlain(
	title: string | undefined,
	buttons: readonly { label: string; primary?: boolean }[] = [],
): string {
	const out: string[] = [];
	const trimmed = title?.trim() ?? "";
	if (trimmed) out.push(`modal: ${trimmed}`);
	if (buttons.length > 0) {
		if (out.length > 0) out.push("");
		out.push("buttons:");
		for (const b of buttons) {
			const tag = b.primary ? "[*]" : "[ ]";
			out.push(`  ${tag} ${b.label}`);
		}
	}
	return out.join("\n");
}

/** `tabs: [<*>|], [< >] ...` — one entry per tab. */
export function formatTabsPlain(
	items: readonly { label: string; active?: boolean }[],
): string {
	const out: string[] = ["tabs:"];
	for (const item of items) {
		const marker = item.active ? "[*]" : "[ ]";
		out.push(`  ${marker} ${item.label}`);
	}
	return out.join("\n");
}

/** `kbd: <keys joined by platform separator>` — no glyph substitution. */
export function formatKbdPlain(keys: readonly string[]): string {
	return `kbd: ${keys.join(" ")}`;
}

/**
 * Format a single action token with a `[[K]eybind label]` highlight
 * so the user knows which key to press. Exported @bdocs/dui-side so
 * `@dui-toolkit/plugin-notify`'s terminal toast can keep parity with
 * the new `box({ actions })` render path. Single source of truth —
 * otherwise the two render paths silently drift on a future format
 * tweak.
 */
export function formatActionToken(action: {
	id: string;
	label: string;
}): string {
	const ch = action.label.charAt(0);
	if (!ch) return `[ ${action.label} ]`;
	const rest = action.label.slice(1);
	return `[ [${ch}]${rest} ]`;
}

/** Same as `formatActionToken` joined with the canonical 2-space gap. */
export function formatActionTokens(
	actions: readonly { id: string; label: string }[] | undefined,
): string {
	if (!actions || actions.length === 0) return "";
	return actions.map(formatActionToken).join("  ");
}

function actionsLength(
	actions: readonly ActionInput[] | undefined,
): number {
	return actions?.length ?? 0;
}
