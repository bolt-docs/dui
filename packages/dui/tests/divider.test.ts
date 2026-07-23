import { describe, expect, it } from "vitest";
import { divider } from "../src/index";

describe("divider", () => {
	it("returns a gray line of specified length", () => {
		const result = divider("─", 10);
		expect(result).toContain("─".repeat(10));
	});
});
