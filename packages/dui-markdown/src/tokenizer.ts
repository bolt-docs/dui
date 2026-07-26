export interface InlineToken {
	type: "text" | "bold" | "italic" | "strikethrough" | "code" | "link" | "image" | "autolink";
	content: string;
	url?: string;
	alt?: string;
	/** Nested inline tokens (for `**bold _and italic_**`). */
	children?: InlineToken[];
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

/* ── Inline tokenizer (char-by-char state machine) ──────────── */

type DelimType = "bold" | "italic" | "strikethrough" | "code";

/**
 * Parse inline text into a flat array of InlineToken, with children
 * nested for `**bold _italic_**` → bold [text, italic [text]].
 *
 * Algorithm:
 *  1. Walk the string char-by-char.
 *  2. When a delimiter opens (`**`, `*`, `~~`, `` ` ``), push it on a stack.
 *  3. When a delimiter closes, pop from the stack and extract the
 *     substring delimited by open and close, then recursively
 *     tokenize it as children.
 *  4. Links (`[text](url)`) and images (`![alt](url)`) are matched
 *     inline when not inside code spans.
 *  5. Unmatched delimiters render as literal text.
 */
export function tokenizeInline(text: string): InlineToken[] {
	const result: InlineToken[] = [];
	let pos = 0;

	while (pos < text.length) {
		const remaining = text.slice(pos);

		// Images: ![alt](url)
		const imgMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
		if (imgMatch) {
			result.push({
				type: "image",
				content: imgMatch[1] || imgMatch[2],
				alt: imgMatch[1] || undefined,
				url: imgMatch[2],
			});
			pos += imgMatch[0].length;
			continue;
		}

		// Auto‑links: bare URL like https://example.com
		const autoUrlMatch = remaining.match(
			/^(https?:\/\/[^\s<>"'(){}[\]]+(?:\([^\s<>"'(){}[\]]*\))*[^\s<>"'(){}[\].,;:!?]*)/i,
		);
		if (autoUrlMatch) {
			const url = autoUrlMatch[1];
			result.push({
				type: "autolink",
				content: url,
				url,
			});
			pos += url.length;
			continue;
		}

		// Links: [text](url)
		const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
		if (linkMatch) {
			result.push({
				type: "link",
				content: linkMatch[1],
				url: linkMatch[2],
			});
			pos += linkMatch[0].length;
			continue;
		}

		// Inline code: `text`
		if (text[pos] === "`") {
			let fenceLen = 1;
			while (text[pos + fenceLen] === "`") fenceLen++;
			const closeIdx = text.indexOf("`".repeat(fenceLen), pos + fenceLen);
			if (closeIdx >= 0) {
				const content = text.slice(pos + fenceLen, closeIdx);
				result.push({ type: "code", content });
				pos = closeIdx + fenceLen;
				continue;
			}
		}

		// Strikethrough: ~~text~~
		if (
			text[pos] === "~" &&
			text[pos + 1] === "~" &&
			text[pos + 2] !== undefined
		) {
			const closeIdx = text.indexOf("~~", pos + 2);
			if (closeIdx >= 0) {
				const inner = text.slice(pos + 2, closeIdx);
				result.push({
					type: "strikethrough",
					content: inner,
					children: tokenizeInline(inner),
				});
				pos = closeIdx + 2;
				continue;
			}
		}

		// Bold: **text**
		if (
			text[pos] === "*" &&
			text[pos + 1] === "*" &&
			text[pos + 2] !== undefined &&
			text[pos + 2] !== "*"
		) {
			const closeIdx = text.indexOf("**", pos + 2);
			if (closeIdx >= 0) {
				const inner = text.slice(pos + 2, closeIdx);
				result.push({
					type: "bold",
					content: inner,
					children: tokenizeInline(inner),
				});
				pos = closeIdx + 2;
				continue;
			}
		}

		// Italic: *text* (only when not inside **)
		if (
			text[pos] === "*" &&
			text[pos + 1] !== "*" &&
			text[pos + 1] !== undefined
		) {
			const closeIdx = text.indexOf("*", pos + 1);
			if (closeIdx >= 0 && text[closeIdx + 1] !== "*") {
				const inner = text.slice(pos + 1, closeIdx);
				result.push({
					type: "italic",
					content: inner,
					children: tokenizeInline(inner),
				});
				pos = closeIdx + 1;
				continue;
			}
		}

		// Regular character — accumulate into a text token
		let textContent = "";
		while (pos < text.length) {
			const ch = text[pos];
			const next = text[pos + 1] ?? "";

			// Stop at any delimiter start
			if (
				ch === "`" ||
				ch === "[" ||
				(ch === "!" && next === "[") ||
				(ch === "~" && next === "~") ||
				(ch === "*" && next === "*") ||
				(ch === "*" && next !== "*")
			)
				break;

			// Stop at URL start (so https://… gets its own autolink token)
			if (
				ch === "h" &&
				text.slice(pos, pos + 8).toLowerCase() === "https://"
			) {
				break;
			}
			if (
				ch === "h" &&
				text.slice(pos, pos + 7).toLowerCase() === "http://"
			) {
				break;
			}

			textContent += ch;
			pos++;
		}
		if (textContent) {
			result.push({ type: "text", content: textContent });
		}
	}

	return result;
}

/* ── Block-level tokenizer ───────────────────────────────────── */

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
