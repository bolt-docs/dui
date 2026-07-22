#!/usr/bin/env tsx
/**
 * Example 15: Mouse-Enabled Multiselect
 *
 * Shows: multiselect() with mouse click support
 *
 * Run: pnpm --filter examples 15-mouse-multiselect
 *
 * Note: This is an interactive prompt. It will wait for your input.
 * Mouse support requires a terminal with SGR 1006 protocol support
 * (most modern terminals: iTerm2, VS Code terminal, Kitty, Alacritty, etc.)
 *
 * Interaction:
 * - Click on a choice to toggle selection
 * - Use ↑↓ arrows + Space to navigate and toggle
 * - Press Enter to confirm
 * - Press Esc to cancel
 */

import { multiselect, colors, success, info } from "@bdocs/dui";

console.log("\n");
console.log(colors.bold("  🖱️  Mouse-Enabled Multiselect"));
console.log(colors.dim("  ──────────────────────────────\n"));

console.log(colors.dim("  (This example requires interactive input)"));
console.log(colors.dim("  Click on choices to toggle, or use ↑↓ + Space\n"));

async function main() {
	// Basic multiselect with mouse support
	const colorsPicked = await multiselect("Choose your theme colors:", {
		choices: [
			{ label: "Red", value: "#ff0000" },
			{ label: "Green", value: "#00cc66" },
			{ label: "Blue", value: "#3399ff" },
			{ label: "Yellow", value: "#ffff00" },
			{ label: "Purple", value: "#aa00ff" },
			{ label: "Cyan", value: "#00ffff" },
			{ label: "Orange", value: "#ff8800" },
			{ label: "Pink", value: "#ff00aa" },
		],
		pageSize: 5,
		colors: {
			pointer: "#ff8800",
			checked: "#00ff88",
		},
	});

	success(`Selected colors: ${colors.bold(colorsPicked.join(", "))}`);

	// Multiselect with pre-checked and disabled options
	const features = await multiselect("Select features to enable:", {
		choices: [
			{ label: "Authentication", value: "auth", checked: true },
			{ label: "Database", value: "db", checked: true },
			{ label: "Caching", value: "cache" },
			{ label: "Real-time", value: "realtime" },
			{ label: "Analytics", value: "analytics", disabled: true },
			{ label: "Search", value: "search" },
			{ label: "Webhooks", value: "webhooks" },
			{ label: "SSO", value: "sso" },
		],
		pageSize: 5,
		required: true,
	});

	success(`Enabled features: ${colors.bold(features.join(", "))}`);

	// Multiselect with non-string values
	const frameworks = await multiselect("Pick frontend frameworks:", {
		choices: [
			{ label: "React", value: { name: "React", stars: 200000 } },
			{ label: "Vue", value: { name: "Vue", stars: 190000 } },
			{ label: "Svelte", value: { name: "Svelte", stars: 50000 } },
			{ label: "Solid", value: { name: "Solid", stars: 30000 } },
			{ label: "Qwik", value: { name: "Qwik", stars: 15000 } },
			{ label: "Astro", value: { name: "Astro", stars: 40000 } },
		],
	});

	const names = frameworks.map((f: any) => f.name).join(", ");
	success(`Frameworks: ${colors.bold(names)}`);

	// Tips
	console.log("\n");
	info("Tips:");
	console.log(colors.dim("  • Click on any choice to toggle selection"));
	console.log(colors.dim("  • Use ↑↓ arrows to navigate, Space to toggle"));
	console.log(colors.dim("  • Press Enter to confirm, Esc to cancel"));
	console.log(colors.dim("  • Disabled items (gray) cannot be selected"));
}

main().catch(() => process.exit(1));
