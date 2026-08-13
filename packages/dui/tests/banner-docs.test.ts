import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { banner } from "../src/index";

/**
 * Docs/preview consistency check.
 *
 * Every `<TerminalPreview>` block in the banner docs must render the
 * *exact* output of the real `banner()` call shown in the code block
 * above it — same glyphs, same ANSI codes, same trailing spaces. If the
 * font, the color handling, or the documented options drift, the docs
 * silently show something different from what the library prints.
 *
 * The previews are stored in the docs as template literals, so this
 * test extracts them and compares byte-for-byte against `banner()`.
 * When the output legitimately changes (font redesign, new color
 * codes), regenerate the preview blocks from the calls below and keep
 * the manifest in sync with the code examples in the docs.
 */

const DOCS_DIR = fileURLToPath(new URL("../../../website/docs/next", import.meta.url));

interface PreviewCase {
	/** Docs file relative to `website/docs/next`. */
	file: string;
	/** Human-readable label for failure messages. */
	label: string;
	/** The real `banner()` call the preview must match. */
	call: () => string;
}

// Ordered like the docs: the fill preview first, then the smush preview.
const CASES: PreviewCase[] = [
	{
		file: "api/banner.mdx",
		label: "fill # green",
		call: () => banner("CI", { fill: "#", color: "green" }),
	},
	{
		file: "api/banner.mdx",
		label: "smush white",
		call: () => banner("CI", { layout: "smush", color: "white" }),
	},
	{
		file: "es/api/banner.mdx",
		label: "fill # green (ES)",
		call: () => banner("CI", { fill: "#", color: "green" }),
	},
	{
		file: "es/api/banner.mdx",
		label: "smush white (ES)",
		call: () => banner("CI", { layout: "smush", color: "white" }),
	},
];

/**
 * Interpret the escapes used in the docs' template literals (`\x1b` →
 * ESC, `\x20` → space, `\n` → newline, ...). Real newlines pass
 * through untouched.
 */
function unescapeTemplate(src: string): string {
	return src.replace(/\\(?:x([0-9a-fA-F]{2})|n|t|r|\\)/g, (match, hex?: string) => {
		if (hex) return String.fromCharCode(parseInt(hex, 16));
		switch (match) {
			case "\\n":
				return "\n";
			case "\\t":
				return "\t";
			case "\\r":
				return "\r";
			default:
				return "\\";
		}
	});
}

/** Extract the template-literal children of every `<TerminalPreview>` block. */
function extractPreviews(mdx: string): string[] {
	const out: string[] = [];
	const re = /<\s*TerminalPreview[\s\S]*?>\s*\{\s*`([\s\S]*?)`\s*\}\s*<\/\s*TerminalPreview\s*>/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(mdx)) !== null) {
		out.push(unescapeTemplate(m[1]));
	}
	return out;
}

const REGEN_HINT =
	"docs previews drifted from the real banner() output — regenerate them " +
	"from the banner() calls in this test (remember to keep `\\x20` for " +
	"line-leading spaces, which @mdx-js/mdx otherwise strips)";

describe("banner docs previews match real output", () => {
	for (const file of [...new Set(CASES.map((c) => c.file))]) {
		const cases = CASES.filter((c) => c.file === file);
		it(`${file} previews match banner()`, () => {
			const mdx = readFileSync(join(DOCS_DIR, file), "utf8");
			const previews = extractPreviews(mdx);
			const expected = cases.map((c) => c.call());
			expect(
				previews,
				`${file}: ${cases.map((c) => c.label).join(", ")} — ${REGEN_HINT}`,
			).toEqual(expected);
		});
	}
});
