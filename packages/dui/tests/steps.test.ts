import { describe, expect, it } from "vitest";
import { steps } from "../src/index";

describe("steps", () => {
	it("renders timeline with multiple status steps", () => {
		const result = steps([
			{ label: "Step 1", status: "success", details: "Done first" },
			{ label: "Step 2", status: "running", details: "Working now" },
			{ label: "Step 3", status: "pending" },
		]);
		expect(result).toContain("✔");
		expect(result).toContain("●");
		expect(result).toContain("○");
		expect(result).toContain("│");
		expect(result).toContain("Done first");
	});
});
