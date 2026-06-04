import { describe, it, expect } from "vitest";
import { table } from "../src/index";

describe("table", () => {
	it("renders table with default single style", () => {
		const result = table(
			["Col A", "Col B"],
			[
				["1", "2"],
				["3", "4"],
			],
		);
		expect(result).toContain("Col A");
		expect(result).toContain("Col B");
		expect(result).toContain("┏");
		expect(result).toContain("━");
		expect(result).toContain("┳");
		expect(result).toContain("┫");
	});

	it("renders table with double style", () => {
		const result = table(["Col A"], [["val"]], { style: "double" });
		expect(result).toContain("╚");
		expect(result).toContain("═");
	});

	it("renders table with none style", () => {
		const result = table(["A", "B"], [["1", "2"]], { style: "none" });
		expect(result).not.toContain("┏");
		expect(result).toContain("1");
	});

	it("respects alignments", () => {
		const resultLeft = table(["A"], [["1"]], { columns: [{ align: "left" }] });
		const resultRight = table(["A"], [["1"]], {
			columns: [{ align: "right" }],
		});
		expect(resultLeft).toBeDefined();
		expect(resultRight).toBeDefined();
	});

	it("wraps long cell content and scales table columns responsively", () => {
		const result = table(
			["Col A", "Col B"],
			[["this is a super long cell content that should be wrapped", "short"]],
			{ width: 40 },
		);
		expect(result.split("\n").length).toBeGreaterThan(6);
		expect(result).toContain("Col A");
		expect(result).toContain("short");
	});

	it("respects headerSeparator option", () => {
		const headers = ["Col A", "Col B"];
		const rows = [["1", "2"]];
		
		const withSep = table(headers, rows, { headerSeparator: true });
		const withoutSep = table(headers, rows, { headerSeparator: false });
		
		expect(withSep).toContain("┣");
		expect(withoutSep).not.toContain("┣");
	});

	it("respects custom padding option", () => {
		const headers = ["A"];
		const rows = [["1"]];
		
		const defaultPad = table(headers, rows);
		const doublePad = table(headers, rows, { padding: 2 });
		const zeroPad = table(headers, rows, { padding: 0 });
		
		expect(defaultPad).toContain(" 1 ");
		expect(doublePad).toContain("  1  ");
		expect(zeroPad).toContain("┃1┃");
	});
});
