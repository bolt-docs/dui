export interface InlineToken {
	type: "text" | "bold" | "italic" | "code" | "link" | "image";
	content: string;
	url?: string;
	alt?: string;
}

export interface BlockTokenHeading {
	type: "heading";
	level: number;
	inline: InlineToken[];
}

export interface BlockTokenCode {
	type: "code";
	lang: string;
	code: string;
}

export interface BlockTokenList {
	type: "list";
	ordered: boolean;
	items: { checked: boolean | null; inline: InlineToken[] }[];
}

export interface BlockTokenQuote {
	type: "quote";
	inline: InlineToken[];
}

export interface BlockTokenTable {
	type: "table";
	headers: string[];
	rows: string[][];
}

export interface BlockTokenParagraph {
	type: "paragraph";
	inline: InlineToken[];
}

export interface BlockTokenThematicBreak {
	type: "thematicBreak";
}

export type BlockToken =
	| BlockTokenHeading
	| BlockTokenCode
	| BlockTokenList
	| BlockTokenQuote
	| BlockTokenTable
	| BlockTokenParagraph
	| BlockTokenThematicBreak;

const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const CODE_FENCE_RE = /^(`{3,}|~{3,})(\w*)/;
const UNORDERED_RE = /^(\s*)[-*+]\s+(.*)$/;
const ORDERED_RE = /^(\s*)\d+\.\s+(.*)$/;
const CHECKBOX_RE = /^\[([ xX])\]\s+(.*)$/;
const QUOTE_RE = /^>\s?(.*)$/;
const TABLE_RE = /^\|(.+)\|$/;
const THEMATIC_BREAK_RE = /^(-{3,}|\*{3,}|_{3,})\s*$/;
const BOLD_RE = /\*\*(.+?)\*\*/g;
const ITALIC_RE = /\*(.+?)\*/g;
const CODE_RE = /`([^`]+)`/g;
const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

export function tokenizeInline(text: string): InlineToken[] {
	const tokens: InlineToken[] = [];
	let remaining = text;

	const regexps: { re: RegExp; build: (...m: string[]) => InlineToken }[] = [
		{
			re: IMAGE_RE,
			build: (_, alt, url) => ({
				type: "image" as const,
				content: alt || url,
				alt,
				url,
			}),
		},
		{
			re: LINK_RE,
			build: (_, content, url) => ({ type: "link" as const, content, url }),
		},
		{
			re: CODE_RE,
			build: (_, content) => ({ type: "code" as const, content }),
		},
		{
			re: BOLD_RE,
			build: (_, content) => ({ type: "bold" as const, content }),
		},
		{
			re: ITALIC_RE,
			build: (_, content) => ({ type: "italic" as const, content }),
		},
	];

	while (remaining.length > 0) {
		let found = false;
		for (const { re, build } of regexps) {
			re.lastIndex = 0;
			const match = re.exec(remaining);
			if (match && match.index === 0) {
				if (match.index > 0) {
					tokens.push({
						type: "text",
						content: remaining.slice(0, match.index),
					});
				}
				tokens.push(build(...match));
				remaining = remaining.slice(match[0].length);
				found = true;
				break;
			}
		}
		if (!found) {
			tokens.push({ type: "text", content: remaining[0] });
			remaining = remaining.slice(1);
		}
	}

	return tokens;
}

function parseListItem(line: string): {
	checked: boolean | null;
	text: string;
} {
	const checkbox = CHECKBOX_RE.exec(line);
	if (checkbox) {
		return {
			checked: checkbox[1] === "x" || checkbox[1] === "X",
			text: checkbox[2],
		};
	}
	return { checked: null, text: line };
}

export function tokenize(text: string): BlockToken[] {
	const blocks: BlockToken[] = [];
	const lines = text.split("\n");
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];

		if (line.trim() === "") {
			i++;
			continue;
		}

		const headingMatch = HEADING_RE.exec(line);
		if (headingMatch) {
			blocks.push({
				type: "heading",
				level: headingMatch[1].length,
				inline: tokenizeInline(headingMatch[2]),
			});
			i++;
			continue;
		}

		const breakMatch = THEMATIC_BREAK_RE.exec(line);
		if (breakMatch) {
			blocks.push({ type: "thematicBreak" });
			i++;
			continue;
		}

		const fenceMatch = CODE_FENCE_RE.exec(line);
		if (fenceMatch) {
			const lang = fenceMatch[2] || "";
			const fence = fenceMatch[1];
			const codeLines: string[] = [];
			i++;
			while (i < lines.length && !lines[i].startsWith(fence)) {
				codeLines.push(lines[i]);
				i++;
			}
			i++;
			blocks.push({
				type: "code",
				lang,
				code: codeLines.join("\n"),
			});
			continue;
		}

		const quoteMatch = QUOTE_RE.exec(line);
		if (quoteMatch) {
			const quoteLines: string[] = [quoteMatch[1]];
			i++;
			while (i < lines.length) {
				const m = QUOTE_RE.exec(lines[i]);
				if (m) {
					quoteLines.push(m[1]);
					i++;
				} else if (lines[i].trim() === "") {
					break;
				} else {
					break;
				}
			}
			blocks.push({
				type: "quote",
				inline: tokenizeInline(quoteLines.join(" ")),
			});
			continue;
		}

		const ulMatch = UNORDERED_RE.exec(line);
		const olMatch = ORDERED_RE.exec(line);
		if (ulMatch || olMatch) {
			const ordered = !!olMatch;
			const items: { checked: boolean | null; inline: InlineToken[] }[] = [];
			const re = ordered ? ORDERED_RE : UNORDERED_RE;

			while (i < lines.length) {
				const m = re.exec(lines[i]);
				if (m) {
					const { checked, text } = parseListItem(m[2]);
					items.push({ checked, inline: tokenizeInline(text) });
					i++;
				} else if (lines[i].trim() === "") {
					i++;
					break;
				} else {
					break;
				}
			}

			blocks.push({ type: "list", ordered, items });
			continue;
		}

		const tableMatch = TABLE_RE.exec(line);
		if (tableMatch) {
			const headerCells = line
				.split("|")
				.filter(Boolean)
				.map((c) => c.trim());
			i++;
			const sepRow = lines[i]
				?.split("|")
				.filter(Boolean)
				.map((c) => c.trim());
			if (sepRow && sepRow.every((c) => /^:?-+:?$/.test(c))) {
				i++;
			}
			const rows: string[][] = [];
			while (i < lines.length) {
				const m = TABLE_RE.exec(lines[i]);
				if (m) {
					rows.push(
						lines[i]
							.split("|")
							.filter(Boolean)
							.map((c) => c.trim()),
					);
					i++;
				} else {
					break;
				}
			}
			blocks.push({ type: "table", headers: headerCells, rows });
			continue;
		}

		const paraLines: string[] = [line];
		i++;
		while (i < lines.length) {
			if (
				lines[i].trim() === "" ||
				HEADING_RE.test(lines[i]) ||
				CODE_FENCE_RE.test(lines[i]) ||
				THEMATIC_BREAK_RE.test(lines[i]) ||
				UNORDERED_RE.test(lines[i]) ||
				ORDERED_RE.test(lines[i]) ||
				TABLE_RE.test(lines[i]) ||
				QUOTE_RE.test(lines[i])
			) {
				break;
			}
			paraLines.push(lines[i]);
			i++;
		}

		blocks.push({
			type: "paragraph",
			inline: tokenizeInline(paraLines.join(" ")),
		});
	}

	return blocks;
}
