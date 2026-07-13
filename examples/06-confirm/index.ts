/**
 * Example 06: Confirm
 *
 * Shows: confirm() prompt with different messages
 *
 * Run: pnpm --filter examples confirm
 *
 * Note: This is an interactive prompt. It will wait for your input.
 */

import { confirm, colors, info, success, error } from "@bdocs/dui";

console.log("\n");
console.log(colors.bold("  ❓ Confirm Prompts"));
console.log(colors.dim("  ────────────────────\n"));

console.log(colors.dim("  (This example requires interactive input)\n"));

async function main() {
	// Simple confirm
	const answer1 = await confirm("Do you want to proceed?", true);
	if (answer1) {
		success("Proceeding with the operation...");
	} else {
		info("Operation cancelled by user.");
	}

	// Another confirm
	const answer2 = await confirm("Deploy to production?", false);
	if (answer2) {
		success("Deploying to production...");
	} else {
		info("Deploy skipped.");
	}

	// Confirms with explicit options
	const answer3 = await confirm("Continue?", {
		default: true,
	});

	if (answer3) {
		success("Continuing...");
	}
}

main().catch(() => process.exit(1));
