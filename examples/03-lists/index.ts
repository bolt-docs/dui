/**
 * Example 03: Lists
 *
 * Shows: bullet(), ordered(), tasks()
 *
 * Run: pnpm --filter examples lists
 */

import { bullet, colors, ordered, tasks } from "@bdocs/dui";

console.log("\n");
console.log(colors.bold("  📋 Lists"));
console.log(colors.dim("  ──────────\n"));

// ── Bullet list ──────────────────────────────────────────────

console.log("  Bullet list:");
console.log(
	bullet([
		"Install DUI with your favorite package manager",
		"Import the components you need",
		"Build beautiful terminal interfaces",
		"Share with the community",
	]),
);
console.log("\n");

// ── Ordered list ─────────────────────────────────────────────

console.log("  Ordered list:");
console.log(
	ordered([
		"Clone the repository",
		"Install dependencies with pnpm",
		"Run the build script",
		"Start the development server",
	]),
);
console.log("\n");

// ── Task list ────────────────────────────────────────────────

console.log("  Task list (check/cross):");
console.log(
	tasks([
		{ label: "Write documentation", done: true },
		{ label: "Add unit tests", done: true },
		{ label: "Review pull request", done: false },
		{ label: "Deploy to production", done: false },
	]),
);
console.log("\n");
