import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { link, linkify, refreshCapabilities, setCapabilities } from "../src/index";

describe("link", () => {
	beforeEach(() => {
		refreshCapabilities();
	});

	afterEach(() => {
		refreshCapabilities();
	});

	it("emits OSC 8 when hyperlinks are supported", () => {
		setCapabilities({ hyperlinks: true });
		expect(link("https://example.com", "Example")).toBe(
			"\u001b]8;;https://example.com\u0007Example\u001b]8;;\u0007",
		);
	});

	it("falls back to text (url) when unsupported", () => {
		setCapabilities({ hyperlinks: false });
		expect(link("https://example.com", "Example")).toBe(
			"Example (https://example.com)",
		);
	});

	it("falls back to url-only when configured", () => {
		setCapabilities({ hyperlinks: false });
		expect(link("https://example.com", "Example", { fallback: "url" })).toBe(
			"https://example.com",
		);
	});

	it("falls back to text-only when configured", () => {
		setCapabilities({ hyperlinks: false });
		expect(link("https://example.com", "Example", { fallback: "text" })).toBe(
			"Example",
		);
	});

	it("uses the URL as the label when text is omitted", () => {
		setCapabilities({ hyperlinks: true });
		expect(link("https://example.com")).toBe(
			"\u001b]8;;https://example.com\u0007https://example.com\u001b]8;;\u0007",
		);
	});

	it("returns the label when url is empty", () => {
		setCapabilities({ hyperlinks: true });
		expect(link("", "nothing")).toBe("nothing");
	});
});

describe("linkify", () => {
	beforeEach(() => {
		refreshCapabilities();
	});

	afterEach(() => {
		refreshCapabilities();
	});

	it("wraps URLs found in text when supported", () => {
		setCapabilities({ hyperlinks: true });
		expect(linkify("See https://example.com now")).toBe(
			"See \u001b]8;;https://example.com\u0007https://example.com\u001b]8;;\u0007 now",
		);
	});

	it("keeps URLs visible when unsupported", () => {
		setCapabilities({ hyperlinks: false });
		expect(linkify("See https://example.com now")).toBe(
			"See https://example.com now",
		);
	});
});
