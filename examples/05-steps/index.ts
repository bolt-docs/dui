/**
 * Example 05: Steps
 *
 * Shows: steps() with different statuses — pending, running, success, error
 *
 * Run: pnpm --filter examples steps
 */

import { steps, colors } from "@bdocs/dui";

console.log("\n");
console.log(colors.bold("  👣 Steps / Multi-step Process"));
console.log(colors.dim("  ──────────────────────────────\n"));

// ── Build pipeline ───────────────────────────────────────────

console.log("  Build pipeline:");
console.log(
	steps([
		{ label: "Install dependencies", status: "success" },
		{ label: "Lint code", status: "success" },
		{ label: "Run tests", status: "running", details: "47/52 tests passed" },
		{ label: "Build package", status: "pending" },
		{ label: "Deploy", status: "pending" },
	]),
);
console.log("\n");

// ── Deployment steps ─────────────────────────────────────────

console.log("  Deployment with error:");
console.log(
	steps([
		{ label: "Check environment", status: "success" },
		{ label: "Build artifacts", status: "error", details: "TypeScript compilation failed" },
		{ label: "Run migrations", status: "pending" },
		{ label: "Deploy to production", status: "pending" },
	]),
);
console.log("\n");

// ── CI/CD pipeline ───────────────────────────────────────────

console.log("  CI/CD Pipeline (all green):");
console.log(
	steps([
		{ label: "Checkout", status: "success", details: "git pull origin main" },
		{ label: "Setup Node", status: "success", details: "v20.11.0" },
		{ label: "Install", status: "success", details: "pnpm install (2.3s)" },
		{ label: "Lint & Format", status: "success", details: "Biome check passed" },
		{ label: "Test", status: "success", details: "210 tests passed" },
		{ label: "Build", status: "success", details: "3 packages built" },
		{ label: "Publish", status: "success", details: "Published v0.3.0" },
	]),
);
console.log("\n");
