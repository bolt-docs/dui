import { afterEach, describe, expect, it } from "vitest";
import { divider, refreshAccessibility, resetConfig } from "../src/index";

// Env vars are read LIVE from process.env by the accessibility
// heuristic. Ensure a clean slate at module load time.
process.env.NO_COLOR = "";
process.env.TERM = "xterm-256color";
process.env.PREFERS_REDUCED_MOTION = "";
refreshAccessibility();

describe("divider", () => {
	afterEach(() => {
		resetConfig();
	});

	it("returns a gray line of specified length", () => {
		const result = divider("─", 10);
		expect(result).toContain("─".repeat(10));
	});
});
