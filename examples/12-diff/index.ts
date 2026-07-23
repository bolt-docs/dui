/**
 * Example 12: Diff Rendering
 *
 * Shows: diff(), diffSideBySide(), diffWordsRender(),
 *        diffFiles(), theme customization, diffStat().
 *
 * Run: pnpm --filter examples diff
 */

import { box, colors, configure, renderStatic } from "@bdocs/dui";
import {
	diff,
	diffFiles,
	diffSideBySide,
	diffStat,
	diffWordsRender,
	getPalette,
} from "@dui-toolkit/plugin-diff";

function section(title: string): void {
	console.log("");
	console.log(colors.bold(`  ▸ ${title}`));
	console.log(colors.dim(`  ${"─".repeat(title.length + 4)}`));
	console.log("");
}

async function main() {
	console.log("");
	console.log(colors.bold("  🔍 Diff Rendering"));
	console.log(colors.dim("  ────────────────────"));
	console.log("");
	console.log(
		colors.dim("  Unified diffs, side-by-side, word-level highlighting,"),
	);
	console.log(colors.dim("  multi-file aggregation, and theme customization."));
	console.log("");

	// ── 1. Unified diff ─────────────────────────────────────
	section("Unified diff (git-style)");

	const oldCode = `export function greet(name: string): string {
  console.log("Hello", name);
  return name;
}

export const VERSION = "1.0.0";`;

	const newCode = `export function greet(name: string, polite = false): string {
  const prefix = polite ? "Hello, " : "Hi ";
  console.log(prefix + name);
  return name;
}

export const VERSION = "1.1.0";
export const AUTHOR = "Bolt Docs";`;

	const unified = diff(oldCode, newCode, {
		filename: "src/greet.ts",
	});
	console.log(box([unified.output], { title: "Unified", style: "single" }));
	console.log("");
	console.log(colors.dim(`  ${diffStat(unified)}`));

	// ── 2. Side-by-side ─────────────────────────────────────
	section("Side-by-side diff");

	const sxs = diffSideBySide(oldCode, newCode, {
		filename: "src/greet.ts",
	});
	console.log(box([sxs.output], { title: "Side-by-side", style: "single" }));

	// ── 3. Word-level highlighting ──────────────────────────
	section("Word-level intra-line highlighting");

	const oldLine = "const result = oldValue * 2;";
	const newLine = "const result = newValue * 2;";

	const wordDiff = diffWordsRender(oldLine, newLine);
	console.log(
		box([`  - ${wordDiff.old}`, `  + ${wordDiff.new}`], {
			title: "diffWordsRender",
			style: "round",
		}),
	);

	// ── 4. Multi-file diff ──────────────────────────────────
	section("Multi-file diff");

	const multi = diffFiles(
		[
			{
				oldPath: "src/greet.ts",
				newPath: "src/greet.ts",
				oldContent: `console.log("hello")`,
				newContent: `console.log("hi")`,
			},
			{
				oldPath: "src/version.ts",
				newPath: "src/version.ts",
				oldContent: "export const v = '1.0';",
				newContent: "export const v = '2.0';",
			},
			{
				oldPath: "tests/greet.test.ts",
				newPath: "tests/greet.test.ts",
				oldContent: "",
				newContent: "import { greet } from './greet';",
			},
		],
		{ context: 2 },
	);
	console.log(box([multi.output], { title: "diffFiles", style: "single" }));

	// ── 5. Theme customization ──────────────────────────────
	section("Theme customization via DuiTheme");

	configure({
		theme: {
			diff: {
				add: { fg: "#88ff88", bg: "#1a3a1a" },
				del: { fg: "#ff8888", bg: "#3a1a1a" },
				hunk: "brightcyan",
				stat: "yellow",
			},
		},
	});

	const themed = diff(
		"function old() {\n  return 1;\n}",
		"function new() {\n  return 2;\n}\n// end",
		{ filename: "themed.ts" },
	);
	console.log(
		box([themed.output], { title: "With custom theme", style: "round" }),
	);
	console.log("");

	// ── 6. Palette inspection ───────────────────────────────
	section("Available palette");

	const palette = getPalette();
	const slots = [
		["add", palette.add],
		["del", palette.del],
		["context", palette.context],
		["hunk", palette.hunk],
	];
	for (const [name, fn] of slots) {
		console.log(`  ${colors.dim(`palette.${name}:`)} ${fn("sample text")}`);
	}

	console.log("");
	console.log(colors.dim("  Powered by @bdocs/dui + jsdiff"));
	console.log("");
}

main().catch((err) => {
	console.error(colors.red("Error:"), err);
	process.exit(1);
});

void renderStatic;
