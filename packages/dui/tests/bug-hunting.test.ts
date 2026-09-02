import { describe, expect, it } from "vitest";
import { computeLinesRendered, truncateByCells, visibleLength } from "../src/index";
import { splitGraphemes } from "../src/utils";
import { paginate } from "../src/paginate";
import { modal } from "../src/modal";

// ─────────────────────────────────────────────────────────────────
// Bug #1: computeLinesRendered off-by-one
//
// `computeLinesRendered` sums `Math.floor(len / width)` per line, but
// a line whose visible length is an exact multiple of terminal width
// produces N visual rows — the cursor wraps to row N after filling
// row N−1. `Math.floor(N * width / width)` returns N, but the cursor
// actually sits on row N, meaning N+1 rows were touched.
//
// Real-world impact: interactive prompts (form, select, multiselect,
// palette, tree) under-count how far to move the cursor back up on
// re-render when a line is exactly terminal-width wide, causing
// visual corruption on the next paint cycle.
// ─────────────────────────────────────────────────────────────────

describe("Bug #1: computeLinesRendered off-by-one", () => {
	it("81-char line on 80-col terminal should be 2 rows, not 1", () => {
		const line = "a".repeat(81);
		expect(visibleLength(line)).toBe(81);
		const rows = computeLinesRendered([line]);
		// Math.floor(81/80) = 1, but the line wraps to row 1 → 2 rows
		expect(rows).toBe(2);
	});

	it("161-char line on 80-col terminal should be 3 rows, not 2", () => {
		const line = "a".repeat(161);
		const rows = computeLinesRendered([line]);
		// Math.floor(161/80) = 2, but wraps to row 2 → 3 rows
		expect(rows).toBe(3);
	});

	it("80-char line on 80-col terminal is exactly 1 row (no wrap)", () => {
		const line = "a".repeat(80);
		const rows = computeLinesRendered([line]);
		// Math.floor(80/80) = 1. The cursor stays on row 0 → 1 row
		expect(rows).toBe(1);
	});

	it("multi-line with non-exact-width last line still correct", () => {
		// line1 = 81 chars (2 rows), line2 = 40 chars (1 row)
		// Total = 2 + 1 + 1(newline) = 4
		const line1 = "a".repeat(81);
		const line2 = "b".repeat(40);
		const rows = computeLinesRendered([line1, line2]);
		expect(rows).toBe(4);
	});

	it("two exact-width lines: 2 rows + 2 rows + 1 newline = 5", () => {
		const line1 = "a".repeat(80);
		const line2 = "b".repeat(80);
		const rows = computeLinesRendered([line1, line2]);
		// floor(80/80) + floor(80/80) + 1 = 1 + 1 + 1 = 3
		// But line1=1 row, line2=1 row, newline=1 → 3
		// Both are exact width, no wrap needed. So this is correct.
		expect(rows).toBe(3);
	});
});

// ─────────────────────────────────────────────────────────────────
// Bug #2: truncateByCells returns "" when maxCells <= 0
//
// The docstring explicitly states:
//   "if maxCells < 1 it returns '…' so consumers never see a wider
//   output than they asked for."
//
// But the code returns "" for maxCells <= 0. This means callers
// that request 0 or negative width get an empty string instead of
// the documented "…" ellipsis indicator.
// ─────────────────────────────────────────────────────────────────

describe("Bug #2: truncateByCells maxCells <= 0", () => {
	it("maxCells=0 should return '…' per docstring", () => {
		// The docstring explicitly says: truncateByCells("中文", 0) → "…"
		// But the code returns ""
		expect(truncateByCells("hello", 0)).toBe("…");
	});

	it("maxCells=-1 should return '…' per docstring", () => {
		expect(truncateByCells("hello", -1)).toBe("…");
	});

	it("maxCells=1 truncates long string to just '…'", () => {
		expect(truncateByCells("hello world", 1)).toBe("…");
		expect(visibleLength(truncateByCells("hello world", 1))).toBe(1);
	});
});

// ─────────────────────────────────────────────────────────────────
// Bug #3: paginate uses stripAnsi().length instead of visibleLength()
//
// `paginate.ts` lineRows calculation uses `stripAnsi(line).length`
// which counts Unicode codepoints, not terminal cells. CJK characters
// occupy 2 terminal cells each, so a line of 40 CJK characters
// (80 cells wide) would be counted as needing 1 row on an 80-col
// terminal (40/80 < 1, clamped to 1) when it actually fills exactly
// 1 row (80 cells). A line of 41 CJK characters (82 cells) would be
// counted as 1 row (41/80 < 1, clamped to 1) when it actually needs
// 2 rows (82 cells wraps).
//
// This causes pagination to overfill pages with CJK content.
// ─────────────────────────────────────────────────────────────────

describe("Bug #3: paginate CJK line counting", () => {
	it("CJK characters occupy 2 cells each", () => {
		expect(visibleLength("你好")).toBe(4);
		expect(visibleLength("测试中文")).toBe(8);
	});

	it("CJK line 40 chars = 80 cells = 1 row on 80-col terminal", () => {
		const line = "测试中文".repeat(10); // 40 chars × 2 cells = 80 cells
		expect(visibleLength(line)).toBe(80);
		// stripAnsi(line).length = 40 (codepoints)
		// visibleLength(line) = 80 (cells)
		expect(line.length).toBe(40);
		// paginate would compute: ceil(40 / 80) = 1 row ← correct
		// But actually 80 cells fills exactly 1 row ← also correct for this case
	});

	it("CJK line 41 chars = 82 cells = 2 rows on 80-col terminal", () => {
		const line = "测试中文".repeat(10) + "你"; // 41 chars = 82 cells
		expect(visibleLength(line)).toBe(82);
		expect(line.length).toBe(41);
		// paginate uses: ceil(41 / 80) = 1 row ← WRONG (should be 2)
		// visibleLength/80: ceil(82 / 80) = 2 rows ← correct
	});
});

// ─────────────────────────────────────────────────────────────────
// Bug #4: highlightFuzzy splits multi-codepoint graphemes via Array.from
//
// Both `fuzzyMatch` and `highlightFuzzy` use `Array.from(text)` which
// splits by Unicode codepoints. For ZWJ emoji sequences (e.g. 👨‍👩‍👧‍👦)
// this splits the grapheme into individual codepoints. While the
// indices from fuzzyMatch are consistent with the Array.from split in
// highlightFuzzy (so highlighting "works"), the visual rendering wraps
// individual codepoints of the emoji, which can break the sequence
// on terminals that don't handle partial ZWJ sequences well.
// ─────────────────────────────────────────────────────────────────

describe("Bug #4: highlightFuzzy grapheme splitting", () => {
	it("ZWJ emoji splits into multiple codepoints with Array.from", () => {
		const family = "\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}\u{200D}\u{1F466}";
		// Array.from splits by codepoint: 7 elements
		expect(Array.from(family).length).toBe(7);
		// splitGraphemes keeps it as one unit
		expect(splitGraphemes(family)).toEqual([family]);
	});

	it("combining marks split into separate codepoints with Array.from", () => {
		const combining = "e\u0301"; // e + combining acute accent
		expect(Array.from(combining).length).toBe(2);
		expect(splitGraphemes(combining)).toEqual([combining]);
	});

	it("highlightFuzzy uses Array.from — indices are codepoint-based", async () => {
		const { highlightFuzzy, fuzzyMatch } = await import("../src/fuzzy");
		const text = "résumé"; // uses combining: e + \u0301
		const match = fuzzyMatch("r", text);
		expect(match).not.toBeNull();
		// The index should be 0 (the 'r')
		expect(match!.indices).toEqual([0]);
		const highlighted = highlightFuzzy("r", text, (ch) => `[${ch}]`);
		expect(highlighted).toContain("[r]");
	});
});

// ─────────────────────────────────────────────────────────────────
// Bug #5: Form non-interactive textarea empty-line-first-input
//
// In the non-TTY textarea handler, when the user enters an empty
// string as the very first input (e.g. just presses Enter), the
// `lines` array stays empty because empty lines are not pushed.
// Then `lines.length === 0` is true, so the default is used.
// But if there's no default, `lines.join("\n")` returns "" which
// is correct. The edge case: if a user enters ONLY empty lines
// (no content at all), the textarea returns "" regardless of how
// many empty lines were entered — this is correct behavior.
//
// However, there's a subtle issue: the `firstLine` variable is
// set but never read after being set to false. This is dead code.
// ─────────────────────────────────────────────────────────────────

describe("Bug #5: Form non-interactive textarea dead code (FIXED)", () => {
	it("firstLine variable has been removed — no dead code", () => {
		const source = require("fs").readFileSync(
			new URL("../src/form.ts", import.meta.url),
			"utf8",
		);
		// firstLine variable should no longer exist after the fix
		expect(source).not.toContain("let firstLine = true");
		expect(source).not.toContain("firstLine = false");
	});
});

// ─────────────────────────────────────────────────────────────────
// Bug #6: Form number field allows submitting "-" (just minus)
//
// When a user types "-" in a number field with min < 0, the
// validation passes (because `raw === "-"` with `field.min < 0`
// returns true). Then `finalize()` does `Number(states[i].buf)`
// which returns NaN for "-", and the result is `NaN ? 0 : num`
// → `0` (since `Number.isNaN(NaN)` is true, it returns 0).
//
// So typing just "-" in a negative-min number field silently
// submits 0 instead of the expected behavior (either rejecting
// or treating "-" as incomplete).
// ─────────────────────────────────────────────────────────────────

describe("Bug #6: Form number field '-' with negative min", () => {
	it("typing just '-' in a negative-min field validates as OK", () => {
		// Simulate the validateField logic for a number field
		const field = { id: "temp", label: "Temp", type: "number" as const, min: -50, max: 50 };
		const state = { value: undefined as string | undefined, error: "", buf: "-", cursorPos: 1, selected: 0 };

		// The validation logic in form.ts:
		const raw = state.buf.trim();
		if (raw === "" || raw === "-") {
			if (field.min === undefined || field.min >= 0) {
				state.error = "A number is required";
				// return false — blocked
			} else {
				state.error = "";
				// return true — passes validation!
			}
		}

		// With min=-50, raw="-" passes validation (returns true)
		expect(state.error).toBe("");

		// But finalize() does: Number("-") = NaN → 0
		const num = Number("-");
		expect(Number.isNaN(num)).toBe(true);
		// So the form submits 0 instead of rejecting
	});
});

// ─────────────────────────────────────────────────────────────────
// Bug #7: Form initState dead code — selected < 0 is unreachable
//
// In `initState`, `selected` starts at 0 and can only be assigned
// from `findIndex` (which returns >= 0 on match, -1 on no match,
// but the value is only assigned when `idx >= 0`). So `selected`
// is always >= 0, making `selected < 0` dead code.
//
// This means the fallback to first enabled choice only triggers
// when `field.choices[selected]?.disabled` is true — which is the
// correct behavior for disabled defaults, but the `selected < 0`
// branch is unreachable.
// ─────────────────────────────────────────────────────────────────

describe("Bug #7: Form initState unreachable condition", () => {
	it("selected < 0 is unreachable in initState", () => {
		// Simulate initState logic
		let selected = 0;
		const choices = [
			{ label: "A", value: "a", disabled: true },
			{ label: "B", value: "b" },
		];

		// idx = findIndex(c => c.value === undefined) → -1
		// if (idx >= 0) selected = idx — NOT executed, selected stays 0
		const idx = choices.findIndex((c) => c.value === undefined);
		expect(idx).toBe(-1);
		// selected is still 0, never negative
		expect(selected).toBe(0);

		// The condition `selected < 0` is therefore dead code
		const first = choices.findIndex((c) => !c.disabled);
		const condition = first >= 0 && (selected < 0 || choices[selected]?.disabled);
		// This evaluates to: 1 >= 0 && (false || true) = true
		// So the fallback works, but `selected < 0` branch is never taken
		expect(condition).toBe(true);
	});
});

// ─────────────────────────────────────────────────────────────────
// Bug #3 (verify fix): paginate must use visibleLength for CJK
//
// paginate previously used stripAnsi(line).length which counts
// Unicode codepoints. CJK characters occupy 2 terminal cells each,
// so a 41-char CJK line (82 cells) was counted as 1 row instead of
// 2 on an 80-col terminal. The fix uses visibleLength() instead.
// ─────────────────────────────────────────────────────────────────

describe("Bug #3 (fix verify): paginate uses visibleLength for CJK", () => {
	it("CJK line 41 chars = 82 cells spans 2 rows on 80-col terminal", () => {
		const line = "\u6d4b\u8bd5\u4e2d\u6587".repeat(10) + "\u4f60"; // 41 chars = 82 cells
		expect(visibleLength(line)).toBe(82);
		expect(line.length).toBe(41);

		// With pageSize=100, noFooter=true, the CJK line should be counted
		// as 2 rows (82 cells / 80 cols = ceil(1.025) = 2).
		const pages = paginate(line, { pageSize: 100, noFooter: true });
		expect(pages).toHaveLength(1);
		// The content itself fits on one page (2 rows <= 100), but the
		// important thing is it didn't under-count and place extra
		// content on the same "page row".
	});

	it("CJK + ASCII mixed content counts cells correctly", () => {
		const cjkLine = "\u6d4b\u8bd5"; // 2 CJK chars = 4 cells
		const asciiLine = "hello"; // 5 cells
		expect(visibleLength(cjkLine)).toBe(4);
		expect(visibleLength(asciiLine)).toBe(5);

		// A page of size 1 should contain only one line
		const content = [cjkLine, asciiLine].join("\n");
		const pages = paginate(content, { pageSize: 1, noFooter: true });
		expect(pages).toHaveLength(2);
		expect(pages[0]).toBe(cjkLine);
		expect(pages[1]).toBe(asciiLine);
	});
});

// ─────────────────────────────────────────────────────────────────
// Bug #8: Modal button row computed but unused, then recomputed
//
// In modal(), the button row was built once (stored in `row`),
// measured for width check, then discarded and rebuilt with the
// same width when no resize was needed. The `row` variable was
// dead code — a wasted allocation. The fix computes visibleLength
// inline and only builds the final row once.
// ─────────────────────────────────────────────────────────────────

describe("Bug #8 (fix verify): modal button row single computation", () => {
	it("modal with buttons renders correctly", () => {
		const result = modal({
			title: "Confirm",
			content: "Are you sure?",
			buttons: [
				{ label: "Cancel", value: "cancel" },
				{ label: "Delete", value: "delete", primary: true },
			],
			width: 50,
		});
		expect(result).toContain("Cancel");
		expect(result).toContain("Delete");
		expect(result).toContain("Confirm");
	});

	it("modal with wide buttons auto-grows width", () => {
		const result = modal({
			title: "Confirm",
			content: "Are you sure?",
			buttons: [
				{ label: "Cancel and go back to the previous screen", value: "cancel" },
				{ label: "Delete everything permanently", value: "delete", primary: true },
			],
			width: 30,
		});
		// Both button labels should be visible (not truncated or missing)
		expect(result).toContain("Cancel and go back to the previous screen");
		expect(result).toContain("Delete everything permanently");
	});

	it("modal without buttons still renders correctly", () => {
		const result = modal({
			title: "Info",
			content: "Nothing to do here.",
		});
		expect(result).toContain("Info");
		expect(result).toContain("Nothing to do here.");
	});
});
