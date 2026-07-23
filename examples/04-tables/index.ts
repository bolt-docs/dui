/**
 * Example 04: Tables
 *
 * Shows: table() with different styles and options
 *
 * Run: pnpm --filter examples tables
 */

import { colors, table } from "@bdocs/dui";

console.log("\n");
console.log(colors.bold("  📊 Tables"));
console.log(colors.dim("  ──────────\n"));

// ── Single border table ──────────────────────────────────────

console.log("  Single border table:");
console.log(
	table(
		["Name", "Role", "Status"],
		[
			["Alice", "Developer", "Active"],
			["Bob", "Designer", "Active"],
			["Charlie", "Manager", "On Leave"],
			["Diana", "Developer", "Active"],
		],
		{ style: "single" },
	),
);
console.log("\n");

// ── Double border table ──────────────────────────────────────

console.log("  Double border table:");
console.log(
	table(
		["Package", "Version", "Size"],
		[
			["@bdocs/dui", "0.3.0", "24kB"],
			["@dui-toolkit/plugin-chart", "0.2.0", "12kB"],
			["@dui-toolkit/plugin-markdown", "0.2.0", "18kB"],
			["@dui-toolkit/plugin-image", "0.1.0", "15kB"],
		],
		{ style: "double" },
	),
);
console.log("\n");

// ── Round border with custom colors ──────────────────────────

console.log("  Round border with custom colors:");
console.log(
	table(
		["Metric", "Value", "Change"],
		[
			["Downloads", "12,345", "+12%"],
			["Stars", "567", "+5%"],
			["Issues", "23", "-8%"],
			["Contributors", "42", "+3%"],
		],
		{
			style: "round",
			colors: {
				header: { fg: "#fff", bg: "#6c5ce7" },
				border: "#a29bfe",
			},
		},
	),
);
console.log("\n");

// ── No borders ───────────────────────────────────────────────

console.log("  No borders (plain):");
console.log(
	table(
		["Tool", "Speed"],
		[
			["DUI", "Fast"],
			["Chalk", "Medium"],
			["Ink", "Medium"],
		],
		{ style: "none" },
	),
);
console.log("\n");

// ── Column alignment ─────────────────────────────────────────

console.log("  Column alignment (left, center, right):");
console.log(
	table(
		["Left", "Center", "Right"],
		[
			["Alpha", "Beta", "Gamma"],
			["Delta", "Epsilon", "Zeta"],
			["Eta", "Theta", "Iota"],
		],
		{
			style: "single",
			columns: [{ align: "left" }, { align: "center" }, { align: "right" }],
		},
	),
);
console.log("\n");
