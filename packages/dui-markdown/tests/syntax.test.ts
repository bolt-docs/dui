import { describe, it, expect } from "vitest";
import { hexToAnsi, mdSyntax } from "../src/syntax";
import { getLanguage } from "../src/language";

describe("getLanguage", () => {
	it("maps common languages", () => {
		expect(getLanguage("ts")?.id).toBe("typescript");
		expect(getLanguage("typescript")?.id).toBe("typescript");
		expect(getLanguage("js")?.id).toBe("javascript");
		expect(getLanguage("javascript")?.id).toBe("javascript");
		expect(getLanguage("json")?.id).toBe("json");
		expect(getLanguage("html")?.id).toBe("html");
		expect(getLanguage("css")?.id).toBe("css");
		expect(getLanguage("bash")?.id).toBe("bash");
		expect(getLanguage("sh")?.id).toBe("bash");
		expect(getLanguage("python")?.id).toBe("python");
		expect(getLanguage("py")?.id).toBe("python");
		expect(getLanguage("yaml")?.id).toBe("yaml");
		expect(getLanguage("unknown")).toBeUndefined();
		expect(getLanguage()).toBeUndefined();
	});

	it("has correct shikiLang for each language", () => {
		expect(getLanguage("ts")?.shikiLang).toBe("typescript");
		expect(getLanguage("py")?.shikiLang).toBe("python");
		expect(getLanguage("bash")?.shikiLang).toBe("bash");
	});
});

describe("hexToAnsi", () => {
	it("converts hex to ANSI foreground escape", () => {
		const ansi = hexToAnsi("#ff6600");
		expect(ansi).toBe("\x1b[38;2;255;102;0m");
	});

	it("returns empty for invalid hex", () => {
		const ansi = hexToAnsi("invalid");
		expect(ansi).toBe("");
	});
});

describe("mdSyntax", () => {
	it("returns plain code for unknown language", async () => {
		const result = await mdSyntax("hello world", "unknown");
		expect(result).toBe("hello world");
	});

	it("returns plain code for no language", async () => {
		const result = await mdSyntax("hello world");
		expect(result).toBe("hello world");
	});
});
