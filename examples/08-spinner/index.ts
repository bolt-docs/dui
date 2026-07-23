/**
 * Example 08: Spinner
 *
 * Shows: createSpinner() with start, update, stop
 *
 * Run: pnpm --filter examples spinner
 */

import { animateProgress, colors, createSpinner } from "@bdocs/dui";

async function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

console.log("\n");
console.log(colors.bold("  ⏳ Spinners"));
console.log(colors.dim("  ────────────\n"));

// ── Simple spinner ───────────────────────────────────────────

async function demo1() {
	const spinner = createSpinner("Loading data...");
	spinner.start();

	for (const msg of ["Connecting...", "Fetching...", "Processing..."]) {
		await sleep(600);
		spinner.update(msg);
	}

	await sleep(400);
	spinner.stop("success", "Data loaded successfully!");
}

// ── Error spinner ────────────────────────────────────────────

async function demo2() {
	const spinner = createSpinner("Running tests...", {
		prefix: "test",
	});
	spinner.start();

	await sleep(1200);
	spinner.update("Testing module A...");
	await sleep(800);
	spinner.update("Testing module B...");
	await sleep(400);

	spinner.stop("fail", "2 tests failed");
}

// ── Spinner with custom frames and colors ────────────────────

async function demo3() {
	const spinner = createSpinner("Deploying...", {
		prefix: colors.cyan("deploy"),
		frames: ["◰", "◳", "◲", "◱"],
	});
	spinner.start();

	await sleep(1000);
	spinner.update("Building...");
	await sleep(1000);
	spinner.update("Uploading...");
	await sleep(800);

	spinner.stop("success", colors.green("Deployed to production"));
}

// ── Animated progress bar ────────────────────────────────────

async function demo4() {
	console.log("\n  Animated bar (progress from 0 to 100%):");
	const bar = createSpinner(colors.dim("0%"), {
		prefix: "progress",
	});
	bar.start();

	animateProgress({
		duration: 2000,
		easing: "ease-out",
		onFrame: (p) => {
			bar.update(colors.bold(`${Math.round(p * 100)}%`));
		},
	});

	await sleep(2100);
	bar.stop("success", colors.green("100% Complete!"));
}

async function main() {
	await demo1();
	console.log("");
	await sleep(300);
	await demo2();
	console.log("");
	await sleep(300);
	await demo3();
	console.log("");
	await sleep(300);
	await demo4();
	console.log("");
}

main().catch(() => process.exit(1));
