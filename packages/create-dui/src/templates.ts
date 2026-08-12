/**
 * File templates for the scaffolded project.
 *
 * Everything is plain string interpolation so the scaffolder has zero
 * runtime dependencies beyond `@bdocs/dui` itself — the generated
 * project is a self-contained, minimal CLI.
 */

export interface TemplateContext {
	name: string;
	packageManager: "npm" | "pnpm" | "yarn" | "bun";
	withPrompts: boolean;
	withTable: boolean;
}

const FEATURE_IMPORTS = (ctx: TemplateContext): string => {
	const parts = ["banner", "box", "task", "info"];
	if (ctx.withPrompts) parts.push("input", "select");
	if (ctx.withTable) parts.push("table");
	return parts.join(", ");
};

const installHint = (pm: TemplateContext["packageManager"]): string =>
	pm === "npm" ? "npm install" : pm === "pnpm" ? "pnpm install" : pm === "yarn" ? "yarn" : "bun install";

const runHint = (pm: TemplateContext["packageManager"]): string =>
	pm === "npm" ? "npm run dev" : `${pm} dev`;

export function renderPackageJson(ctx: TemplateContext): string {
	return JSON.stringify(
		{
			name: ctx.name,
			version: "0.1.0",
			description: "A CLI powered by @bdocs/dui",
			type: "module",
			main: "dist/index.js",
			bin: {
				[ctx.name]: "./dist/index.js",
			},
			scripts: {
				dev: "tsx src/index.ts",
				build: "tsc -p tsconfig.json",
				start: "node dist/index.js",
			},
			dependencies: {
				"@bdocs/dui": "^0.6.0",
			},
			devDependencies: {
				"@types/node": "^22.0.0",
				tsx: "^4.0.0",
				typescript: "^5.9.0",
			},
		},
		null,
		2,
	);
}

export function renderTsconfig(): string {
	return JSON.stringify(
		{
			compilerOptions: {
				target: "ES2022",
				module: "ESNext",
				moduleResolution: "Bundler",
				esModuleInterop: true,
				strict: true,
				skipLibCheck: true,
				outDir: "dist",
				rootDir: "src",
				declaration: true,
			},
			include: ["src"],
		},
		null,
		2,
	);
}

export function renderIndex(ctx: TemplateContext): string {
	const imports = FEATURE_IMPORTS(ctx);
	const promptSection = ctx.withPrompts
		? `
// A quick interactive prompt.
const who = await input("Who is this for?", { default: "the world" });
const mood = await select("Mood", {
  choices: [
    { label: "Calm", value: "calm" },
    { label: "Hype", value: "hype" },
  ],
});
`
		: "";

	const tableSection = ctx.withTable
		? `
// A table, because CLIs love tables.
info(table([
  { key: "Name", value: ${JSON.stringify(ctx.name)} },
  { key: "Input", value: who },
  { key: "Mood", value: mood },
]));
`
		: "";

	return `/**
 * ${ctx.name} — a CLI powered by @bdocs/dui.
 *
 * Run: ${runHint(ctx.packageManager)}
 */
import {
  ${imports},
} from "@bdocs/dui";

async function main() {
  // A banner to say hello.
  console.log(banner("HELLO", { color: "cyan" }));

  // A boxed greeting.
  console.log(box(["Welcome to ${ctx.name}!"], { title: "CLI", width: 48 }));

  // A spinner-wrapped task.
  await task("working", async (ctx) => {
    for (let i = 1; i <= 3; i++) {
      await new Promise((r) => setTimeout(r, 200));
      ctx.update(i, \`step \${i}/3\`);
    }
  });
${promptSection}${tableSection}
  // All the @bdocs/dui API is available:
  //   box, badge, kbd, modal, section, tabs, grid, divider,
  //   table, banner, richtext, toast, progress, spinner, steps,
  //   input, select, multiselect, tree, form, palette, …
  info("Done — happy hacking!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
`;
}

export function renderReadme(ctx: TemplateContext): string {
	return `# ${ctx.name}

A CLI scaffolded with [create-dui](https://github.com/bolt-docs/dui) — every
widget from **@bdocs/dui** (boxes, badges, spinners, tables, prompts,
banners, toasts, …) is one import away.

## Getting started

\`\`\`bash
${installHint(ctx.packageManager)}
${runHint(ctx.packageManager)}
\`\`\`

## Structure

- \`src/index.ts\` — the CLI entry point (edit this)
- \`tsconfig.json\` — strict TypeScript, NodeNext module resolution
- \`package.json\` — \`${ctx.name}\` bin wired to the built output

## Docs

Browse the API reference at https://bolt-docs.github.io/dui/docs — every
module has live terminal previews.
`;
}

export function renderGitignore(): string {
	return `node_modules/
dist/
*.log
`;
}
