import { beforeAll, describe, expect, it } from "vitest";
import {
	applyStyle,
	colorize,
	colorMap,
	colors,
	interpolateColor,
	parseColor,
	setColorSupported,
	toAnsiBg,
	toAnsiFg,
} from "../src/color";

beforeAll(() => {
	setColorSupported(true);
});

describe("colors (named colors and styles)", () => {
	it("colors.red wraps text with ANSI red codes", () => {
		const result = colors.red("hello");
		expect(result).toContain("hello");
		expect(result).toMatch(/\x1b\[31m/);
		expect(result).toMatch(/\x1b\[39m$/);
	});

	it("colors.bold wraps text with ANSI bold codes", () => {
		const result = colors.bold("bold text");
		expect(result).toMatch(/\x1b\[1m/);
		expect(result).toContain("bold text");
	});

	it("colors.gray is an alias for colors.grey", () => {
		expect(colors.gray("t")).toBe(colors.grey("t"));
	});

	it("bg color functions set background ANSI codes", () => {
		const result = colors.bgRed("bg");
		expect(result).toMatch(/\x1b\[41m/);
	});

	it("closes with individual close codes, not blanket reset", () => {
		const red = colors.red("hello");
		expect(red).not.toMatch(/\x1b\[0m/);
		expect(red).toMatch(/\x1b\[39m$/);

		const bold = colors.bold("hello");
		expect(bold).not.toMatch(/\x1b\[0m/);
		expect(bold).toMatch(/\x1b\[22m$/);
	});
});

describe("function composition (backward compat)", () => {
	it("can compose multiple styles via nesting", () => {
		const result = colors.bold(colors.red("urgent"));
		expect(result).toMatch(/\x1b\[1m/);
		expect(result).toMatch(/\x1b\[31m/);
		expect(result).toContain("urgent");
	});

	it("composes bold+red without blanket reset", () => {
		const result = colors.bold(colors.red("urgent"));
		expect(result).not.toMatch(/\x1b\[0m/);
		expect(result).toMatch(/\x1b\[39m\x1b\[22m$/);
	});
});

describe("chainable API", () => {
	it("chains red.bold and applies both styles", () => {
		const result = colors.red.bold("urgent");
		expect(result).toMatch(/\x1b\[31;1m/);
		expect(result).toContain("urgent");
		expect(result).toMatch(/\x1b\[39m\x1b\[22m$/);
	});

	it("chains multiple styles", () => {
		const result = colors.blue.bgYellow.underline("hello");
		expect(result).toMatch(/\x1b\[34;43;4m/);
		expect(result).toContain("hello");
	});

	it("chain with grey alias works", () => {
		const result = colors.grey("dimmed");
		expect(result).toMatch(/\x1b\[90m/);
	});
});

describe("variadic / multi-argument", () => {
	it("styles multiple arguments and joins with space", () => {
		const result = colors.red("hello", "world", "!");
		expect(result).toContain("hello world !");
		expect(result).toMatch(/\x1b\[31m/);
	});

	it("chainable variadic works", () => {
		const result = colors.red.bold("a", "b");
		expect(result).toMatch(/\x1b\[31;1m/);
		expect(result).toContain("a b");
	});

	it("no styles returns joined args as-is", () => {
		const result = colors("a", "b", "c");
		expect(result).toBe("a b c");
	});
});

describe("nested styles (individual close codes)", () => {
	it("nested bold inside red: bold closes with 22, red stays active", () => {
		const result = colors.red("hello " + colors.bold("world") + "!");
		expect(result).toMatch(/\x1b\[31m/);
		expect(result).toMatch(/\x1b\[1m/);
		expect(result).toMatch(/\x1b\[22m/);
		expect(result).toMatch(/\x1b\[39m$/);
		// Red should still be active between \x1b[22m and final \x1b[39m
		const boldCloseIdx = result.indexOf("\x1b[22m");
		const finalCloseIdx = result.lastIndexOf("\x1b[39m");
		expect(boldCloseIdx).toBeLessThan(finalCloseIdx);
	});

	it("nested underline inside bold: each style has own close", () => {
		const result = colors.bold("a " + colors.underline("b") + " c");
		expect(result).toMatch(/\x1b\[1m/);
		expect(result).toMatch(/\x1b\[4m/);
		expect(result).toMatch(/\x1b\[24m/);
		expect(result).toMatch(/\x1b\[22m$/);
	});

	it("nested multiple different styles work correctly", () => {
		const result = colors.red(
			"a" + colors.bold("b") + colors.underline("c") + "d",
		);
		// a=red, b=red+bold, c=red+underline, d=red
		expect(result).toMatch(/\x1b\[31m/);
		expect(result).toMatch(/\x1b\[1m/);
		expect(result).toMatch(/\x1b\[22m/);
		expect(result).toMatch(/\x1b\[4m/);
		expect(result).toMatch(/\x1b\[24m/);
		expect(result).toMatch(/\x1b\[39m$/);
	});
});

describe("deep nesting (close+reopen)", () => {
	it("red + inner blue: blue close reopens red", () => {
		const result = colors.red("hello " + colors.blue("world") + "!");
		// After blue closes (\x1b[39m), red should reopen (\x1b[31m)
		const blueCloseIdx = result.indexOf("\x1b[39m");
		const reopenIdx = result.indexOf("\x1b[31m", blueCloseIdx + 1);
		expect(reopenIdx).toBeGreaterThan(blueCloseIdx);
		expect(result.endsWith("\x1b[39m")).toBe(true);
	});

	it("chainable with multiple inner styled segments", () => {
		const result = colors.red("a" + colors.blue("b") + colors.green("c") + "d");
		const expected =
			"\x1b[31ma\x1b[34mb\x1b[39m\x1b[31m\x1b[32mc\x1b[39m\x1b[31md\x1b[39m";
		expect(result).toBe(expected);
	});

	it("chainable outer with inner chainable", () => {
		const result = colors.red.bold(
			"hello " + colors.blue.underline("world") + "!",
		);
		expect(result).toMatch(/\x1b\[31;1m/);
		expect(result).toMatch(/\x1b\[34;4m/);
		// After inner close (\x1b[39m\x1b[24m), outer should reopen
		const innerCloseIdx = result.indexOf("\x1b[39m\x1b[24m");
		const reopenIdx = result.indexOf("\x1b[31;1m", innerCloseIdx + 1);
		expect(reopenIdx).toBeGreaterThan(innerCloseIdx);
	});
});

describe("colorMap (backward compat)", () => {
	it("colorMap.red wraps text", () => {
		const result = colorMap.red("hello");
		expect(result).toMatch(/\x1b\[31m/);
		expect(result).toMatch(/\x1b\[39m$/);
	});

	it("colorMap has grey alias", () => {
		expect(colorMap.grey("t")).toBe(colorMap.gray("t"));
	});

	it("colorMap.bold works", () => {
		const result = colorMap.bold("text");
		expect(result).toMatch(/\x1b\[1m/);
	});
});

describe("parseColor", () => {
	it("parses 3-digit hex", () => {
		expect(parseColor("#f00")).toEqual({ r: 255, g: 0, b: 0 });
	});

	it("parses 6-digit hex", () => {
		expect(parseColor("#ff6600")).toEqual({ r: 255, g: 102, b: 0 });
	});

	it("parses 8-digit hex with alpha", () => {
		const c = parseColor("#ff000080");
		expect(c.r).toBe(255);
		expect(c.g).toBe(0);
		expect(c.b).toBe(0);
		expect(c.a).toBeCloseTo(0.5, 1);
	});

	it("parses rgb() format", () => {
		expect(parseColor("rgb(100, 200, 50)")).toEqual({ r: 100, g: 200, b: 50 });
	});

	it("parses rgba() format", () => {
		const c = parseColor("rgba(255, 0, 0, 0.5)");
		expect(c.r).toBe(255);
		expect(c.a).toBeCloseTo(0.5, 1);
	});

	it("parses oklch() format", () => {
		const c = parseColor("oklch(60% 0.15 250)");
		expect(c.r).toBeGreaterThanOrEqual(0);
		expect(c.g).toBeGreaterThanOrEqual(0);
		expect(c.b).toBeGreaterThanOrEqual(0);
		expect(c.r).toBeLessThanOrEqual(255);
		expect(c.g).toBeLessThanOrEqual(255);
		expect(c.b).toBeLessThanOrEqual(255);
	});

	it("parses oklch() without % syntax", () => {
		const c = parseColor("oklch(0.6 0.15 250)");
		expect(c.r).toBeGreaterThanOrEqual(0);
	});

	it("parses oklch() with alpha", () => {
		const c = parseColor("oklch(60% 0.15 250 / 0.8)");
		expect(c.a).toBeCloseTo(0.8, 1);
	});

	it("throws on invalid format", () => {
		expect(() => parseColor("not-a-color")).toThrow();
	});

	it("throws on non-string input", () => {
		expect(() => parseColor(123 as any)).toThrow();
	});
});

describe("colorize", () => {
	it("colorizes foreground with hex", () => {
		const result = colorize("text", "#ff0000");
		expect(result).toMatch(/\x1b\[38;2;255;0;0m/);
		expect(result).toContain("text");
		expect(result).toMatch(/\x1b\[39m$/);
	});

	it("colorizes background with hex", () => {
		const result = colorize("text", "#00ff00", "bg");
		expect(result).toMatch(/\x1b\[48;2;0;255;0m/);
		expect(result).toMatch(/\x1b\[49m$/);
	});

	it("colorizes with rgb format", () => {
		const result = colorize("hello", "rgb(100, 200, 50)");
		expect(result).toMatch(/\x1b\[38;2;100;200;50m/);
	});

	it("colorizes with oklch format", () => {
		const result = colorize("ok", "oklch(60% 0.15 250)");
		expect(result).toMatch(/\x1b\[38;2;/);
		expect(result).toContain("ok");
	});
});

describe("toAnsiFg and toAnsiBg", () => {
	it("toAnsiFg generates correct escape", () => {
		expect(toAnsiFg("#102030")).toBe("\x1b[38;2;16;32;48m");
	});

	it("toAnsiBg generates correct escape", () => {
		expect(toAnsiBg("#102030")).toBe("\x1b[48;2;16;32;48m");
	});
});

describe("interpolateColor", () => {
	it("returns start color at t=0", () => {
		expect(interpolateColor("#ff0000", "#00ff00", 0)).toBe("#ff0000");
	});

	it("returns end color at t=1", () => {
		expect(interpolateColor("#ff0000", "#00ff00", 1)).toBe("#00ff00");
	});

	it("returns midpoint at t=0.5", () => {
		expect(interpolateColor("#000000", "#ffffff", 0.5)).toBe("#808080");
	});
});

describe("applyStyle", () => {
	it("returns plain text with no styles", () => {
		expect(applyStyle("hello")).toBe("hello");
	});

	it("applies color and bold style", () => {
		const result = applyStyle("styled", "#ff0000", undefined, ["bold"]);
		expect(result).toMatch(/\x1b\[1;38;2;255;0;0m/);
		expect(result).toMatch(/\x1b\[22;39m$/);
	});

	it("applies bg and fg simultaneously", () => {
		const result = applyStyle("both", "#fff", "#000");
		expect(result).toMatch(/\x1b\[38;2;255;255;255;48;2;0;0;0m/);
		expect(result).toMatch(/\x1b\[39;49m$/);
	});
});
