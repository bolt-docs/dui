import { describe, it, expect } from "vitest";
import {
	box,
	double,
	single,
	round,
	visibleLength,
} from "../src/index";

describe("box", () => {
	it("generic box renders with content", () => {
		const result = box(["hello"], { width: 20 });
		expect(result).toContain("hello");
		expect(result).toContain("╔");
		expect(result).toContain("╝");
	});

	it("double renders with title", () => {
		const result = double(["content"], { title: "Test" });
		expect(result).toContain("Test");
		expect(result).toContain("content");
		expect(result).toContain("╔");
		expect(result).toContain("╝");
	});

	it("title border row is same visible width as bottom border row", () => {
		const result = double(["content"], { title: "Title" });
		const lines = result.split("\n");
		const topLine = lines[0];
		const bottomLine = lines[lines.length - 1];
		expect(visibleLength(topLine)).toBe(visibleLength(bottomLine));
	});

	it("single renders with title", () => {
		const result = single(["body"], { title: "Title" });
		expect(result).toContain("Title");
		expect(result).toContain("┏");
		expect(result).toContain("┛");
	});

	it("round renders with title", () => {
		const result = round(["item"], { title: "Round" });
		expect(result).toContain("Round");
		expect(result).toContain("╭");
		expect(result).toContain("╯");
	});

	it("wraps long box content responsively", () => {
		const result = box(["this is a super long line of text inside a box"], {
			title: "Responsive Box",
			width: 20,
		});
		const lines = result.split("\n");
		expect(lines.length).toBeGreaterThan(6);
		expect(result).toContain("this is");
	});

	it("supports custom border color and options in box and shorthands", () => {
		const resultBox = box(["content"], { title: "Title", color: "#ff8800" });
		expect(resultBox).toContain("\x1b[38;2;255;136;0m");

		const resultRound = round(["content"], { title: "Title", color: "#ff8800" });
		expect(resultRound).toContain("\x1b[38;2;255;136;0m");
	});
});
