import { describe, expect, it, vi } from "vitest";
import { richtext, richtextToPlain, setCapabilities, refreshCapabilities } from "../src/index";

describe("richtext", () => {
	it("renders bold spans with SGR codes", () => {
		const out = richtext("**hi**");
		expect(out).toContain("\u001b[1mhi\u001b[22m");
	});

	it("renders italic, underline and strikethrough", () => {
		expect(richtext("*i*")).toContain("\u001b[3mi\u001b[23m");
		expect(richtext("_u_")).toContain("\u001b[4mu\u001b[24m");
		expect(richtext("~~s~~")).toContain("\u001b[9ms\u001b[29m");
	});

	it("renders code chips with fg and bg", () => {
		const out = richtext("`code`");
		// applyStyle emits one combined SGR: fg then bg channels.
		expect(out).toContain("\u001b[38;2;150;200;255;48;2;40;44;52m");
	});

	it("renders colored spans by hex", () => {
		const out = richtext("{#ff0000:red text}");
		expect(out).toContain("\u001b[38;2;255;0;0m");
	});

	it("renders colored spans by named color", () => {
		const out = richtext("{green:go}");
		expect(out).toContain("\u001b[32m");
	});

	it("renders links via OSC 8 when supported", () => {
		refreshCapabilities();
		setCapabilities({ hyperlinks: true });
		const out = richtext("[docs](https://example.com)");
		expect(out).toContain("\u001b]8;;https://example.com\u0007");
		expect(out).toContain("\u001b]8;;\u0007");
		refreshCapabilities();
	});

	it("renders links with label (url) fallback when unsupported", () => {
		refreshCapabilities();
		setCapabilities({ hyperlinks: false });
		const out = richtext("[docs](https://example.com)");
		expect(out).toContain("docs");
		expect(out).toContain("(https://example.com)");
		expect(out).not.toContain("\u001b]8;");
		refreshCapabilities();
	});

	it("supports nested styles", () => {
		const out = richtext("**bold {#00ff00:and green}**");
		expect(out).toContain("\u001b[1m");
		expect(out).toContain("\u001b[38;2;0;255;0m");
	});

	it("honors backslash escapes", () => {
		expect(richtext("\\*literal\\*")).not.toContain("\u001b[3m");
		expect(richtext("\\*literal\\*")).toContain("*literal*");
	});

	it("passes through plain text unchanged (no markup)", () => {
		expect(richtext("hello world")).toBe("hello world");
	});

	it("strips markup in plain mode", () => {
		vi.stubEnv("NO_COLOR", "1");
		const out = richtext("**bold** and `code` and [link](https://example.com)");
		expect(out).not.toContain("\u001b[");
		expect(out).toContain("bold and code and link (https://example.com)");
		vi.unstubAllEnvs();
	});
});

describe("richtextToPlain", () => {
	it("strips all markup", () => {
		expect(richtextToPlain("**bold** `code` {red:color}")).toBe(
			"bold code color",
		);
	});

	it("keeps link labels with the url appended", () => {
		expect(richtextToPlain("[docs](https://example.com)")).toBe(
			"docs (https://example.com)",
		);
	});
});
