import { describe, expect, it } from "vitest";
import { filterFuzzy, fuzzyMatch, highlightFuzzy } from "../src/index";

describe("fuzzyMatch", () => {
	it("returns an empty result for an empty query", () => {
		expect(fuzzyMatch("", "anything")).toEqual({ score: 0, indices: [] });
	});

	it("matches a subsequence in order", () => {
		const result = fuzzyMatch("fb", "file-browser");
		expect(result).not.toBeNull();
		expect(result!.indices).toEqual([0, 5]);
	});

	it("is case-insensitive", () => {
		const result = fuzzyMatch("DU", "dui");
		expect(result).not.toBeNull();
		expect(result!.indices).toEqual([0, 1]);
	});

	it("returns null when the query can't be lined up", () => {
		expect(fuzzyMatch("xyz", "hello")).toBeNull();
		expect(fuzzyMatch("ba", "ab")).toBeNull(); // wrong order
	});

	it("prefers consecutive matches over spread-out ones", () => {
		const consecutive = fuzzyMatch("br", "file-browser")!;
		const spread = fuzzyMatch("fr", "file-browser")!;
		expect(consecutive.score).toBeGreaterThan(spread.score);
	});

	it("rewards word-boundary matches", () => {
		const boundary = fuzzyMatch("fb", "file-browser")!;
		const midword = fuzzyMatch("io", "file-browser")!;
		expect(boundary.score).toBeGreaterThan(midword.score);
	});

	it("handles repeated characters in the query", () => {
		const result = fuzzyMatch("ll", "hello");
		expect(result).not.toBeNull();
		expect(result!.indices).toEqual([2, 3]);
	});

	it("handles unicode text", () => {
		const result = fuzzyMatch("ñ", "Español");
		expect(result).not.toBeNull();
	});
});

describe("highlightFuzzy", () => {
	it("wraps only the matched characters", () => {
		const out = highlightFuzzy("fb", "file-browser", (ch) => `[${ch}]`);
		expect(out).toBe("[f]ile-[b]rowser");
	});

	it("returns the text unchanged when there is no match", () => {
		expect(highlightFuzzy("zzz", "hello", (ch) => `[${ch}]`)).toBe("hello");
	});

	it("returns the text unchanged for an empty query", () => {
		expect(highlightFuzzy("", "hello", (ch) => `[${ch}]`)).toBe("hello");
	});
});

describe("filterFuzzy", () => {
	const items = [
		{ label: "file-browser", value: 1 },
		{ label: "readme", value: 2 },
		{ label: "format", value: 3 },
	];

	it("returns null for an empty query (show all)", () => {
		expect(filterFuzzy("", items, (i) => i.label)).toBeNull();
	});

	it("returns matches sorted by score", () => {
		// "re" matches readme at the string start (boundary bonus) and
		// file-browser mid-word — readme should sort first.
		const hits = filterFuzzy("re", [items[1], items[0]], (i) => i.label);
		expect(hits).not.toBeNull();
		expect(hits!.map((h) => h.item.label)).toEqual(["readme", "file-browser"]);
	});

	it("returns an empty array when nothing matches", () => {
		const hits = filterFuzzy("zzz", items, (i) => i.label);
		expect(hits).toEqual([]);
	});
});
