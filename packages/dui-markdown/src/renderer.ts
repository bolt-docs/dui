import {
	table as duiTable,
	getConfig,
	resolveColor,
	stripAnsi,
	terminalWidth,
	visibleLength,
} from "@bdocs/dui";
import { mdSyntax } from "./syntax";
import { type BlockToken, type InlineToken, tokenize, tokenizeInline } from "./tokenizer";

// Resolve a markdown theme slot against the live config so theme
// tweaks via `configure({ theme: { markdown: … } })` are picked up
// on the next render call without re-registering the plugin.
function tColor(slot: string): {
	apply: (s: string) => string;
	bg?: (s: string) => string;
} {
	return resolveColor(slot, getConfig().theme);
}

/** Options accepted by the renderer entry points. */
export interface MdRenderOptions {
	/**
	 * Cap the render width in columns. Tables and code blocks wrap /
	 * truncate to this (or the terminal width, whichever is smaller).
	 * Default: `terminalWidth()`.
	 */
	width?: number;
	/**
	 * Global index of the focused checkbox item — the interactive
	 * checklist renderer paints a `❯` pointer on that row. Internal
	 * plumbing for `mdInteractive`; not needed for plain `md()`.
	 */
	focusItem?: number;
}

/** Per-block rendering context threaded through the block renderers. */
interface MdRenderContext extends MdRenderOptions {
	/** Global checklist-item offset of the block being rendered. */
	itemOffset?: number;
}

/**
 * Render inline tokens to ANSI string, supporting nested children.
 *
 * For tokens with a `children` array, the children are rendered recursively
 * and wrapped in the parent's ANSI codes. This correctly handles:
 *   `**bold _and italic_**` → \x1b[1mbold \x1b[3mand italic\x1b[23m\x1b[22m
 */
function renderInline(tokens: InlineToken[]): string {
	return tokens
		.map((t) => {
			// Use children when available, otherwise t.content
			const inner =
				t.children && t.children.length > 0
					? renderInline(t.children)
					: t.content;

			switch (t.type) {
				case "text":
					return t.content;
				case "bold":
					return `\x1b[1m${inner}\x1b[22m`;
				case "italic":
					return `\x1b[3m${inner}\x1b[23m`;
				case "strikethrough":
					return `\x1b[9m${inner}\x1b[29m`;
				case "code": {
					const color = tColor("markdown.codeInline");
					const fg = color.apply(t.content);
					return color.bg ? color.bg(fg) : fg;
				}
				case "link": {
					const linkText = tColor("markdown.linkText").apply;
					const linkUrl = tColor("markdown.linkUrl").apply;
					const url = t.url ?? "";
					// OSC 8 hyperlink: \x1b]8;;<url>\x1b\\<text>\x1b]8;;\x1b\\
					const hyperlink = `\x1b]8;;${url}\x1b\\\x1b[4m${linkText(t.content)}\x1b[24m\x1b]8;;\x1b\\`;
					return `${hyperlink}${linkUrl(` (${url})`)}`;
				}
				case "autolink": {
					const linkUrl = tColor("markdown.linkUrl").apply;
					const url = t.url ?? "";
					// Auto‑links render as underlined URL with OSC 8 hyperlink support.
					// No separate text label — the URL itself is the visible text.
					return `\x1b]8;;${url}\x1b\\\x1b[4m${linkUrl(url)}\x1b[24m\x1b]8;;\x1b\\`;
				}
				case "image": {
					const imageText = tColor("markdown.imageText").apply;
					return imageText(`[image: ${t.alt || t.content}]`);
				}
				default:
					return inner;
			}
		})
		.join("");
}

async function renderHeading(
	token: BlockToken & { type: "heading" },
): Promise<string> {
	const level = token.level;
	const label = renderInline(token.inline);
	// h6 keeps the same color as h5 — clamp the slot lookup so callers
	// never accidentally hit an unknown slot (which would return identity).
	const slot = `markdown.heading${Math.min(level, 6)}`;
	const heading = tColor(slot).apply;

	// Markdown heading rendering no longer includes the literal `#` marker
	// — the renderer is responsible for conveying hierarchy through style
	// so the output reads as rendered prose, not raw markdown. The visual
	// rule is:
	//   • Every level gets a left accent bar (`▌ `) painted in the
	//     heading's own color, dwarfing any lingering visual need for
	//     `#` / `##` characters.
	//   • H1 + H2 carry bold to mark the top tiers.
	//   • H3-H6 progressively indent (2 spaces per level past H3) so the
	//     document's depth reads visually without taking horizontal
	//     real-estate away from the title text itself.
	//   • H1 gets a horizontal underline beneath the title so the most
	//     important heading is unmistakable at a glance.
	const indent = "  ".repeat(Math.max(0, level - 3));
	const bar = "▌ ";
	const body =
		level <= 2
			? heading(`\x1b[1m${bar}${label}\x1b[22m`)
			: heading(`${bar}${label}`);

	if (level === 1) {
		const width = Math.min(terminalWidth(), 60);
		const underline = heading(`\x1b[1m${"═".repeat(width)}\x1b[22m`);
		return `${indent}${body}\n${indent}${underline}`;
	}
	return `${indent}${body}`;
}

async function renderCode(
	token: BlockToken & { type: "code" },
	ctx: MdRenderContext,
): Promise<string> {
	const width = Math.min(ctx.width ?? terminalWidth(), 80);
	const lang = token.lang || "text";
	const highlighted =
		lang !== "text" ? await mdSyntax(token.code, lang) : token.code;
	// Code-fence label honors the `markdown.codeLang` slot independently
	// from the `codeBorder` so callers can pick a contrasting color
	// (e.g. a brighter language name without affecting the box outline).
	const langTag =
		lang !== "text" ? ` ${tColor("markdown.codeLang").apply(lang)}` : "";
	const borderFn = tColor("markdown.codeBorder").apply;

	const lines = highlighted.split("\n");
	const wrapped = lines.map((l) => {
		const clean = stripAnsi(l);
		if (visibleLength(clean) > width - 2) {
			return l.slice(0, width - 5) + "\x1b[0m…";
		}
		return l;
	});

	const top = `${borderFn("┌" + "─".repeat(width - 2) + "┐")}${langTag}`;
	const bottom = `${borderFn("└" + "─".repeat(width - 2) + "┘")}`;
	const body = wrapped
		.map((l) => {
			const pad = width - 2 - stripAnsi(l).length;
			return `${borderFn("│")}${l}${" ".repeat(Math.max(0, pad))}${borderFn("│")}`;
		})
		.join("\n");

	return `${top}\n${body}\n${bottom}`;
}

async function renderList(
	token: BlockToken & { type: "list" },
	ctx: MdRenderContext,
): Promise<string> {
	const lines: string[] = [];
	// Split markers into bullet vs. ordinal so callers can retheme
	// `markdown.listBullet` (unordered `•`) and `markdown.listNumber`
	// (`1.`, `2.`, …) independently.
	const bulletFn = tColor("markdown.listBullet").apply;
	const numberFn = tColor("markdown.listNumber").apply;
	// Interactive checklist support: `focusItem` is the global index of
	// the row the interactive picker is pointing at; `itemOffset` is the
	// index of the first checkbox item of THIS list. When the focused
	// row belongs to this list, render it with the `❯` pointer and
	// inverse video so the user sees exactly what space/enter will
	// toggle.
	let itemIdx = ctx.itemOffset ?? 0;

	for (let i = 0; i < token.items.length; i++) {
		const item = token.items[i];
		const label = renderInline(item.inline);
		if (token.ordered) {
			lines.push(`  ${numberFn(`${i + 1}.`)} ${label}`);
		} else if (item.checked !== null) {
			const isFocus = ctx.focusItem !== undefined && ctx.focusItem === itemIdx;
			const checkFn = tColor(
				item.checked ? "markdown.listCheck" : "markdown.listCross",
			).apply;
			const mark = item.checked ? "✔" : "✘";
			const pointer = isFocus ? "❯" : " ";
			const row = isFocus
				? `\x1b[7m${checkFn(`${pointer} ${mark}`)}\x1b[27m ${label}`
				: `  ${checkFn(`${mark}`)} ${label}`;
			lines.push(row);
			itemIdx++;
		} else {
			lines.push(`  ${bulletFn("•")} ${label}`);
		}
	}
	return lines.join("\n");
}

async function renderQuote(
	token: BlockToken & { type: "quote" },
): Promise<string> {
	const label = renderInline(token.inline);
	const barFn = tColor("markdown.quoteBar").apply;
	const textFn = tColor("markdown.quoteText").apply;

	return label
		.split("\n")
		.map((l) => `${barFn("│")} ${textFn(l)}`)
		.join("\n");
}

async function renderTable(
	token: BlockToken & { type: "table" },
	ctx: MdRenderContext,
): Promise<string> {
	const headers = token.headers;
	const rows = token.rows;
	// Cells may contain inline markdown (`**bold**`, `` `code` ``, links)
	// — render it so tables read as styled prose, not raw syntax. The
	// header is additionally bolded on top of the inline styles.
	const renderCell = (cell: string, header: boolean): string => {
		const styled = renderInline(tokenizeInline(cell));
		return header ? `\x1b[1m${styled}\x1b[22m` : styled;
	};
	const allRows = [
		headers.map((h) => renderCell(h, true)),
		...rows.map((r) => r.map((c) => renderCell(c, false))),
	];
	const result = duiTable(allRows[0], allRows.slice(1), {
		style: "none",
		padding: 1,
		width: ctx.width,
		colors: {
			header: { fg: "#fff", bg: "#333" },
			border: "#666",
		},
	});
	return result;
}

async function renderThematicBreak(ctx: MdRenderContext): Promise<string> {
	// Build the break directly off the `markdown.thematic` slot so the
	// markdown dashboard has a dedicated retheme hook independent of the
	// generic `divider.line` slot. `divider()` only accepts hex / rgb /
	// oklch color formats internally, so we keep the rendering in one
	// place and avoid the style-double-wrap trap.
	const width = Math.min(ctx.width ?? terminalWidth(), 72);
	return tColor("markdown.thematic").apply("─".repeat(width));
}

async function renderParagraph(
	token: BlockToken & { type: "paragraph" },
	ctx: MdRenderContext,
): Promise<string> {
	const label = renderInline(token.inline);
	const width = ctx.width ?? terminalWidth();
	if (visibleLength(label) > width) {
		return wrapTextByVisualWidth(label, width);
	}
	return label;
}

/**
 * Word-wrap a string so each line fits within `maxWidth` visual columns.
 * Respects CJK double-width characters by using `visibleLength()`.
 * Breaks at word boundaries (spaces) when possible; falls back to
 * character-level break when a single word exceeds the width.
 */
function wrapTextByVisualWidth(text: string, maxWidth: number): string {
	const lines: string[] = [];
	const words = text.split(" ");
	let currentLine = "";

	for (const word of words) {
		const wordWidth = visibleLength(stripAnsi(word));
		const currentWidth = visibleLength(stripAnsi(currentLine));
		const spacerWidth = currentLine.length > 0 ? 1 : 0;

		if (currentWidth + spacerWidth + wordWidth <= maxWidth) {
			currentLine += (currentLine ? " " : "") + word;
		} else {
			// Flush current line
			lines.push(currentLine);
			// If the word itself is wider than maxWidth, split it
			if (wordWidth > maxWidth) {
				// Character-level split for a single overlong word
				let remaining = word;
				while (remaining.length > 0) {
					let chunk = "";
					let chunkWidth = 0;
					for (const ch of remaining) {
						const chWidth = ch > "\x7f" ? visibleLength(ch) : 1;
						if (chunkWidth + chWidth > maxWidth && chunk.length > 0) break;
						chunk += ch;
						chunkWidth += chWidth;
					}
					lines.push(chunk);
					remaining = remaining.slice(chunk.length);
				}
			} else {
				currentLine = word;
			}
		}
	}

	if (currentLine) {
		lines.push(currentLine);
	}

	return lines.join("\n");
}

type BlockRenderer = (token: BlockToken, ctx: MdRenderContext) => Promise<string>;

const renderers: Record<string, BlockRenderer> = {
	heading: renderHeading as BlockRenderer,
	code: renderCode as BlockRenderer,
	list: renderList as BlockRenderer,
	quote: renderQuote as BlockRenderer,
	table: renderTable as BlockRenderer,
	thematicBreak: renderThematicBreak as BlockRenderer,
	paragraph: renderParagraph as BlockRenderer,
};

function renderBlock(token: BlockToken, ctx: MdRenderContext): Promise<string> {
	const renderer = renderers[token.type];
	if (!renderer) return Promise.resolve("");
	return renderer(token, ctx);
}

/**
 * Compute, per block, the global checklist-item offset (the index of the
 * first `[ ]`/`[x]` item inside that block). Lets `renderList` know
 * whether the interactive focus belongs to it.
 */
function checklistOffsets(blocks: BlockToken[]): number[] {
	const offsets: number[] = [];
	let n = 0;
	for (const b of blocks) {
		offsets.push(n);
		if (b.type === "list") {
			n += b.items.filter((it) => it.checked !== null).length;
		}
	}
	return offsets;
}

/** Render a full token stream with an optional shared context. */
async function renderBlocks(
	blocks: BlockToken[],
	options: MdRenderOptions = {},
): Promise<string> {
	const offsets = checklistOffsets(blocks);
	const parts = await Promise.all(
		blocks.map((b, i) =>
			renderBlock(b, { ...options, itemOffset: offsets[i] }),
		),
	);
	return parts.join("\n\n");
}

export async function md(
	text: string,
	options: MdRenderOptions = {},
): Promise<string> {
	const tokens = tokenize(text);
	return renderBlocks(tokens, options);
}

export function mdRender(text: string): void {
	md(text).then((output) => {
		console.log(output);
	});
}

export { mdSyntax } from "./syntax";

// ── Interactive checklists (markdown v2) ───────────────────────

export interface ChecklistItem {
	checked: boolean;
	label: string;
	/** 0-based line index in the source text. */
	line: number;
}

export interface MdInteractiveOptions extends MdRenderOptions {
	/** Force the non-interactive path even on a TTY. */
	disable?: boolean;
}

export interface MdInteractiveResult {
	/** Rendered markdown reflecting the current checkbox states. */
	output: string;
	/** Flattened checkbox items, in document order. */
	items: ChecklistItem[];
	/** Source text with the toggled checkboxes. */
	text: string;
	/** True when at least one box differs from the input. */
	changed: boolean;
	/** True when the user cancelled (Ctrl+C) before finishing. */
	cancelled: boolean;
}

const CHECKBOX_LINE_RE = /^(\s*[-*+])\s+\[([ xX])\]\s+(.*)$/;

/** Collect the flattened checkbox items with their source line indices. */
export function collectChecklist(text: string): ChecklistItem[] {
	const items: ChecklistItem[] = [];
	const lines = text.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const m = CHECKBOX_LINE_RE.exec(lines[i]);
		if (m) {
			items.push({
				checked: m[2] === "x" || m[2] === "X",
				label: m[3],
				line: i,
			});
		}
	}
	return items;
}

/**
 * Interactive markdown checklist.
 *
 * Renders the document and lets the user toggle `[ ]`/`[x]` items with
 * the keyboard: `j`/`k` (or arrows) move the focus, `space`/Enter
 * toggles the focused item, `q`/Esc finishes with the current state,
 * Ctrl+C cancels (no changes). Without a TTY (or with `disable: true`)
 * it renders statically and returns the original state.
 */
export async function mdInteractive(
	text: string,
	options: MdInteractiveOptions = {},
): Promise<MdInteractiveResult> {
	const items = collectChecklist(text);
	const interactive =
		!options.disable && !!process.stdin.isTTY && !!process.stdout.isTTY;

	if (!interactive || items.length === 0) {
		const output = await md(text, options);
		return {
			output,
			items,
			text,
			changed: false,
			cancelled: false,
		};
	}

	return interactiveChecklist(text, items, options);
}

function setCheckbox(text: string, line: number, checked: boolean): string {
	const lines = text.split("\n");
	const current = lines[line];
	if (current === undefined) return text;
	const m = CHECKBOX_LINE_RE.exec(current);
	if (!m) return text;
	lines[line] = `${m[1]} [${checked ? "x" : " "}] ${m[3]}`;
	return lines.join("\n");
}

function interactiveChecklist(
	initial: string,
	initialItems: ChecklistItem[],
	options: MdInteractiveOptions,
): Promise<MdInteractiveResult> {
	return new Promise<MdInteractiveResult>((resolve, reject) => {
		const stdin = process.stdin;
		const stdout = process.stdout;

		let text = initial;
		let items = initialItems;
		let cursor = 0;
		let done = false;
		let linesRendered = 0;
		let buf = "";

		function render() {
			if (done) return;
			md(text, { ...options, focusItem: cursor }).then((output) => {
				if (done) return;
				const frame =
					output +
					"\n\n" +
					`  ${items.length} item${items.length === 1 ? "" : "s"} · ` +
					`${items.filter((i) => i.checked).length} checked · ` +
					"j/k move, space toggle, q quit";
				if (linesRendered > 0) {
					stdout.write(`\x1b[${linesRendered}A`);
				} else {
					stdout.write("\x1b[H");
				}
				stdout.write("\x1b[0G");
				stdout.write("\x1b[J");
				stdout.write(frame);
				linesRendered = frame.split("\n").length;
			});
		}

		function cleanup() {
			if (done) return;
			done = true;
			stdin.removeListener("data", onData);
			stdin.setRawMode(false);
		}

		function finish(cancelled: boolean) {
			cleanup();
			if (linesRendered > 0) {
				stdout.write(`\x1b[${linesRendered}A`);
			}
			stdout.write("\x1b[0G");
			stdout.write("\x1b[J");
			if (cancelled) {
				resolve({
					output: "",
					items: initialItems,
					text: initial,
					changed: false,
					cancelled: true,
				});
				return;
			}
			const changed = text !== initial;
			md(text, options).then((output) => {
				resolve({
					output,
					items: collectChecklist(text),
					text,
					changed,
					cancelled: false,
				});
			});
		}

		function onData(data: string | Buffer) {
			if (done) return;
			const str = typeof data === "string" ? data : data.toString("utf8");
			buf += str;
			if (buf.length > 64) buf = buf.slice(-16);

			if (buf.includes("\x1b[A")) {
				buf = "";
				cursor = cursor <= 0 ? items.length - 1 : cursor - 1;
				render();
				return;
			}
			if (buf.includes("\x1b[B")) {
				buf = "";
				cursor = cursor >= items.length - 1 ? 0 : cursor + 1;
				render();
				return;
			}
			if (buf === "\x1b") {
				Promise.resolve().then(() => {
					if (done || buf !== "\x1b") return;
					buf = "";
					finish(false);
				});
				return;
			}

			const last = buf[buf.length - 1];
			switch (last) {
				case "j":
					buf = "";
					cursor = cursor >= items.length - 1 ? 0 : cursor + 1;
					render();
					break;
				case "k":
					buf = "";
					cursor = cursor <= 0 ? items.length - 1 : cursor - 1;
					render();
					break;
				case " ":
				case "\r":
				case "\n": {
					buf = "";
					const item = items[cursor];
					if (item) {
						const next = !item.checked;
						text = setCheckbox(text, item.line, next);
						items = collectChecklist(text);
					}
					render();
					break;
				}
				case "q":
					buf = "";
					finish(false);
					break;
				case "\x03": {
					buf = "";
					finish(true);
					break;
				}
				default:
					if (buf.length > 1) buf = "";
			}
		}

		stdin.setRawMode(true);
		stdin.setEncoding("utf8");
		stdin.on("data", onData);
		render();
	});
}
