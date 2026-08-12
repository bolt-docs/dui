import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/cli.ts"],
	format: ["esm"],
	dts: true,
	clean: true,
	tsconfig: "./tsconfig.json",
	deps: {
		neverBundle: ["@bdocs/dui"],
	},
});
