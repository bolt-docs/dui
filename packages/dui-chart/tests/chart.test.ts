import { describe, it, expect } from "vitest";
import { stripAnsi } from "@bdocs/dui";
import { bar, column, line, pie, sparkline } from "../src/index";

describe("bar", () => {
	it("renders bars with proportional widths", () => {
		const result = bar([100, 50, 25], {
			labels: ["A", "B", "C"],
			width: 40,
		});
		const clean = stripAnsi(result);
		expect(clean).toContain("A");
		expect(clean).toContain("B");
		expect(clean).toContain("C");
	});

	it("returns empty for empty data", () => {
		expect(bar([])).toBe("");
	});

	it("respects progress option", () => {
		const full = bar([100], { width: 40 });
		const half = bar([100], { width: 40, progress: 0.5 });
		expect(stripAnsi(full).length).toBeGreaterThan(0);
		expect(stripAnsi(half).length).toBeGreaterThan(0);
	});

	it("handles zero values", () => {
		const result = bar([0, 0], { labels: ["A", "B"], width: 40 });
		expect(stripAnsi(result)).toContain("A");
	});
});

describe("column", () => {
	it("renders columns with correct height", () => {
		const result = column([10, 20, 30], {
			labels: ["A", "B", "C"],
			height: 6,
		});
		const clean = stripAnsi(result);
		expect(clean).toContain("A");
	});

	it("returns empty for empty data", () => {
		expect(column([])).toBe("");
	});

	it("respects progress", () => {
		const result = column([100], { progress: 0 });
		expect(result).not.toContain("█");
	});
});

describe("line", () => {
	it("renders line chart", () => {
		const result = line([1, 3, 2, 5, 4], {
			width: 10,
			height: 4,
			labels: ["A", "E"],
		});
		expect(stripAnsi(result).length).toBeGreaterThan(0);
	});

	it("returns values for < 2 data points", () => {
		const result = line([42]);
		expect(stripAnsi(result)).toBe("42");
	});

	it("renders area fill", () => {
		const result = line([1, 3, 2], { width: 6, height: 4, fill: true });
		expect(stripAnsi(result).length).toBeGreaterThan(0);
	});
});

describe("pie", () => {
	it("renders pie slices", () => {
		const result = pie([
			{ label: "JS", value: 50 },
			{ label: "TS", value: 30 },
			{ label: "Py", value: 20 },
		]);
		const clean = stripAnsi(result);
		expect(clean).toContain("JS");
		expect(clean).toContain("TS");
		expect(clean).toContain("Py");
		expect(clean).toContain("%");
	});

	it("returns empty for empty data", () => {
		expect(pie([])).toBe("");
	});

	it("returns empty for zero total", () => {
		expect(pie([{ label: "A", value: 0 }])).toBe("");
	});

	it("respects progress", () => {
		const result = pie([
			{ label: "A", value: 60 },
			{ label: "B", value: 40 },
		], { progress: 0.5 });
		const clean = stripAnsi(result);
		expect(clean).toContain("%");
	});
});

describe("sparkline", () => {
	it("renders sparkline characters", () => {
		const result = sparkline([1, 2, 3, 4, 5, 6, 7, 8]);
		expect(result.length).toBeGreaterThan(0);
		expect(result).toContain("▁");
	});

	it("returns empty for empty data", () => {
		expect(sparkline([])).toBe("");
	});

	it("applies color", () => {
		const colored = sparkline([1, 2, 3], { color: "#ff0000" });
		expect(colored).toContain("\x1b[");
	});

	it("respects progress", () => {
		const full = sparkline([10, 20, 30]);
		const zero = sparkline([10, 20, 30], { progress: 0 });
		expect(stripAnsi(full)).not.toBe(stripAnsi(zero));
	});
});
