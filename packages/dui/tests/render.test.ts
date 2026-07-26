import { describe, expect, it } from "vitest";
import { calcPercentage, buildBarString, formatProgressLine } from "../src/index";

describe("calcPercentage", () => {
	it("returns 0 when total is 0", () => {
		expect(calcPercentage(0, 50)).toBe(0);
	});

	it("returns 0 when total is negative", () => {
		expect(calcPercentage(-10, 5)).toBe(0);
	});

	it("returns 0 when current is 0", () => {
		expect(calcPercentage(100, 0)).toBe(0);
	});

	it("returns 50 for 50/100", () => {
		expect(calcPercentage(100, 50)).toBe(50);
	});

	it("returns 100 when current equals total", () => {
		expect(calcPercentage(200, 200)).toBe(100);
	});

	it("clamps at 100 when current exceeds total", () => {
		expect(calcPercentage(100, 999)).toBe(100);
	});

	it("clamps at 0 when current is negative", () => {
		expect(calcPercentage(100, -10)).toBe(0);
	});

	it("handles fractional results (rounds down via Math.min)", () => {
		expect(calcPercentage(3, 1)).toBeCloseTo(33.33, 0);
	});

	it("returns 100 for any value when total is negative and current is positive", () => {
		// total <= 0 → early return 0
		expect(calcPercentage(-1, 100)).toBe(0);
	});
});

describe("buildBarString", () => {
	it("returns all empty chars at 0%", () => {
		expect(buildBarString(0, 5, "#", "-")).toBe("-----");
	});

	it("returns all filled chars at 100%", () => {
		expect(buildBarString(100, 5, "#", "-")).toBe("#####");
	});

	it("fills 3 of 5 at 60%", () => {
		expect(buildBarString(60, 5, "#", "-")).toBe("###--");
	});

	it("uses custom characters", () => {
		expect(buildBarString(50, 4, "@", ".")).toBe("@@" + "..");
	});

	it("handles width of 0 (empty string)", () => {
		expect(buildBarString(50, 0, "#", "-")).toBe("");
	});

	it("handles width of 1", () => {
		expect(buildBarString(0, 1, "#", "-")).toBe("-");
		expect(buildBarString(100, 1, "#", "-")).toBe("#");
		expect(buildBarString(50, 1, "#", "-")).toBe("#"); // rounds up
	});

	it("rounds filled count correctly (50% of 3 = 1.5 → 2)", () => {
		expect(buildBarString(50, 3, "#", "-")).toBe("##-");
	});

	it("handles pct > 100 by filling all", () => {
		expect(buildBarString(200, 4, "#", "-")).toBe("####");
	});

	it("handles pct < 0 by filling none", () => {
		expect(buildBarString(-10, 4, "#", "-")).toBe("----");
	});
});

describe("formatProgressLine", () => {
	it("renders basic format: prefix bar pct", () => {
		const bar = buildBarString(50, 10, "\u2588", "\u2591");
		const line = formatProgressLine(50, bar, "", "dl", "");
		expect(line).toContain("dl");
		expect(line).toContain("\u2588");
		expect(line).toContain("50%");
	});

	it("includes message after | separator", () => {
		const bar = buildBarString(75, 5, "#", "-");
		const line = formatProgressLine(75, bar, "fetching", "dl", "");
		expect(line).toContain("|");
		expect(line).toContain("fetching");
	});

	it("includes suffix at the end", () => {
		const bar = buildBarString(30, 5, "#", "-");
		const line = formatProgressLine(30, bar, "", "", "MB");
		expect(line).toContain("MB");
		// suffix goes after pct
		const parts = line.split(" ");
		expect(parts[parts.length - 1]).toBe("MB");
	});

	it("pads percentage to 4 chars", () => {
		const bar = buildBarString(5, 5, "#", "-");
		const line = formatProgressLine(5, bar, "", "", "");
		expect(line).toContain("  5%");
	});

	it("handles empty prefix and suffix", () => {
		const bar = buildBarString(100, 3, "#", "-");
		const line = formatProgressLine(100, bar, "", "", "");
		expect(line).toContain("###");
		expect(line).toContain("100%");
	});

	it("filters empty segments correctly (prefix empty, suffix present)", () => {
		const bar = buildBarString(50, 3, "#", "-");
		const line = formatProgressLine(50, bar, "", "", "KB");
		expect(line.startsWith(" ")).toBe(false);
		expect(line).toContain("KB");
		expect(line).toContain("50%");
	});

	it("message with pipe character is treated as part of message", () => {
		const bar = buildBarString(50, 3, "#", "-");
		const line = formatProgressLine(50, bar, "a | b", "", "");
		// Should have one pipe (the separator) plus "a | b"
		expect(line).toContain("| a | b");
	});
});
