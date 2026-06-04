import { describe, it, expect } from "vitest";
import { bullet, ordered, tasks } from "../src/index";

describe("list", () => {
	it("bullet produces bullet list", () => {
		const result = bullet(["a", "b"]);
		expect(result).toContain("•");
		expect(result).toContain("a");
		expect(result).toContain("b");
	});

	it("ordered produces numbered list", () => {
		const result = ordered(["x", "y"]);
		expect(result).toContain("1.");
		expect(result).toContain("2.");
	});

	it("tasks produces checkmark list", () => {
		const result = tasks([
			{ label: "done", done: true },
			{ label: "pending", done: false },
		]);
		expect(result).toContain("✔");
		expect(result).toContain("✘");
		expect(result).toContain("done");
		expect(result).toContain("pending");
	});

	it("wraps long list items and aligns indentation", () => {
		const longItem =
			"this is a super long list item that will definitely exceed the standard terminal width and force the list function to wrap it to a new line with proper indentation";
		const result = bullet([longItem]);
		expect(result.split("\n").length).toBeGreaterThan(1);
		expect(result).toContain("\n    ");
	});
});
