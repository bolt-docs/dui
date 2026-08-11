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
	const actionsBlock = formatActionsPlain(opts.actions);
	if (actionsBlock) {
		out.push("");
		out.push(actionsBlock);
	}
	return out.join("\n");
}

/**
 * The `actions:` block used by every plain-mode renderer that
 * surfaces keyboard shortcuts. Single source of truth — `box()`,
 * `notify()`'s `plainEmit`, and any future widget all emit the same
 * grammar so log scrapers / screen readers see a consistent shape:
 *
 *     actions:
 *       [<id>] <label>
 *       [<id2>] <label2>
 *
 * Returns `""` when `actions` is empty/undefined so callers can
 * conditionally append without a length check.
 */
export function formatActionsPlain(
	actions: readonly ActionInput[] | undefined,
): string {
	if (!actions || actions.length === 0) return "";
	const out: string[] = ["actions:"];
	for (const a of actions) out.push(`  [${a.id}] ${a.label}`);
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

/**
 * `modal: <title>` for the modal widget. Body content lines are
 * indented under the header (matching `formatBoxPlain`), then a
 * `buttons:` block lists each footer action with `[*]` (primary) /
 * `[ ]` (secondary) markers.
 */
export function formatModalPlain(
	title: string | undefined,
	content: readonly string[] = [],
	buttons: readonly { label: string; primary?: boolean }[] = [],
): string {
	const out: string[] = [];
	const trimmed = title?.trim() ?? "";
	if (trimmed) out.push(`modal: ${trimmed}`);
	for (const line of content) out.push(`  ${line}`);
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
 * `bullet: - <item>` — ASCII dash markers instead of `•` glyphs.
 * Multi-line items keep their internal newlines; each top-level item
 * gets exactly one dash-prefixed line.
 */
export function formatBulletPlain(items: readonly string[]): string {
	const out: string[] = ["bullet:"];
	for (const item of items) out.push(`  - ${item}`);
	return out.join("\n");
}

/** `ordered: 1. <item>` — numbering preserved, no color. */
export function formatOrderedPlain(items: readonly string[]): string {
	const out: string[] = ["ordered:"];
	for (let i = 0; i < items.length; i++) out.push(`  ${i + 1}. ${items[i]}`);
	return out.join("\n");
}

/**
 * `tasks: [x] / [ ] <label>` — ASCII check markers replace `✔`/`✘`
 * so screen readers announce the state as text.
 */
export function formatTasksPlain(
	items: readonly { label: string; done: boolean }[],
): string {
	const out: string[] = ["tasks:"];
	for (const item of items) {
		out.push(`  ${item.done ? "[x]" : "[ ]"} ${item.label}`);
	}
	return out.join("\n");
}

/**
 * `steps: [x] / [>] / [ ] / [!] <label>` — status markers replace the
 * `✔`/`●`/`○`/`✖` glyphs and the `│`/`└─` connectors (no box-drawing
 * in plain mode). Details indent under their step's label.
 */
export function formatStepsPlain(
	items: readonly {
		label: string;
		status: string;
		details?: string;
	}[],
): string {
	const out: string[] = ["steps:"];
	for (const item of items) {
		const marker =
			item.status === "success"
				? "[x]"
				: item.status === "error"
					? "[!]"
					: item.status === "running"
						? "[>]"
						: "[ ]";
		out.push(`  ${marker} ${item.label}`);
		if (item.details) out.push(`      ${item.details}`);
	}
	return out.join("\n");
}

/**
 * `table: <header cells>` + indented rows — cells joined with two
 * spaces, borders dropped. Deliberately minimal (no column alignment):
 * consumers needing fixed-width plain tables emit their own format.
 */
export function formatTablePlain(
	headers: readonly string[],
	rows: readonly (readonly string[])[],
): string {
	const out: string[] = [];
	const header = headers.join("  ");
	if (header.trim()) out.push(`table: ${header}`);
	for (const row of rows) out.push(`  ${row.join("  ")}`);
	return out.join("\n");
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
