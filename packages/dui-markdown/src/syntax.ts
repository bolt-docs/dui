import type { Highlighter } from "shiki";
import { createHighlighter } from "shiki";
import { getLanguage, getLanguages } from "./language";

let highlighter: Highlighter | null = null;
let initPromise: Promise<Highlighter> | null = null;
const cache = new Map<string, string>();

const HEX_RE = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/;

function hexToAnsiFg(hex: string): string {
	const m = HEX_RE.exec(hex);
	if (!m) return "";
	const r = Number.parseInt(m[1].slice(0, 2), 16);
	const g = Number.parseInt(m[1].slice(2, 4), 16);
	const b = Number.parseInt(m[1].slice(4, 6), 16);
	return `\x1b[38;2;${r};${g};${b}m`;
}

function applyFontStyle(text: string, fontStyle: number): string {
	if (fontStyle === 0) return text;
	let out = text;
	if (fontStyle & 1) out = `\x1b[1m${out}\x1b[22m`;
	if (fontStyle & 2) out = `\x1b[3m${out}\x1b[23m`;
	return out;
}

function getHighlighter(): Promise<Highlighter> {
	if (highlighter) return Promise.resolve(highlighter);
	if (initPromise) return initPromise;

	initPromise = createHighlighter({
		langs: getLanguages().map((l) => l.shikiLang),
		themes: ["min-dark"],
	}).then((h) => {
		highlighter = h;
		initPromise = null;
		return h;
	});

	return initPromise;
}

export function hexToAnsi(hex: string): string {
	return hexToAnsiFg(hex);
}

export async function mdSyntax(code: string, lang?: string): Promise<string> {
	const def = getLanguage(lang);
	if (!def) return code;

	const cacheKey = `${def.id}:${code}`;
	const cached = cache.get(cacheKey);
	if (cached) return cached;

	try {
		const hl = await getHighlighter();
		const result = hl.codeToTokens(code, { lang: def.shikiLang, theme: "min-dark" });

		const lines: string[] = [];
		for (const lineTokens of result.tokens) {
			let line = "";
			for (const token of lineTokens) {
				const colorAnsi = token.color ? hexToAnsiFg(token.color) : "";
				const styled = applyFontStyle(token.content, token.fontStyle || 0);
				line += `${colorAnsi}${styled}\x1b[0m`;
			}
			if (line === "") line = " ";
			lines.push(line);
		}

		const output = lines.join("\n");
		cache.set(cacheKey, output);
		return output;
	} catch {
		return code;
	}
}
