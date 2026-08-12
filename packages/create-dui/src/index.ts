/**
 * create-dui — scaffold a CLI project pre-wired with `@bdocs/dui`.
 *
 * The scaffolder itself is built on `@bdocs/dui` (dogfooding): the
 * interactive CLI asks the questions with `input`/`select`/`multiselect`,
 * and the work runs under `task()`. The programmatic `scaffold()`
 * export takes explicit options so scripts, tests and CI can generate
 * projects without a TTY.
 *
 * @example
 * ```ts
 * import { scaffold } from "create-dui"
 *
 * await scaffold({
 *   targetDir: "./my-cli",
 *   name: "my-cli",
 *   packageManager: "pnpm",
 *   features: ["prompts", "table"],
 * })
 * ```
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
	banner,
	box,
	input,
	multiselect,
	select,
	task,
	type ColorStyle,
} from "@bdocs/dui";
import {
	renderGitignore,
	renderIndex,
	renderPackageJson,
	renderReadme,
	renderTsconfig,
	type TemplateContext,
} from "./templates";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export interface ScaffoldFeature {
	/** Example prompts (input/select) in the generated entry. */
	prompts: boolean;
	/** Example table in the generated entry. */
	table: boolean;
}

export interface ScaffoldOptions {
	/** Directory to create the project in (must not exist or be empty). */
	targetDir: string;
	/** npm package name for the new CLI. */
	name: string;
	/** Package manager hints written into the README. @default "npm" */
	packageManager?: PackageManager;
	/** Which example sections to include. @default all on */
	features?: Partial<ScaffoldFeature>;
	/** Write the files (default) or only report what would be written. */
	dryRun?: boolean;
}

export interface ScaffoldResult {
	/** Absolute path of the created project. */
	dir: string;
	/** Files written (relative to `targetDir`). */
	files: string[];
}

function assertValidName(name: string): void {
	if (!/^[a-z0-9][a-z0-9-_]*$/i.test(name)) {
		throw new Error(
			`"${name}" is not a valid package name — use letters, numbers, dashes and underscores only.`,
		);
	}
}

const FILE_TEMPLATES = (
	ctx: TemplateContext,
): Array<[string, string]> => [
	["package.json", renderPackageJson(ctx)],
	["tsconfig.json", renderTsconfig()],
	["src/index.ts", renderIndex(ctx)],
	["README.md", renderReadme(ctx)],
	[".gitignore", renderGitignore()],
];

/**
 * Generate a CLI project in `targetDir`. Prompts are NOT involved —
 * pass explicit options. Resolves with the written files.
 */
export async function scaffold(
	options: ScaffoldOptions,
): Promise<ScaffoldResult> {
	const name = options.name.trim();
	assertValidName(name);

	const targetDir = path.resolve(options.targetDir);
	if (!options.dryRun && fs.existsSync(targetDir)) {
		const entries = fs.readdirSync(targetDir);
		if (entries.length > 0) {
			throw new Error(
				`Target directory ${targetDir} already exists and is not empty.`,
			);
		}
	}

	const ctx: TemplateContext = {
		name,
		packageManager: options.packageManager ?? "npm",
		withPrompts: options.features?.prompts ?? true,
		withTable: options.features?.table ?? true,
	};

	if (options.dryRun) {
		return {
			dir: targetDir,
			files: FILE_TEMPLATES(ctx).map(([file]) => file),
		};
	}

	const files: string[] = [];
	for (const [rel, content] of FILE_TEMPLATES(ctx)) {
		const full = path.join(targetDir, rel);
		fs.mkdirSync(path.dirname(full), { recursive: true });
		fs.writeFileSync(full, content, "utf8");
		files.push(rel);
	}
	return { dir: targetDir, files };
}

/* ── Interactive CLI ─────────────────────────────────────────── */

export interface CliFlags {
	name?: string;
	packageManager?: PackageManager;
	help?: boolean;
	yes?: boolean;
	noPrompts?: boolean;
	noTable?: boolean;
}

/** Parse `process.argv.slice(2)` into flags (and a positional dir). */
export function parseArgs(
	argv: string[],
): { flags: CliFlags; positionals: string[] } {
	const flags: CliFlags = {};
	const positionals: string[] = [];
	for (const arg of argv) {
		if (arg === "--help" || arg === "-h") flags.help = true;
		else if (arg === "--yes" || arg === "-y") flags.yes = true;
		else if (arg === "--no-prompts") flags.noPrompts = true;
		else if (arg === "--no-table") flags.noTable = true;
		else if (arg === "--name" || arg === "-n") {
			// value consumed on the next iteration
			const idx = argv.indexOf(arg);
			flags.name = argv[idx + 1];
		} else if (arg === "--package-manager" || arg === "-p") {
			const idx = argv.indexOf(arg);
			const v = argv[idx + 1] as PackageManager | undefined;
			if (v && ["npm", "pnpm", "yarn", "bun"].includes(v)) {
				flags.packageManager = v;
			}
		} else if (arg.startsWith("--name=")) {
			flags.name = arg.slice("--name=".length);
		} else if (arg.startsWith("--package-manager=")) {
			const v = arg.slice("--package-manager=".length) as PackageManager;
			if (["npm", "pnpm", "yarn", "bun"].includes(v)) {
				flags.packageManager = v;
			}
		} else {
			positionals.push(arg);
		}
	}
	return { flags, positionals };
}

const HELP_TEXT = `create-dui — scaffold a CLI project with @bdocs/dui

Usage:
  create-dui [dir] [options]

Options:
  -n, --name <name>             package name (default: folder name)
  -p, --package-manager <pm>    npm | pnpm | yarn | bun
  -y, --yes                     skip prompts, use defaults
      --no-prompts              omit the input/select example
      --no-table                omit the table example
  -h, --help                    show this help

Examples:
  create-dui my-cli
  create-dui --yes --package-manager pnpm
`;

/**
 * The interactive CLI entry (`create-dui` bin). Prompts via @bdocs/dui
 * widgets, then scaffolds.
 */
export async function main(
	argv: string[] = process.argv.slice(2),
): Promise<ScaffoldResult | undefined> {
	const { flags, positionals } = parseArgs(argv);

	if (flags.help) {
		console.log(HELP_TEXT);
		return undefined;
	}

	const cwdName = path.basename(process.cwd()).toLowerCase().replace(/\s+/g, "-");
	const targetArg = positionals[0];
	const targetDir = path.resolve(targetArg ?? ".");
	const defaultName = targetArg ?? cwdName;

	console.log(banner("DUI", { color: "cyan", fill: "#" }));
	console.log(
		box(["Let's scaffold a CLI with @bdocs/dui"], { title: "create-dui", width: 52 }),
	);

	const interactive = !flags.yes && process.stdin.isTTY && process.stdout.isTTY;

	const name = flags.name ?? (interactive
		? await input("Package name", { default: defaultName })
		: defaultName);
	const packageManager = flags.packageManager ?? (interactive
		? await select<PackageManager>("Package manager", {
				choices: [
					{ label: "pnpm", value: "pnpm" },
					{ label: "npm", value: "npm" },
					{ label: "yarn", value: "yarn" },
					{ label: "bun", value: "bun" },
				],
			}).catch(() => "npm" as PackageManager)
		: "npm");

	const features: Partial<ScaffoldFeature> = {
		prompts: !flags.noPrompts,
		table: !flags.noTable,
	};

	if (interactive && !flags.noPrompts) {
		const picked = await multiselect<string>("Include example sections", {
			choices: [
				{ label: "Interactive prompts (input/select)", value: "prompts" },
				{ label: "Table example", value: "table" },
			],
			required: false,
		}).catch(() => ["prompts", "table"]);
		features.prompts = picked.includes("prompts");
		features.table = picked.includes("table");
	}

	const result = await task("scaffolding", 1, async () => {
		await new Promise((r) => setTimeout(r, 150)); // feel of work
		return scaffold({ targetDir, name, packageManager, features });
	});

	const relative = path.relative(process.cwd(), result.dir) || ".";
	const list = result.files.map((f) => `  ${f}`).join("\n");
	const next = [
		`cd ${relative}`,
		packageManager === "npm" ? "npm install" : `${packageManager} install`,
		packageManager === "npm" ? "npm run dev" : `${packageManager} dev`,
	].join(" && ");

	console.log(box([
		`Created ${result.files.length} files in ${relative}`,
		"",
		...result.files.map((f) => `  ${f}`),
		"",
		"Next:",
		`  ${next}`,
	], { title: name, width: 56, colors: { border: "green" as ColorStyle } }));
	void list;

	return result;
}
