import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	applyStyle,
	colorize,
	createToastCenter,
	highlightFuzzy,
	setColorSupported,
	toAnsiBg,
	toAnsiFg,
	visibleLength,
} from "../src/index";

setColorSupported(true);

function ttyStream(rows = 24): NodeJS.WriteStream {
	const stream = new PassThrough() as unknown as NodeJS.WriteStream;
	Object.defineProperty(stream, "isTTY", { value: true, configurable: true });
	Object.defineProperty(stream, "rows", { value: rows, configurable: true });
	return stream;
}

const stripAnsiLocal = (s: string) =>
	s.replace(
		/[\u001b\u009b](?:\[[0-9;:<=>?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\-_])/g,
		"",
	);

function toastBoxRows(written: string): string[] {
	// Pick the three visible box rows: the top (┌), body (│) and
	// bottom (└) lines after cursor/clear escapes are removed.
	const lines = written.split("\n").map(stripAnsiLocal);
	const top = lines.find((l) => l.includes("\u250c"));
	const bottom = lines.find((l) => l.includes("\u2514"));
	const body = lines.find((l) => l.trimStart().startsWith("\u2502"));
	if (!top || !bottom || !body) throw new Error("toast box rows not found");
	return [top, body, bottom];
}

describe("Bug #9: toast top border wider than body when title exceeds message", () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllEnvs();
	});

	it("keeps top == body == bottom width when the title is longer than the message", () => {
		vi.useFakeTimers();
		vi.stubEnv("NO_COLOR", "");
		const stream = ttyStream(24);
		const write = vi.spyOn(stream, "write");
		const center = createToastCenter({ stream, ttl: 5000 });
		// Title (31 cells + badge + spaces) is far wider than the
		// 2-cell message — the box must still be one consistent width.
		center.toast("OK", { type: "info", title: "Deployment finished successfully" });
		center.dismissAll();
		const written = write.mock.calls.map((c) => String(c[0])).join("");
		const [top, body, bottom] = toastBoxRows(written);
		const widths = [visibleLength(top), visibleLength(body), visibleLength(bottom)];
		expect(widths[0]).toBe(widths[1]);
		expect(widths[1]).toBe(widths[2]);
	});

	it("sizes the box for a CJK title (2 cells per char), not raw .length", () => {
		vi.useFakeTimers();
		vi.stubEnv("NO_COLOR", "");
		const stream = ttyStream(24);
		const write = vi.spyOn(stream, "write");
		const center = createToastCenter({ stream, ttl: 5000 });
		// Title is 10 CJK chars = 20 terminal cells, but title.length
		// is only 10 — the box must be sized from the visible width.
		center.toast("ok", { type: "success", title: "ビルド完了しました" });
		center.dismissAll();
		const written = write.mock.calls.map((c) => String(c[0])).join("");
		const [top, body, bottom] = toastBoxRows(written);
		const widths = [visibleLength(top), visibleLength(body), visibleLength(bottom)];
		expect(widths[0]).toBe(widths[1]);
		expect(widths[1]).toBe(widths[2]);
	});
});

describe("Bug #10: colorize/applyStyle/toAnsi* crash on the 'grey' alias", () => {
	it("colorize accepts 'grey' as an alias of 'gray'", () => {
		expect(colorize("t", "grey")).toBe(colorize("t", "gray"));
	});

	it("colorize accepts 'grey' as a background alias", () => {
		expect(colorize("t", "grey", "bg")).toBe(colorize("t", "gray", "bg"));
	});

	it("toAnsiFg('grey') matches toAnsiFg('gray')", () => {
		expect(toAnsiFg("grey")).toBe(toAnsiFg("gray"));
	});

	it("toAnsiBg('grey') matches toAnsiBg('gray')", () => {
		expect(toAnsiBg("grey")).toBe(toAnsiBg("gray"));
	});

	it("applyStyle accepts 'grey' as the fg color", () => {
		expect(applyStyle("t", "grey")).toBe(applyStyle("t", "gray"));
	});
});

describe("Bug #11: highlightFuzzy splits multi-codepoint graphemes", () => {
	it("wraps a whole ZWJ family emoji when a member codepoint matches", () => {
		const family = "\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}\u{200D}\u{1F466}";
		const woman = "\u{1F469}";
		// fuzzyMatch matches the 👩 codepoint *inside* the ZWJ sequence;
		// the highlight must cover the whole family grapheme — never a
		// half-emoji fragment that terminals render as broken boxes.
		const out = highlightFuzzy(woman, family, (ch) => `[${ch}]`);
		expect(out).toBe(`[${family}]`);
	});

	it("keeps a combining mark attached to its base letter", () => {
		const accented = "e\u0301x";
		const out = highlightFuzzy("e", accented, (ch) => `[${ch}]`);
		// The match lands on the 'e'; the U+0301 combining acute must
		// stay inside the same highlighted grapheme.
		expect(out).toBe("[e\u0301]x");
	});

	it("still wraps plain ASCII matches exactly as before", () => {
		expect(highlightFuzzy("fb", "file-browser", (ch) => `[${ch}]`)).toBe(
			"[f]ile-[b]rowser",
		);
	});
});
