/**
 * Example 02: Boxes
 *
 * Shows: box(), double(), single(), round() with titles and colors
 *
 * Run: pnpm --filter examples boxes
 */

import { box, double, single, round, colors } from "@bdocs/dui";

console.log("\n");
console.log(colors.bold("  📦 Boxes & Borders"));
console.log(colors.dim("  ──────────────────\n"));

// ── Default double box ────────────────────────────────────────

console.log("  Default (double) box:");
console.log(
	box(["Hello from DUI!", "This is a default double box."]),
);
console.log("\n");

// ── Single box ────────────────────────────────────────────────

console.log("  Single box:");
console.log(
	single([colors.cyan("Single border style"), "Clean and minimal."]),
);
console.log("\n");

// ── Round box ─────────────────────────────────────────────────

console.log("  Round box:");
console.log(
	round([colors.magenta("Round border style"), "Soft corners."]),
);
console.log("\n");

// ── Box with title ────────────────────────────────────────────

console.log("  Box with title:");
console.log(
	box(["Content inside a titled box.", "Titles appear in the top border."], {
		title: "My Box",
	}),
);
console.log("\n");

// ── Custom width and colors ───────────────────────────────────

console.log("  Custom width + colors:");
console.log(
	box(
		[
			colors.bold("Customization"),
			"Width, padding, and colors are customizable.",
		],
		{
			width: 40,
			padding: 2,
			colors: {
				border: "#6c5ce7",
				title: "#fd79a8",
			},
			title: "Styled",
		},
	),
);
console.log("\n");

// ── Multi-line content ────────────────────────────────────────

console.log("  Multi-line with automatic wrapping:");
console.log(
	double(
		[
			"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
			"Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
		],
		{ width: 50, title: "Long Text" },
	),
);
console.log("\n");

// ── Single box with title ─────────────────────────────────────

console.log("  Single box with title:");
console.log(
	single(
		[
			colors.green("✓") + " Task 1 completed",
			colors.yellow("⋯") + " Task 2 in progress",
			colors.dim("○ Task 3 pending"),
		],
		{ title: "Tasks", width: 40 },
	),
);
console.log("\n");
