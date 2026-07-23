import { describe, expect, it } from "vitest";
import {
	fitWidth,
	padCenter,
	padRight,
	stripAnsi,
	visibleLength,
	wrapAnsiWord,
} from "../src/index";

describe("utils", () => {
	it("padCenter — plain string", () => {
		expect(padCenter("hi", 6)).toBe("  hi  ");
		expect(padCenter("hi", 5)).toBe(" hi  ");
		expect(padCenter("hi", 2)).toBe("hi");
	});

	it("padCenter — ANSI colored string centers on visible width", () => {
		const colored = "\x1b[31mhi\x1b[0m"; // visible length = 2
		const result = padCenter(colored, 6);
		// 2 spaces on each side around the 2-char visible content
		expect(result.startsWith("  ")).toBe(true);
		expect(result.endsWith("  ")).toBe(true);
		expect(visibleLength(result)).toBe(6);
	});

	it("padRight", () => {
		expect(padRight("hi", 5)).toBe("hi   ");
		expect(padRight("hi", 2)).toBe("hi");
	});

	it("fitWidth", () => {
		expect(fitWidth("hi", 5)).toBe("hi   ");
		expect(fitWidth("hello world", 5)).toBe("hello world"); // no truncation
	});

	it("stripAnsi — SGR color sequences", () => {
		expect(stripAnsi("\x1b[31mred\x1b[0m")).toBe("red");
		expect(stripAnsi("\x1b[1;32mbold green\x1b[0m")).toBe("bold green");
	});

	it("stripAnsi — OSC hyperlinks", () => {
		// Terminal hyperlink: \x1b]8;;url\x07 text \x1b]8;;\x07
		const link = "\x1b]8;;https://example.com\x07click here\x1b]8;;\x07";
		expect(stripAnsi(link)).toBe("click here");
	});

	it("stripAnsi — cursor movement (CSI non-color)", () => {
		expect(stripAnsi("\x1b[2Jhello")).toBe("hello"); // erase screen
		expect(stripAnsi("\x1b[1Aup")).toBe("up"); // cursor up
	});

	it("visibleLength", () => {
		expect(visibleLength("\x1b[31mred\x1b[0m")).toBe(3);
		expect(visibleLength("plain")).toBe(5);
		expect(visibleLength("")).toBe(0);
	});

	it("wrapAnsiWord wraps long lines", () => {
		const text = "hello world this is a test";
		const wrapped = wrapAnsiWord(text, 10);
		expect(wrapped).toEqual(["hello", "world this", "is a test"]);
	});

	it("wrapAnsiWord preserves ANSI codes across wrapped lines", () => {
		const text = "hello \x1b[31mworld this is\x1b[0m a test";
		const wrapped = wrapAnsiWord(text, 10);
		expect(stripAnsi(wrapped[0])).toBe("hello");
		expect(wrapped[1]).toContain("\x1b[31mworld");
		expect(wrapped[1]).toContain("this");
		expect(wrapped[1]).toContain("\x1b[0m");
		expect(wrapped[2]).toContain("\x1b[31mis\x1b[0m");
	});
});
