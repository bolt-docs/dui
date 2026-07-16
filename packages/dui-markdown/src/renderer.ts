import {
	getConfig,
	resolveColor,
	table as duiTable,
	terminalWidth,
	visibleLength,
	stripAnsi,
} from "@bdocs/dui";
import {
	tokenize,
	type BlockToken,
	type InlineToken,
} from "./tokenizer";
import { mdSyntax } from "./syntax";

// Resolve a markdown theme slot against the live config so theme
// tweaks via `configure({ theme: { markdown: … } })` are picked up
// on the next render call without re-registering the plugin.
function tColor(slot: string): { apply: (s: string) => string; bg?: (s: string) => string } {
	return resolveColor(slot, getConfig().theme);
}

function renderInline(tokens: InlineToken[]): string {
	return tokens
		.map((t) => {
			switch (t.type) {
				case "text":
					return t.content;
				case "bold":
					return `\x1b[1m${t.content}\x1b[22m`;
				case "italic":
					return `\x1b[3m${t.content}\x1b[23m`;
				case "code": {
					const color = tColor("markdown.codeInline");
					const fg = color.apply(t.content);
					// Apply the chip background only when the theme
					// provides one. Pass `{ fg, bg }` for a chip look;
					// pass a plain string for fg-only styling.
					return color.bg ? color.bg(fg) : fg;
				}
				case "link": {
					const linkText = tColor("markdown.linkText").apply;
					const linkUrl = tColor("markdown.linkUrl").apply;
					return `\x1b[4m${linkText(t.content)}\x1b[24m${linkUrl(` (${t.url})`)}`;
				}
				case "image": {
					const imageText = tColor("markdown.imageText").apply;
					return imageText(`[image: ${t.alt || t.content}]`);
				}
				default:
					return t.content;
			}
		})
		.join("");
}

async function renderHeading(token: BlockToken & { type: "heading" }): Promise<string> {
	const label = renderInline(token.inline);
	const prefix = "#".repeat(token.level);
	// h6 keeps the same color as h5 — clamp the slot lookup so callers
	// never accidentally hit an unknown slot (which would return identity).
	const slot = `markdown.heading${Math.min(token.level, 6)}`;
	const heading = tColor(slot).apply;
	return heading(`\x1b[1m${prefix} ${label}\x1b[22m`);
}

async function renderCode(token: BlockToken & { type: "code" }): Promise<string> {
	const width = Math.min(terminalWidth(), 80);
	const lang = token.lang || "text";
	const highlighted = lang !== "text"
		? await mdSyntax(token.code, lang)
		: token.code;
	// Code-fence label honors the `markdown.codeLang` slot independently
	// from the `codeBorder` so callers can pick a contrasting color
	// (e.g. a brighter language name without affecting the box outline).
	const langTag = lang !== "text"
		? ` ${tColor("markdown.codeLang").apply(lang)}`
		: "";
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

async function renderList(token: BlockToken & { type: "list" }): Promise<string> {
	const lines: string[] = [];
	// Split markers into bullet vs. ordinal so callers can retheme
	// `markdown.listBullet` (unordered `•`) and `markdown.listNumber`
	// (`1.`, `2.`, …) independently.
	const bulletFn = tColor("markdown.listBullet").apply;
	const numberFn = tColor("markdown.listNumber").apply;

	for (let i = 0; i < token.items.length; i++) {
		const item = token.items[i];
		const label = renderInline(item.inline);
		if (token.ordered) {
			lines.push(`  ${numberFn(`${i + 1}.`)} ${label}`);
		} else if (item.checked !== null) {
			const checkFn = tColor(
				item.checked ? "markdown.listCheck" : "markdown.listCross",
			).apply;
			lines.push(`  ${checkFn(item.checked ? "✔" : "✘")} ${label}`);
		} else {
			lines.push(`  ${bulletFn("•")} ${label}`);
		}
	}
	return lines.join("\n");
}

async function renderQuote(token: BlockToken & { type: "quote" }): Promise<string> {
	const label = renderInline(token.inline);
	const barFn = tColor("markdown.quoteBar").apply;
	const textFn = tColor("markdown.quoteText").apply;

	return label
		.split("\n")
		.map((l) => `${barFn("│")} ${textFn(l)}`)
		.join("\n");
}

async function renderTable(token: BlockToken & { type: "table" }): Promise<string> {
	const headers = token.headers;
	const rows = token.rows;
	const allRows = [headers.map((h) => `\x1b[1m${h}\x1b[22m`), ...rows];
	const result = duiTable(allRows[0], allRows.slice(1), {
		style: "none",
		padding: 1,
		colors: {
			header: { fg: "#fff", bg: "#333" },
			border: "#666",
		},
	});
	return result;
}

async function renderThematicBreak(): Promise<string> {
	// Build the break directly off the `markdown.thematic` slot so the
	// markdown dashboard has a dedicated retheme hook independent of the
	// generic `divider.line` slot. `divider()` only accepts hex / rgb /
	// oklch color formats internally, so we keep the rendering in one
	// place and avoid the style-double-wrap trap.
	const width = Math.min(terminalWidth(), 72);
	return tColor("markdown.thematic").apply("─".repeat(width));
}

async function renderParagraph(token: BlockToken & { type: "paragraph" }): Promise<string> {
	const label = renderInline(token.inline);
	const width = terminalWidth();
	if (visibleLength(label) > width) {
		return label
			.split("")
			.reduce((acc, c) => {
				const last = acc[acc.length - 1];
				if (last && visibleLength(last) < width) {
					acc[acc.length - 1] += c;
				} else {
					acc.push(c);
				}
				return acc;
			}, [] as string[])
			.join("\n");
	}
	return label;
}

type BlockRenderer = (token: BlockToken) => Promise<string>;

const renderers: Record<string, BlockRenderer> = {
	heading: renderHeading as BlockRenderer,
	code: renderCode as BlockRenderer,
	list: renderList as BlockRenderer,
	quote: renderQuote as BlockRenderer,
	table: renderTable as BlockRenderer,
	thematicBreak: renderThematicBreak as BlockRenderer,
	paragraph: renderParagraph as BlockRenderer,
};

function renderBlock(token: BlockToken): Promise<string> {
	const renderer = renderers[token.type];
	if (!renderer) return Promise.resolve("");
	return renderer(token);
}

export async function md(text: string): Promise<string> {
	const tokens = tokenize(text);
	const parts = await Promise.all(tokens.map(renderBlock));
	return parts.join("\n\n");
}

export function mdRender(text: string): void {
	md(text).then((output) => {
		console.log(output);
	});
}

export { mdSyntax } from "./syntax";
