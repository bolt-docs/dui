import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseArgs, scaffold } from "../src/index";

const tmpDirs: string[] = [];

function tmpDir(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "create-dui-"));
	tmpDirs.push(dir);
	return dir;
}

afterEach(() => {
	for (const dir of tmpDirs.splice(0)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

describe("scaffold", () => {
	it("writes the expected file set", async () => {
		const dir = tmpDir();
		const target = path.join(dir, "my-cli");
		const { files } = await scaffold({
			targetDir: target,
			name: "my-cli",
			packageManager: "pnpm",
		});
		expect(files.sort()).toEqual([
			".gitignore",
			"README.md",
			"package.json",
			"src/index.ts",
			"tsconfig.json",
		]);
		expect(fs.existsSync(path.join(target, "src/index.ts"))).toBe(true);
	});

	it("package.json uses the scaffold name and manager hints", async () => {
		const dir = tmpDir();
		const target = path.join(dir, "tool");
		await scaffold({ targetDir: target, name: "tool", packageManager: "bun" });
		const pkg = JSON.parse(
			fs.readFileSync(path.join(target, "package.json"), "utf8"),
		);
		expect(pkg.name).toBe("tool");
		expect(pkg.dependencies["@bdocs/dui"]).toBeDefined();
		const readme = fs.readFileSync(path.join(target, "README.md"), "utf8");
		expect(readme).toContain("bun install");
	});

	it("src/index.ts imports from @bdocs/dui and includes prompt sections by default", async () => {
		const dir = tmpDir();
		const target = path.join(dir, "app");
		await scaffold({ targetDir: target, name: "app" });
		const src = fs.readFileSync(path.join(target, "src/index.ts"), "utf8");
		expect(src).toContain('from "@bdocs/dui"');
		expect(src).toContain("banner(");
		expect(src).toContain("input(");
	});

	it("features can be turned off", async () => {
		const dir = tmpDir();
		const target = path.join(dir, "min");
		await scaffold({
			targetDir: target,
			name: "min",
			features: { prompts: false, table: false },
		});
		const src = fs.readFileSync(path.join(target, "src/index.ts"), "utf8");
		expect(src).not.toContain("input(");
		expect(src).not.toContain("table(");
	});

	it("dryRun reports files without writing", async () => {
		const dir = tmpDir();
		const target = path.join(dir, "dry");
		const { files } = await scaffold({
			targetDir: target,
			name: "dry",
			dryRun: true,
		});
		expect(files.length).toBe(5);
		expect(fs.existsSync(target)).toBe(false);
	});

	it("rejects invalid package names", async () => {
		const dir = tmpDir();
		await expect(
			scaffold({ targetDir: path.join(dir, "x"), name: "Bad Name!" }),
		).rejects.toThrow(/not a valid package name/);
	});

	it("rejects non-empty target directories", async () => {
		const dir = tmpDir();
		const target = path.join(dir, "taken");
		fs.mkdirSync(target);
		fs.writeFileSync(path.join(target, "existing.txt"), "x");
		await expect(
			scaffold({ targetDir: target, name: "taken" }),
		).rejects.toThrow(/not empty/);
	});
});

describe("parseArgs", () => {
	it("parses flags and positionals", () => {
		const { flags, positionals } = parseArgs([
			"--yes",
			"--name=cli",
			"--package-manager=pnpm",
			"mydir",
		]);
		expect(flags.yes).toBe(true);
		expect(flags.name).toBe("cli");
		expect(flags.packageManager).toBe("pnpm");
		expect(positionals).toEqual(["mydir"]);
	});

	it("handles --help and section toggles", () => {
		const { flags } = parseArgs(["--help", "--no-prompts", "--no-table"]);
		expect(flags.help).toBe(true);
		expect(flags.noPrompts).toBe(true);
		expect(flags.noTable).toBe(true);
	});
});
