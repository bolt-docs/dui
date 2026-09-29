import { describe, expect, it } from "vitest";
import {
	ansiToJson,
	diffNode,
	formatJson,
	imageNode,
	parseSgr,
	progressNode,
	spinnerNode,
	widgetNode,
} from "../src/json-output";

describe("parseSgr", () => {
	it("splits plain text into a single unstyled segment", () => {
		expect(parseSgr("Hello World")).toEqual([
			{ content: "Hello World", styles: {} },
		]);
	});

	it("extracts simple SGR attributes", () => {
		const segments = parseSgr("\x1b[1mBold\x1b[0mPlain");
		expect(segments).toHaveLength(2);
		expect(segments[0]).toEqual({ content: "Bold", styles: { bold: true } });
		expect(segments[1]).toEqual({ content: "Plain", styles: {} });
	});

	it("maps 38;2;R;G;B to an fg hex color", () => {
		const segments = parseSgr("\x1b[38;2;255;0;0mRed");
		expect(segments[0].styles.fg).toBe("#ff0000");
	});

	it("maps 48;2;R;G;B to a bg hex color", () => {
		const segments = parseSgr("\x1b[48;2;0;0;255mBlueBG");
		expect(segments[0].styles.bg).toBe("#0000ff");
	});

	it("maps 38;5;N to the ANSI 256 palette color", () => {
		const segments = parseSgr("\x1b[38;5;9mBrightRed");
		expect(segments[0].styles.fg).toBe("#ff0000");
	});

	it("treats undeclared params as extra styles", () => {
		const segments = parseSgr("\x1b[5mBlink");
		expect(segments[0].styles.extra).toEqual([5]);
	});

	it("handles 22 (bold+dim off), 24, and 27 correctly", () => {
		const segments = parseSgr("\x1b[1;7mOn\x1b[22;27mOff");
		expect(segments[0].styles).toMatchObject({ bold: true, inverse: true });
		expect(segments[1].styles).toMatchObject({ bold: false, inverse: false });
	});

	it("resets all attributes on SGR 0", () => {
		const segments = parseSgr("\x1b[1;32mX\x1b[0mY");
		expect(segments[1]).toEqual({ content: "Y", styles: {} });
	});
});

describe("ansiToJson", () => {
	it("converts a styled string into text nodes", () => {
		const nodes = ansiToJson("\x1b[1;32mDone!\x1b[0m");
		expect(nodes).toHaveLength(1);
		expect(nodes[0].type).toBe("text");
		expect(nodes[0].content).toBe("Done!");
		expect(nodes[0].styles).toMatchObject({ bold: true, fg: "#008000" });
	});

	it("drops the styles key when no style is active", () => {
		const nodes = ansiToJson("plain");
		expect(nodes[0].styles).toBeUndefined();
	});

	it("merges adjacent nodes with identical styles", () => {
		const nodes = ansiToJson("\x1b[31mA\x1b[31mB");
		expect(nodes).toHaveLength(1);
		expect(nodes[0].content).toBe("AB");
	});

	it("keeps adjacent nodes separate when styles differ", () => {
		const nodes = ansiToJson("\x1b[31mRed\x1b[34mBlue");
		expect(nodes).toHaveLength(2);
		expect(nodes[0].content).toBe("Red");
		expect(nodes[1].content).toBe("Blue");
	});

	it("disables merging when mergeText is false", () => {
		const nodes = ansiToJson("\x1b[31mA\x1b[31mB", { mergeText: false });
		expect(nodes).toHaveLength(2);
	});
});

describe("formatJson", () => {
	const nodes = [
		{ type: "text" as const, content: "hello", styles: { bold: true } },
		{ type: "badge" as const, content: "ok", x: 1, y: 2, width: 2, height: 1 },
	];

	it("serializes to compact JSON by default", () => {
		const json = formatJson(nodes);
		expect(() => JSON.parse(json)).not.toThrow();
		expect(json).not.toContain("\n");
	});

	it("pretty-prints with indentation", () => {
		const json = formatJson(nodes, { pretty: true });
		expect(json).toContain("\n  ");
	});

	it("strips position data when positions is false", () => {
		const parsed = JSON.parse(formatJson(nodes, { positions: false })) as Array<
			Record<string, unknown>
		>;
		expect(parsed[1]).not.toHaveProperty("x");
		expect(parsed[1]).not.toHaveProperty("y");
		expect(parsed[1]).not.toHaveProperty("width");
		expect(parsed[1]).not.toHaveProperty("height");
	});

	it("strips styles when styles is false", () => {
		const parsed = JSON.parse(formatJson(nodes, { styles: false })) as Array<
			Record<string, unknown>
		>;
		expect(parsed[0]).not.toHaveProperty("styles");
	});
});

describe("node factories", () => {
	it("imageNode builds a typed node with format metadata", () => {
		expect(imageNode("alt", "kitty", { width: 40 })).toEqual({
			type: "image",
			content: "alt",
			meta: { format: "kitty", width: 40, height: undefined },
		});
	});

	it("diffNode includes hunks metadata when provided", () => {
		expect(
			diffNode("diff", [
				{ oldStart: 1, oldLines: 2, newStart: 1, newLines: 3 },
			]),
		).toEqual({
			type: "diff",
			content: "diff",
			meta: {
				hunks: [{ oldStart: 1, oldLines: 2, newStart: 1, newLines: 3 }],
			},
		});
	});

	it("diffNode omits hunks metadata by default", () => {
		expect(diffNode("diff")).toEqual({ type: "diff", content: "diff" });
	});

	it("progressNode rounds the percentage", () => {
		expect(progressNode("downloading", 45.67)).toEqual({
			type: "progress",
			content: "downloading",
			meta: { percent: 46 },
		});
	});

	it("spinnerNode includes frame only when given", () => {
		expect(spinnerNode("spinning", 2)).toEqual({
			type: "spinner",
			content: "spinning",
			meta: { frame: 2 },
		});
		expect(spinnerNode("spinning")).toEqual({
			type: "spinner",
			content: "spinning",
		});
	});

	it("widgetNode attaches a type and optional metadata", () => {
		expect(widgetNode("table", "cells", { title: "T" })).toEqual({
			type: "table",
			content: "cells",
			meta: { title: "T" },
		});
	});
});
