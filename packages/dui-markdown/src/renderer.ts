import {
	colors,
	divider,
	table as duiTable,
	terminalWidth,
	visibleLength,
	stripAnsi,
} from "@bdocs/dui";
import { tokenize, type BlockToken, type BlockTokenHeading, type BlockTokenCode, type BlockTokenList, type BlockTokenQuote, type BlockTokenTable, type BlockTokenParagraph, type InlineToken } from "./tokenizer";
import { mdSyntax } from "./syntax";

const headingColors = [
	"\x1b[38;2;255;110;110m",
	"\x1b[38;2;255;180;80m",
	"\x1b[38;2;255;220;80m",
	"\x1b[38;2;130;220;130m",
	"\x1b[38;2;100;200;255m",
	"\x1b[38;2;180;140;255m",
];

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
				case "code":
					return `\x1b[48;2;40;44;52m\x1b[38;2;150;200;255m${t.content}\x1b[0m`;
				case "link":
					return `\x1b[4m\x1b[38;2;88;166;255m${t.content}\x1b[0m\x1b[38;2;136;136;136m (${t.url})\x1b[0m`;
				case "image":
					return `\x1b[38;2;136;136;136m[image: ${t.alt || t.content}]\x1b[0m`;
				default:
					return t.content;
			}
		})
		.join("");
}

async function renderHeading(token: BlockToken & { type: "heading" }): Promise<string> {
	const label = renderInline(token.inline);
	const color = headingColors[Math.min(token.level - 1, headingColors.length - 1)];
	const prefix = "#".repeat(token.level);
	return `${color}\x1b[1m${prefix} ${label}\x1b[0m`;
}

async function renderCode(token: BlockToken & { type: "code" }): Promise<string> {
	const width = Math.min(terminalWidth(), 80);
	const lang = token.lang || "text";
	const highlighted = lang !== "text"
		? await mdSyntax(token.code, lang)
		: token.code;
	const langTag = lang !== "text" ? ` ${colors.dim(lang)}` : "";
	const border = "\x1b[38;2;100;100;120m";

	const lines = highlighted.split("\n");
	const wrapped = lines.map((l) => {
		const clean = stripAnsi(l);
		if (visibleLength(clean) > width - 2) {
			return l.slice(0, width - 5) + "\x1b[0m…";
		}
		return l;
	});

	const top = `${border}┌${"─".repeat(width - 2)}┐\x1b[0m${langTag}`;
	const bottom = `${border}└${"─".repeat(width - 2)}┘\x1b[0m`;
	const body = wrapped.map((l) => {
		const pad = width - 2 - stripAnsi(l).length;
		return `${border}│\x1b[0m${l}${" ".repeat(Math.max(0, pad))}${border}│\x1b[0m`;
	}).join("\n");

	return `${top}\n${body}\n${bottom}`;
}

async function renderList(token: BlockToken & { type: "list" }): Promise<string> {
	const lines: string[] = [];
	for (let i = 0; i < token.items.length; i++) {
		const item = token.items[i];
		const label = renderInline(item.inline);
		if (token.ordered) {
			lines.push(`  \x1b[38;2;136;136;136m${i + 1}.\x1b[0m ${label}`);
		} else if (item.checked !== null) {
			const chk = item.checked ? "\x1b[38;2;80;200;120m✔\x1b[0m" : "\x1b[38;2;180;180;180m✘\x1b[0m";
			lines.push(`  ${chk} ${label}`);
		} else {
			lines.push(`  \x1b[38;2;136;136;136m•\x1b[0m ${label}`);
		}
	}
	return lines.join("\n");
}

async function renderQuote(token: BlockToken & { type: "quote" }): Promise<string> {
	const label = renderInline(token.inline);
	return label
		.split("\n")
		.map((l) => `\x1b[38;2;100;120;140m│\x1b[0m \x1b[38;2;160;170;180m${l}\x1b[0m`)
		.join("\n");
}

async function renderTable(token: BlockToken & { type: "table" }): Promise<string> {
	const headers = token.headers;
	const rows = token.rows;
	const allRows = [headers.map((h) => `\x1b[1m${h}\x1b[0m`), ...rows];
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
	return divider("─", undefined, { color: "#555" });
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
