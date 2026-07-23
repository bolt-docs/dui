/**
 * Example 07: Progress Bars
 *
 * Shows: createProgressBar() with different configurations
 *
 * Run: pnpm --filter examples progress
 */

import { colors, createProgressBar } from "@bdocs/dui";

console.log("\n");
console.log(colors.bold("  📈 Progress Bars"));
console.log(colors.dim("  ──────────────────\n"));

async function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

// ── Simple download progress ─────────────────────────────────

async function demo1() {
	console.log("  Download simulation:");
	const bar = createProgressBar({
		prefix: "Loading",
		width: 30,
	});

	bar.start(100);
	for (let i = 0; i <= 100; i += 5) {
		bar.update(i, `${i}%`);
		await sleep(80);
	}
	bar.stop("Done!");
}

// ── Custom styled progress ───────────────────────────────────

async function demo2() {
	console.log("  Custom styled bar:");
	const bar = createProgressBar({
		prefix: colors.cyan("Build"),
		suffix: "v2.0.0",
		width: 25,
		barChar: "━",
		emptyChar: "─",
		color: "#6c5ce7",
	});

	bar.start(100);
	for (let i = 0; i <= 100; i += 2) {
		bar.update(i, i < 50 ? "Compiling..." : "Linking...");
		await sleep(60);
	}
	bar.stop(colors.green("Build complete"));
}

// ── Multiple sequential bars ─────────────────────────────────

async function demo3() {
	console.log("  Multi-step pipeline:");

	const stages = [
		{ name: "Install", color: "#ff6b6b", ms: 40 },
		{ name: "Lint", color: "#feca57", ms: 30 },
		{ name: "Test", color: "#48dbfb", ms: 50 },
		{ name: "Build", color: "#ff9ff3", ms: 35 },
		{ name: "Deploy", color: "#54a0ff", ms: 45 },
	];

	for (const stage of stages) {
		const bar = createProgressBar({
			prefix: stage.name,
			width: 20,
			color: stage.color as any,
		});
		bar.start(100);
		for (let i = 0; i <= 100; i += 10) {
			bar.update(i);
			await sleep(stage.ms);
		}
		bar.stop(colors.green("✓"));
	}
}

async function main() {
	await demo1();
	console.log("\n");
	await sleep(500);
	await demo2();
	console.log("\n");
	await sleep(500);
	await demo3();
	console.log("\n");
}

main().catch(() => process.exit(1));
