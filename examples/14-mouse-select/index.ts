#!/usr/bin/env tsx
/**
 * Example 14: Mouse-Enabled Select
 *
 * Shows: select() with mouse click support
 *
 * Run: pnpm --filter examples 14-mouse-select
 *
 * Note: This is an interactive prompt. It will wait for your input.
 * Mouse support requires a terminal with SGR 1006 protocol support
 * (most modern terminals: iTerm2, VS Code terminal, Kitty, Alacritty, etc.)
 */

import { colors, info, select, success } from "@bdocs/dui";

console.log("\n");
console.log(colors.bold("  🖱️  Mouse-Enabled Select"));
console.log(colors.dim("  ────────────────────────\n"));

console.log(colors.dim("  (This example requires interactive input)"));
console.log(colors.dim("  Use ↑↓ arrows OR click with mouse to select\n"));

async function main() {
	// Basic select with mouse support
	const framework = await select("Choose your framework:", {
		choices: [
			{ label: "React", value: "react" },
			{ label: "Vue", value: "vue" },
			{ label: "Svelte", value: "svelte" },
			{ label: "Solid", value: "solid" },
			{ label: "Qwik", value: "qwik" },
			{ label: "Astro", value: "astro" },
			{ label: "Next.js", value: "nextjs" },
			{ label: "Remix", value: "remix" },
		],
		pageSize: 5,
	});

	success(`You selected: ${colors.bold(framework)}`);

	// Select with disabled option
	const color = await select("Pick a color:", {
		choices: [
			{ label: "Red", value: "#ff0000" },
			{ label: "Green", value: "#00cc66" },
			{ label: "Blue", value: "#3399ff" },
			{ label: "Yellow (disabled)", value: "#ffff00", disabled: true },
			{ label: "Purple", value: "#aa00ff" },
			{ label: "Cyan", value: "#00ffff" },
			{ label: "Orange", value: "#ff8800" },
			{ label: "Pink", value: "#ff00aa" },
		],
		pageSize: 6,
		colors: {
			pointer: "#ff8800",
			selected: "#00ff88",
		},
	});

	success(`Your color: ${colors.bold(color)}`);

	// Select with non-string values
	const size = await select("Select T-shirt size:", {
		choices: [
			{ label: "Small", value: "S" },
			{ label: "Medium", value: "M" },
			{ label: "Large", value: "L" },
			{ label: "Extra Large", value: "XL" },
		],
	});

	success(`Size: ${colors.bold(size)}`);

	// Select with keyboard navigation tip
	console.log("\n");
	info("Tip: You can also navigate with ↑↓ arrows and press Enter to confirm");
}

main().catch(() => process.exit(1));
