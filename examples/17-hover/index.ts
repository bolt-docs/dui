#!/usr/bin/env tsx
/**
 * Example 17: Hover Effects
 *
 * Shows: select(), multiselect(), tree() with hover highlighting
 *
 * Run: pnpm --filter examples 17-hover
 *
 * Note: This is an interactive prompt. It will wait for your input.
 * Hover support requires a terminal with SGR 1003 (any-event tracking).
 * Most modern terminals support this (iTerm2, Kitty, Alacritty, etc.)
 */

import {
	colors,
	defineClass,
	info,
	multiselect,
	select,
	success,
	tree,
} from "@bdocs/dui";

console.log("\n");
console.log(colors.bold("  🖱️  Hover Effects Demo"));
console.log(colors.dim("  ──────────────────────\n"));

console.log(
	colors.dim("  Hover over items with your mouse to see highlights!"),
);
console.log(colors.dim("  Use ↑↓ arrows OR click with mouse to select\n"));

// Customize the hover class for this demo
defineClass("hover", { bg: "#1e3a5f", fg: "#60a5fa" });

async function main() {
	// --- Select with hover ---
	const framework = await select("Choose a framework:", {
		choices: [
			{ label: "React", value: "react" },
			{ label: "Vue", value: "vue" },
			{ label: "Svelte", value: "svelte" },
			{ label: "Solid", value: "solid" },
			{ label: "Qwik", value: "qwik" },
			{ label: "Astro", value: "astro" },
		],
		pageSize: 6,
	});

	success(`Selected: ${colors.bold(framework)}\n`);

	// --- Multiselect with hover ---
	const colors_ = await multiselect("Pick colors:", {
		choices: [
			{ label: "Red", value: "red" },
			{ label: "Green", value: "green" },
			{ label: "Blue", value: "blue" },
			{ label: "Yellow", value: "yellow" },
			{ label: "Purple", value: "purple" },
			{ label: "Orange", value: "orange" },
		],
		pageSize: 6,
	});

	success(`Chosen: ${colors.bold(colors_.join(", "))}\n`);

	// --- Tree with hover ---
	const item = await tree("Browse items:", {
		tree: [
			{
				label: "Documents",
				children: [
					{ label: "resume.pdf", value: "resume" },
					{ label: "notes.txt", value: "notes" },
				],
			},
			{
				label: "Images",
				children: [
					{ label: "photo.jpg", value: "photo" },
					{ label: "screenshot.png", value: "screenshot" },
				],
			},
			{ label: "README.md", value: "readme" },
		],
	});

	if (item) {
		success(`Opened: ${colors.bold(item)}`);
	}

	info("Tip: The hover style can be customized with defineClass('hover', ...)");
}

main().catch(() => process.exit(1));
