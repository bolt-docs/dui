// Must run BEFORE all imports below — sets `FORCE_COLOR=1` in
// the vitest process environment so that when `@bdocs/dui`'s
// `color.ts` evaluates its `isColorSupported` IIFE at module-load
// time, it sees the env var and initializes to `true`. Without
// this, vitest (running without a TTY) would default to `false`
// and the diff plugin's ANSI-style assertions would fail.
//
// NOTE: `NO_COLOR` MUST be removed via `delete`, NOT by setting
// to empty string. The `no-color.org` spec says mere presence of
// `NO_COLOR` (even with empty value) means "disable colors".
process.env.FORCE_COLOR = "1";
delete process.env.NO_COLOR;

import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		setupFiles: ["./tests/setup.ts"],
	},
});
