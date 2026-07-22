/**
 * Example 16: Plugin Stack — composes multiple plugins via the v2 API.
 *
 * Shows:
 *   - Multiple `usePluginAsync(plugin)` calls in a chain (register event
 *     fires ONCE after the queue drains).
 *   - One `configure({ theme })` overriding MARKDOWN, DIFF, and CHART slots
 *     under a unified brand palette.
 *   - Each plugin's renderer picking up the themed defaults through
 *     `getConfig().theme.*` (no per-call colors).
 *
 * Run with: pnpm --filter examples plugin-stack
 *           (or npx tsx 16-plugin-stack/index.ts)
 */

import { colors, configure, usePluginAsync, box, divider } from "@bdocs/dui";
import { markdownPlugin, md } from "@dui-toolkit/plugin-markdown";
import { diffPlugin, diff } from "@dui-toolkit/plugin-diff";
import { chartPlugin, bar } from "@dui-toolkit/plugin-chart";
import { section } from "../helpers";

async function main() {
	console.log("");
	console.log(colors.bold("  🧩 Plugin Stack — composition via v2 API"));
	console.log(colors.dim("  ──────────────────────────────────────────"));
	console.log("");
	console.log(colors.dim("  markdown · diff · chart, themed via one configure()"));
	console.log("");

	// ── 1. Register plugins in a single async chain ──────────────────────
	// Order matters: each `await usePluginAsync(p)` runs the plugin's
	// `setup()` and resolves before the next one starts. The `register`
	// event fires once after all three setups complete.
	section("Boot the plugin chain");

	await usePluginAsync(markdownPlugin);
	console.log(colors.dim("  ✓ markdownPlugin"));
	await usePluginAsync(diffPlugin);
	console.log(colors.dim("  ✓ diffPlugin"));
	await usePluginAsync(chartPlugin);
	console.log(colors.dim("  ✓ chartPlugin"));

	// ── 2. Apply a unified theme ─────────────────────────────────────────
	// All three plugins' slot paths are flattened into one configure()
	// call. User theme wins over plugin defaults (Phase 1 rule).
	section("Unified brand theme");

	configure({
		prefix: "dui-stack",
		theme: {
			success: "#22c55e",
			error: "#ef4444",
			// markdown slots
			markdown: {
				heading1: "#fbbf24",
				heading2: "#60a5fa",
				codeInline: { fg: "#a78bfa", bg: "#1e1b4b" },
				linkText: "#38bdf8",
			},
			// diff slots
			diff: {
				add: "#86efac",
				del: "#fca5a5",
				hunk: "#7dd3fc",
				stat: "#fde68a",
			},
			// chart palette
			chart: {
				bar: "#22d3ee",
				palette: {
					0: "#22d3ee",
					1: "#fb923c",
					2: "#a78bfa",
				},
			},
		},
	});

	console.log(divider("─", 64, { color: "#374151" }));
	console.log(colors.dim("  configure({ theme: { markdown, diff, chart } }) applied"));
	console.log(divider("─", 64, { color: "#374151" }));
	console.log("");

	// ── 3. Render markdown via plugin (themed) ──────────────────────────
	section("Markdown output (themed via plugin API)");

	const mdText = `# Plugin Stack Demo

A minimal \`async setup\`, themed via the v2 API.

- Bullet uses **markdown.listBullet**
- Code uses \`markdown.codeInline\` (compound fg+bg)
- Heading uses \`markdown.heading1\`

\`\`\`ts
configure({ theme: { markdown: { heading1: "#fbbf24" } } })
\`\`\`
`;

	const rendered = await md(mdText);
	console.log(
		box([rendered], {
			title: "markdown",
			style: "round",
			colors: { border: "#60a5fa", title: { fg: "#fbbf24", bg: "#1e293b" } },
		}),
	);

	// ── 4. Render a diff via plugin (themed) ─────────────────────────────
	section("Diff (themed via plugin API)");

	const before = `export const v = 1;
export const x = "beta";
export const seed = "OLD";`;

	const after = `export const v = 2;
export const x = "stable";
// rebrand pass complete
export const seed = "NEW";`;

	const d = diff(before, after, { filename: "src/version.ts" });
	console.log(
		box([d.output], {
			title: "diff",
			style: "single",
			colors: { border: "#7dd3fc", title: { fg: "#0c4a6e", bg: "#bae6fd" } },
		}),
	);

	// ── 5. Render a bar chart via plugin (themed) ───────────────────────
	section("Chart output (themed via plugin API)");

	console.log(
		bar([80, 60, 95, 45], {
			labels: ["A", "B", "C", "D"],
			title: "Throughput (last 4 builds)",
		}),
	);

	console.log("");
	console.log(
		colors.dim(
			"  tip: the v2 plugin API slots are discoverable via resolveColor(<slot>),",
		),
	);
	console.log(
		colors.dim(
			"       and user `configure({ theme })` wins over plugin defaults.",
		),
	);
	console.log("");
}

main().catch((err) => {
	console.error(colors.red("Error:"), err);
	process.exit(1);
});
