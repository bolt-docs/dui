#!/usr/bin/env node
/**
 * Inline each package's version into the built output.
 *
 * The plugins read their own version from package.json at import time:
 *
 * ```ts
 * export const DUI_VERSION: string = JSON.parse(
 *   readFileSync(new URL("../package.json", import.meta.url), "utf8"),
 * ).version;
 * ```
 *
 * That is the correct source of truth, but it has two costs:
 *
 * 1. It breaks single-file binaries. `new URL("../package.json", …)`
 *    resolves against the module's file URL, and under
 *    `bun build --compile`, `node --experimental-sea`, `pkg` or
 *    `deno compile` there is no such path. The read throws at *import*
 *    time, which takes down the whole CLI — not just the plugin.
 * 2. It is an unremovable top-level side effect whose result escapes into
 *    an exported binding, so no bundler can drop the module. It also
 *    forces `node:fs` into the graph.
 *
 * So the source keeps reading package.json, and this script rewrites the
 * *built* file to a literal. The advertised version is still whatever
 * changesets wrote to package.json — it is just resolved at build time
 * instead of import time.
 *
 * Run: pnpm sync-versions   (after pnpm build; wired into the build task)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PACKAGES_DIR = join(ROOT, "packages");

/** Every published package whose dist carries a package.json read. */
const PACKAGES = [
	"dui",
	"dui-chart",
	"dui-diff",
	"dui-image",
	"dui-markdown",
	"dui-notify",
	"dui-qrcode",
	"dui-tui",
];

/**
 * The read itself, tolerant of how it is used.
 *
 * Two shapes ship today: hoisted into a local const in most plugins, and
 * inlined straight into the object literal in dui-image and dui-qrcode,
 * where rolldown folds the `const pkgVersion` away as single-use. Matching
 * the inner expression covers both.
 */
const PATTERN =
	/JSON\.parse\(\s*readFileSync\(\s*new URL\(\s*"\.\.\/package\.json",\s*import\.meta\.url\s*\),\s*"utf8",?\s*\),?\s*\)\.version/g;

let rewritten = 0;
const problems = [];

for (const pkg of PACKAGES) {
	const distPath = join(PACKAGES_DIR, pkg, "dist", "index.mjs");
	const pkgPath = join(PACKAGES_DIR, pkg, "package.json");

	let dist;
	let version;
	try {
		dist = readFileSync(distPath, "utf8");
		version = JSON.parse(readFileSync(pkgPath, "utf8")).version;
	} catch (err) {
		problems.push(`${pkg}: cannot read build output (${err.message})`);
		continue;
	}

	PATTERN.lastIndex = 0;
	if (!PATTERN.test(dist)) {
		// Already inlined by a previous run, or the pattern moved.
		if (dist.includes(JSON.stringify(version))) {
			console.log(`  ok    ${pkg} (already inlined)`);
			continue;
		}
		problems.push(
			`${pkg}: no package.json read found in dist/index.mjs — ` +
				"the version pattern changed and this script needs updating",
		);
		continue;
	}

	PATTERN.lastIndex = 0;
	let next = dist.replace(PATTERN, JSON.stringify(version));

	if (next === dist) {
		problems.push(`${pkg}: rewrite produced no change`);
		continue;
	}

	// The read is gone, so the named import is dead weight. Drop it when
	// nothing else in the file calls the *imported* symbol — dui-diff and
	// the core logger legitimately read files, and dui-image reaches
	// readFileSync through a lazy namespace import, so this must check the
	// call sites rather than the word. An unused `node:fs` import also
	// keeps a built-in reachable that a bundle would otherwise shake.
	const IMPORT_RE = /^import \{ readFileSync \} from ["']node:fs["'];\n/m;
	if (IMPORT_RE.test(next)) {
		const candidate = next.replace(IMPORT_RE, "");
		// `\b` around the name so a `getFs().readFileSync` or
		// `nodeFs.readFileSync` member access is not mistaken for a call to
		// the removed import. Only bare calls count.
		const bareCalls = candidate.match(/(?<![.\w])readFileSync\s*\(/g);
		if (!bareCalls) next = candidate;
	}

	writeFileSync(distPath, next);
	console.log(`  inlined ${pkg} → ${version}`);
	rewritten++;
}

console.log("");

if (problems.length > 0) {
	console.error("Version inlining incomplete:");
	for (const p of problems) console.error(`  - ${p}`);
	process.exit(1);
}

console.log(
	rewritten === 0
		? "Nothing to inline (all already inlined)."
		: `Inlined ${rewritten} package version(s).`,
);
