#!/usr/bin/env node
/**
 * Typecheck every workspace package with `tsc --noEmit`.
 *
 * Exists so CI catches a type error the way a local `pnpm test` cannot:
 * vitest transpiles without typechecking, so a broken type sails through
 * the whole suite and only surfaces at build or publish time.
 *
 * Every package under packages/ must have a tsconfig.json — the script
 * fails loudly if one is missing rather than skipping it, because a
 * package without a tsconfig is silently exempt from the gate. `dui-tui`
 * shipped for several releases in exactly that state.
 *
 * Per-package, not `tsc -b`: the packages reference each other through
 * `dist/` rather than source, so a project-references build would need
 * the build to have run first. This runs on src/ alone and needs nothing.
 *
 * Run: pnpm typecheck
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PACKAGES_DIR = join(ROOT, "packages");

/** Packages that are not published libraries and have no tsconfig. */
const SKIP = new Set(["examples"]);

function findPackages() {
	return readdirSync(PACKAGES_DIR, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && !SKIP.has(entry.name))
		.map((entry) => entry.name)
		.sort();
}

const packages = findPackages();
const failures = [];
const missingConfig = [];

console.log(`Typechecking ${packages.length} packages\n`);

for (const name of packages) {
	const cwd = join(PACKAGES_DIR, name);

	if (!existsSync(join(cwd, "tsconfig.json"))) {
		missingConfig.push(name);
		console.log(`  SKIP  ${name}  (no tsconfig.json)`);
		continue;
	}

	// Invoke tsc through node directly rather than npx: npx re-validates
	// .npmrc config on every call and floods the output with warnings, and
	// it can silently reach the network for a missing binary. pnpm hoists
	// typescript to the workspace root, so the path is stable.
	const result = spawnSync(
		process.execPath,
		[join(ROOT, "node_modules/typescript/bin/tsc"), "--noEmit"],
		{ cwd, stdio: "inherit" },
	);

	if (result.status === 0) {
		console.log(`  PASS  ${name}`);
	} else {
		console.log(`  FAIL  ${name}`);
		failures.push(name);
	}
}

console.log("");

if (missingConfig.length > 0) {
	console.error(
		`Missing tsconfig.json in: ${missingConfig.join(", ")}\n` +
			"Every package must be typechecked. Add a tsconfig.json modeled on\n" +
			"the other plugins, or add the package to SKIP here if it is not a\n" +
			"published library.",
	);
}

if (failures.length > 0) {
	console.error(`Typecheck failed in: ${failures.join(", ")}`);
	process.exit(1);
}

if (missingConfig.length > 0) {
	process.exit(1);
}

console.log(`All ${packages.length} packages typecheck.`);
