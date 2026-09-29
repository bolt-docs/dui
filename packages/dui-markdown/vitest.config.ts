import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// The first render in a suite pays a one-time ~2s cost building
		// language definitions, which lands right on vitest's 5s default
		// timeout when turbo runs the packages in parallel. That made
		// `renderCode width handling` fail intermittently in CI.
		testTimeout: 20000,
	},
});
