import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		coverage: {
			provider: "v8",
			thresholds: {
				lines: 85,
				functions: 85,
				branches: 70,
				statements: 85,
			},
		},
		setupFiles: ["./tests/setup-env.ts"],
		// Run each test file in its own fork so process.env mutations
		// in one file (e.g. accessibility.test.ts stubEnv to "TERM=dumb")
		// don't leak into another file's tests.
		pool: "forks",
	},
});
