// ── QR Code plugin demo ────────────────────────────────────────────────
//
// Variants of @dui-toolkit/plugin-qrcode:
//  1. Default URL (natural size, terminal-default bg)
//  2. Custom fg + bg colors (branded palette)
//  3. Capacity-capped size (`width: 40` → narrow single-char cells)
//  4. Custom string label
//  5. CI/QA variant with showVersion: true
//
// Run with: pnpm --filter examples qrcode   (or `npx tsx 13-qrcode/index.ts`)

import { colors } from "@bdocs/dui";
import { qrcode } from "@dui-toolkit/plugin-qrcode";

console.log(`\n${colors.bold("  📱 @dui-toolkit/plugin-qrcode")}\n`);

// ── 1. Default URL — natural size, transparent bg ─────────────────────
console.log(`${colors.gray("  ─── 1. default URL (natural size) —————————")}\n`);
console.log(await qrcode("https://github.com/bolt-docs/dui"));

// ── 2. Custom fg + bg colors — branded palette ───────────────────────
console.log(
	`\n${colors.gray("  ─── 2. custom fg + bg (brand palette) ————————")}\n`,
);
console.log(
	await qrcode("https://bolt-docs.com/cli/install", {
		color: "#22c55e",
		bgColor: "#0a0a0a",
		margin: 1,
	}),
);

// ── 3. Capacity-capped size — narrow via `width` ──────────────────────
console.log(
	`\n${colors.gray("  ─── 3. narrow render (width: 40) —————————————")}\n`,
);
console.log(
	await qrcode("https://github.com/bolt-docs/dui", {
		width: 40,
		label: false,
	}),
);

// ── 4. Custom string label ────────────────────────────────────────────
console.log(
	`\n${colors.gray("  ─── 4. custom string label ———————————————————")}\n`,
);
console.log(
	await qrcode("https://example.com/login/device", {
		label: "Scan to pair · ABCD-EFGH",
		color: "#22c55e",
	}),
);

// ── 5. Diagnostic / CI variant ────────────────────────────────────────
console.log(
	`\n${colors.gray("  ─── 5. showVersion for diagnostics ————————————")}\n`,
);
console.log(
	await qrcode("https://example.com/login/device", {
		showVersion: true,
		errorCorrection: "H",
		label: true,
	}),
);

console.log(
	`\n${colors.dim("  tip: width / color / bgColor / margin / label; plain ANSI → box(), table(), streams.")}\n`,
);
