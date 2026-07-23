/**
 * Example 10: Image Rendering
 *
 * Shows: renderAnsi() from @dui-toolkit/plugin-image
 *        With different options: width, dithering, bgColor
 *
 * Run: pnpm --filter examples image
 *
 * Note: Generates minimal PNG images programmatically.
 *       Works best with 24-bit color terminals.
 */

import { readFile } from "node:fs/promises";
import { box, colors } from "@bdocs/dui";
import { createGradientPng, createMinimalPng } from "./helpers.js";

async function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

async function main() {
	console.log("\n");
	console.log(colors.bold("  🖼️  Image Rendering"));
	console.log(colors.dim("  ───────────────────\n"));

	const { renderAnsi, detectTerminal } = await import(
		"@dui-toolkit/plugin-image"
	);

	const caps = detectTerminal();
	console.log(
		`  Terminal: ${colors.dim(`${caps.columns}×${caps.rows}`)} | ${colors.cyan(caps.bestFormat)} format available\n`,
	);

	await sleep(500);

	// ── Render solid color image ──────────────────────────────

	console.log("  Solid color (30 columns):");
	const redPng = createMinimalPng(255, 80, 80, 30, 20);
	const solid = await renderAnsi(redPng, { width: 30 });
	console.log(box([solid], { style: "single", width: 32 }));
	console.log("\n");

	// ── Render multi-color gradient ───────────────────────────

	console.log("  Horizontal gradient (40 columns):");
	const gradientPng = createGradientPng(40, 16);
	const gradient = await renderAnsi(gradientPng, { width: 40 });
	console.log(box([gradient], { style: "single", width: 42 }));
	console.log("\n");

	// ── Render with dithering ─────────────────────────────────

	console.log("  With dithering enabled:");
	const dithered = await renderAnsi(gradientPng, { width: 40, dither: true });
	console.log(box([dithered], { style: "single", width: 42 }));
	console.log("\n");

	// ── Render actual image file ───────────────────────────────

	console.log("  Actual image (image.jpeg):");
	const imageBuffer = await readFile(new URL("./image.jpeg", import.meta.url));
	const actualImage = await renderAnsi(imageBuffer, { width: 40 });
	console.log(box([actualImage], { style: "single", width: 42 }));
	console.log("\n");

	// ── Render with dark background ───────────────────────────

	console.log("  Dark background override:");
	const darkBg = await renderAnsi(redPng, {
		width: 30,
		bgColor: "#1a1a2e",
	});
	console.log(box([darkBg], { style: "round", width: 32 }));
	console.log("\n");

	console.log(colors.dim("  Image rendering via sharp + ANSI half-blocks"));
	console.log(colors.dim(`  Terminal: ${caps.bestFormat}`));
	console.log("");
}

main().catch((err) => {
	console.error(colors.red("Error:"), err);
	process.exit(1);
});
