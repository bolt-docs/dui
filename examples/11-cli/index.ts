#!/usr/bin/env tsx
/**
 * Example 11: Full CLI Application
 *
 * Combines: colors, boxes, tables, steps, progress, spinner, animation, logger
 *
 * Run: pnpm --filter examples cli
 */

import {
	animateProgress,
	applyStyle,
	box,
	bullet,
	colorize,
	colors,
	createProgressBar,
	createSpinner,
	createTimeline,
	divider,
	error,
	info,
	interpolateColor,
	renderLine,
	renderStatic,
	steps,
	success,
	table,
	tasks,
	warn,
} from "@bdocs/dui";

async function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

// ── Banner ──────────────────────────────────────────────────

function showBanner() {
	const title = applyStyle("  DUI  ", "#6c5ce7", "#2d2b55", ["bold"]);
	const subtitle = applyStyle("  Terminal UI Toolkit  ", "#a29bfe", undefined, [
		"dim",
	]);
	console.log(`\n${title}${subtitle}`);
	console.log(
		box(
			[
				colors.dim("v0.3.0") +
					"  •  " +
					colors.cyan("@bdocs/dui") +
					"  •  " +
					colors.green("30 easing functions") +
					"  •  " +
					colors.yellow("spring physics"),
			],
			{ style: "round", width: 50 },
		),
	);
	console.log("");
}

// ── Features overview ──────────────────────────────────────

function showFeatures() {
	console.log("  " + colors.bold("Features Overview"));
	console.log(
		table(
			["Feature", "Status", "Description"],
			[
				["Colors", "✔", "24-bit color, gradients, chaining"],
				["Boxes", "✔", "Single, double, round borders"],
				["Tables", "✔", "Styled tables with alignment"],
				["Steps", "✔", "Multi-step process visualization"],
				["Progress", "✔", "Animated progress bars"],
				["Spinner", "✔", "Braille spinner animation"],
				["Animation", "✔", "25+ easings, spring, timeline"],
				["Charts", "✔", "Bar, column, line, pie, sparkline"],
				["Markdown", "✔", "Full markdown renderer"],
				["Images", "✔", "ANSI half-block + Kitty protocol"],
				["Prompts", "✔", "Confirm, input, select, multiselect"],
			],
			{
				style: "single",
				colors: {
					header: { fg: "#fff", bg: "#6c5ce7" },
					border: "#a29bfe",
				},
			},
		),
	);
	console.log("");
}

// ── Build pipeline demo ────────────────────────────────────

async function showPipeline() {
	console.log("  " + colors.bold("Build Pipeline Demo"));
	console.log(
		steps([
			{
				label: "Install dependencies",
				status: "running",
				details: "pnpm install",
			},
			{ label: "TypeScript check", status: "pending" },
			{ label: "Run tests", status: "pending" },
			{ label: "Build packages", status: "pending" },
			{ label: "Publish", status: "pending" },
		]),
	);
	console.log("");

	// Animate through the pipeline
	const pipelineSteps = [
		{
			label: "Install dependencies",
			status: "running" as const,
			details: "pnpm install",
		},
		{ label: "TypeScript check", status: "pending" as const },
		{ label: "Run tests", status: "pending" as const },
		{ label: "Build packages", status: "pending" as const },
		{ label: "Publish", status: "pending" as const },
	];

	for (let i = 0; i < pipelineSteps.length; i++) {
		const current = pipelineSteps.map((s, j) => ({
			...s,
			status: (j < i ? "success" : j === i ? "running" : "pending") as
				| "success"
				| "running"
				| "pending",
		}));

		// Overwrite previous steps display
		process.stdout.write("\x1b[5A"); // Move cursor up 5 lines
		console.log(steps(current));

		await sleep(600 + Math.random() * 400);
	}

	// Show final success state
	const finalSteps = pipelineSteps.map((s) => ({
		...s,
		status: "success" as const,
	}));
	process.stdout.write("\x1b[5A");
	console.log(steps(finalSteps));
	console.log(colors.green("  ✓ Pipeline complete!\n"));
}

// ── Animation showcase ─────────────────────────────────────

async function showAnimations() {
	console.log("  " + colors.bold("Animation Showcase"));

	// Multi-bar animation with different easings
	const tl = createTimeline();

	const easings = [
		{ name: "linear", color: "#ff6b6b" },
		{ name: "ease-out", color: "#feca57" },
		{ name: "ease-out-elastic", color: "#48dbfb" },
		{ name: "ease-out-bounce", color: "#ff9ff3" },
	];

	for (const e of easings) {
		tl.add({
			duration: 1000,
			easing: e.name as any,
			onFrame: (p) => {
				const bar =
					colorize("█".repeat(Math.round(p * 25)), e.color) +
					colors.dim("░").repeat(Math.max(0, 25 - Math.round(p * 25)));
				renderLine(`   ${bar}  ${e.name.padEnd(18)}`);
			},
		});
	}

	console.log("");
	const handle = tl.play();
	await sleep(4500);
	handle.stop();
	console.log("");
}

// ── Main ───────────────────────────────────────────────────

async function main() {
	showBanner();
	await sleep(500);
	showFeatures();
	await sleep(500);
	await showPipeline();
	await sleep(500);
	await showAnimations();
	await sleep(500);

	// Final summary
	console.log("  " + colors.bold("Summary"));
	console.log(
		box(
			[
				colors.green("✔") + "  All features demonstrated successfully",
				colors.dim("  Powered by @bdocs/dui") +
					"  " +
					colors.cyan("github.com/bolt-docs/dui"),
			],
			{ style: "round", width: 50, colors: { border: "#6c5ce7" } },
		),
	);
	console.log("");
}

main().catch((err) => {
	error("CLI demo failed", err);
	process.exit(1);
});
