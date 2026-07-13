/**
 * Example 01: Colors & Gradients
 *
 * Shows: colorize, interpolateColor, colors chaining, gradient bars
 *
 * Run: pnpm --filter examples colors
 */

import {
	colors,
	colorize,
	interpolateColor,
	applyStyle,
} from "@bdocs/dui";

console.log("\n");
console.log(colors.bold("  🎨 Colors & Gradients"));
console.log(colors.dim("  ──────────────────────\n"));

// ── Basic colors ──────────────────────────────────────────────

console.log("  Named colors:");
console.log(`  ${colors.red("red")} ${colors.green("green")} ${colors.blue("blue")}`);
console.log(`  ${colors.yellow("yellow")} ${colors.cyan("cyan")} ${colors.magenta("magenta")}`);
console.log(`  ${colors.bold("bold")} ${colors.dim("dim")} ${colors.italic("italic")}`);
console.log(`  ${colors.underline("underline")} ${colors.inverse("inverse")}\n`);

// ── Chaining ─────────────────────────────────────────────────

console.log("  Chained styles:");
console.log(`  ${colors.bold.red("bold red")}`);
console.log(`  ${colors.bold.blue.italic("bold blue italic")}`);
console.log(`  ${colors.underline.green("underline green")}`);
console.log(`  ${colors.bold.yellow.bgBlack("bold yellow on black")}\n`);

// ── colorize ──────────────────────────────────────────────────

console.log("  colorize() with hex:");
console.log(`  ${colorize("foreground text", "#ff6b6b")}`);
console.log(`  ${colorize("background fill", "#4ecdc4", "bg")}`);
console.log(`  ${colorize("both colors", "#ffe66d", "bg")} ${colorize("inline", "#1a535c")}\n`);

// ── applyStyle ────────────────────────────────────────────────

console.log("  applyStyle():");
console.log(`  ${applyStyle("bold + color", "#ff6b6b", undefined, ["bold"])}`);
console.log(`  ${applyStyle("bold + italic + color", "#4ecdc4", undefined, ["bold", "italic"])}\n`);

// ── Gradient interpolation ────────────────────────────────────

console.log("  Gradient bar (red → yellow → green → blue):");

const gradientSteps = [
	{ start: "#ff4444", end: "#ffdd44" },
	{ start: "#ffdd44", end: "#44dd44" },
	{ start: "#44dd44", end: "#4488ff" },
];

for (let row = 0; row < 4; row++) {
	let line = "   ";
	for (let i = 0; i < 60; i++) {
		const t = i / 60;
		const segment = t * gradientSteps.length;
		const segIdx = Math.min(Math.floor(segment), gradientSteps.length - 1);
		const localT = segment - segIdx;
		const seg = gradientSteps[segIdx];
		const color = interpolateColor(seg.start, seg.end, localT);
		line += colorize("█", color);
	}
	console.log(line);
}
console.log("\n");

// ── Color palette grid ────────────────────────────────────────

console.log("  Color palette (24-bit sampled):");

const hues = [0, 30, 60, 120, 180, 240, 300];
for (let row = 0; row < 3; row++) {
	let line = "   ";
	for (const hue of hues) {
		const lightness = row === 0 ? 50 : row === 1 ? 65 : 35;
		// Approximate HSL → hex
		const c = 30;
		const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
		const m = lightness / 100 - c / 255;
		let r = 0, g = 0, b = 0;
		if (hue < 60) { r = c; g = x; }
		else if (hue < 120) { r = x; g = c; }
		else if (hue < 180) { g = c; b = x; }
		else if (hue < 240) { g = x; b = c; }
		else if (hue < 300) { r = x; b = c; }
		else { r = c; b = x; }
		const hex = `#${((r + m * 255) | 0).toString(16).padStart(2, "0")}${((g + m * 255) | 0).toString(16).padStart(2, "0")}${((b + m * 255) | 0).toString(16).padStart(2, "0")}`;
		line += colorize("████ ", hex);
	}
	console.log(line);
}
console.log("\n");
