import { describe, it, expect } from "vitest";
import {
	diff,
	diffSideBySide,
	diffWords,
	diffWordsRender,
	diffStat,
	diffFiles,
} from "../src/index";

// ── diff (unified) ─────────────────────────────────────────────

describe("diff (unified)", () => {
	it("returns empty result for identical strings", () => {
		const r = diff("hello", "hello");
		expect(r.additions).toBe(0);
		expect(r.deletions).toBe(0);
		expect(r.hunks).toBe(0);
	});

	it("detects pure additions", () => {
		const r = diff("a", "a\nb");
		expect(r.additions).toBe(1);
		expect(r.deletions).toBe(0);
	});

	it("detects pure deletions", () => {
		const r = diff("a\nb", "a");
		expect(r.additions).toBe(0);
		expect(r.deletions).toBe(1);
	});

	it("detects mixed changes", () => {
		const r = diff("a\nb\nc", "a\nB\nC\nD");
		expect(r.additions).toBeGreaterThanOrEqual(1);
		expect(r.deletions).toBeGreaterThanOrEqual(1);
	});

	it("produces ANSI-colored output", () => {
		expect(diff("hello", "world").output).toContain("\u001b[");
	});

	it("uses green for additions", () => {
		expect(diff("a", "a\nb").output).toContain("\u001b[32m");
	});

	it("uses red for deletions", () => {
		expect(diff("a\nb", "a").output).toContain("\u001b[31m");
	});

	it("uses cyan for hunk headers", () => {
		expect(diff("old", "new").output).toContain("\u001b[36m");
	});

	it("formats hunk headers with position and counts", () => {
		const r = diff(
			"a\nb\nc\nd\ne\nf",
			"a\nb\nCHANGED\nd\ne\nf",
		);
		expect(r.output).toMatch(/@@ -\d+,\d+ \+\d+,\d+ @@/);
	});

	it("renders line numbers for added lines", () => {
		const r = diff("a", "a\nb\nc");
		// added line numbers appear as padded digits
		expect(r.output).toMatch(/\u001b\[\d+;\d+m\s+\d+\s+\u001b\[\d+;\d+m/);
	});

	it("renders line numbers for removed lines", () => {
		const r = diff("a\nb\nc", "a");
		expect(r.output).toMatch(/\u001b\[\d+;\d+m\s+\d+\s+\s\u001b/);
	});

	it("respects custom context lines", () => {
		const oldStr = Array.from({ length: 30 }, (_, i) => `L${i}`).join("\n");
		const newStr = Array.from({ length: 30 }, (_, i) =>
			i === 10 ? "CHANGED" : `L${i}`,
		).join("\n");
		const small = diff(oldStr, newStr, { context: 1 });
		const large = diff(oldStr, newStr, { context: 5 });
		expect(large.output.length).toBeGreaterThan(small.output.length);
	});

	it("respects lineNumbers toggle", () => {
		const withNumbers = diff("a", "a\nb");
		const without = diff("a", "a\nb", { lineNumbers: false });
		expect(without.output.length).toBeLessThan(withNumbers.output.length);
	});

	it("respects header toggle", () => {
		const r = diff("a", "b", { header: false });
		expect(r.output).not.toMatch(/insertion/);
	});

	it("uses filename in header when provided", () => {
		const r = diff("a", "b", { filename: "example.txt" });
		expect(r.output).toContain("example.txt");
	});

	it("handles empty old string", () => {
		const r = diff("", "brand new content");
		expect(r.additions).toBeGreaterThan(0);
		expect(r.deletions).toBe(0);
	});

	it("handles empty new string", () => {
		const r = diff("old content", "");
		expect(r.deletions).toBeGreaterThan(0);
	});

	it("handles completely different multi-line strings", () => {
		const r = diff("a\nb\nc", "x\ny\nz");
		expect(r.additions).toBe(3);
		expect(r.deletions).toBe(3);
	});

	it("truncates lines that exceed width", () => {
		const long = "x".repeat(200);
		const r = diff("a", long, { width: 20 });
		const lastLine = r.output.split("\n").pop() ?? "";
		// The last visible part should be bounded by the ellipsis cap
		expect(lastLine.endsWith("…") || lastLine.includes("…")).toBe(true);
	});

	it("survives CRLF line endings", () => {
		const r = diff("a\r\nb\r\nc", "a\r\nB\r\nc");
		expect(r.additions).toBe(1);
		expect(r.deletions).toBe(1);
	});

	it("produces identical output for two consecutive calls", () => {
		const a = diff("alpha\nbeta\ngamma", "alpha\nBETA\ngamma");
		const b = diff("alpha\nbeta\ngamma", "alpha\nBETA\ngamma");
		expect(a.output).toBe(b.output);
	});

	it("marks additions with + prefix in compact gutter", () => {
		const r = diff("a", "a\nb", { gutterStyle: "compact" });
		expect(r.output).toContain("+");
	});

	it("marks deletions with - prefix in compact gutter", () => {
		const r = diff("a\nb", "a", { gutterStyle: "compact" });
		expect(r.output).toContain("-");
	});
});

// ── diffSideBySide ─────────────────────────────────────────────

describe("diffSideBySide", () => {
	it("returns empty result for identical strings", () => {
		const r = diffSideBySide("same", "same");
		expect(r.additions).toBe(0);
		expect(r.deletions).toBe(0);
	});

	it("renders the header", () => {
		const r = diffSideBySide("a", "b");
		expect(r.output).toContain("side-by-side");
	});

	it("shows pure additions on the right column", () => {
		const r = diffSideBySide("a", "a\nb\nc");
		expect(r.additions).toBe(2);
	});

	it("shows pure deletions on the left column", () => {
		const r = diffSideBySide("a\nb\nc", "a");
		expect(r.deletions).toBe(2);
	});

	it("shows modifications in both columns", () => {
		const r = diffSideBySide("line1\nline2", "line1\nLINE2");
		expect(r.additions).toBe(1);
		expect(r.deletions).toBe(1);
	});

	it("respects header toggle", () => {
		const r = diffSideBySide("a", "b", { header: false });
		expect(r.output).not.toContain("side-by-side");
	});

	it("uses filename in header", () => {
		const r = diffSideBySide("a", "b", { filename: "file.ts" });
		expect(r.output).toContain("file.ts");
	});

	it("produces ANSI colors", () => {
		expect(diffSideBySide("old", "new").output).toContain("\u001b[");
	});

	it("survives CRLF input", () => {
		const r = diffSideBySide("a\r\nb\r\nc", "a\r\nB\r\nc");
		expect(r.additions).toBe(1);
		expect(r.deletions).toBe(1);
	});
});

// ── diffWords ──────────────────────────────────────────────────

describe("diffWords", () => {
	it("returns single equal segment for identical strings", () => {
		const segs = diffWords("hello world", "hello world");
		expect(segs).toHaveLength(1);
		expect(segs[0]?.added).toBeUndefined();
		expect(segs[0]?.removed).toBeUndefined();
	});

	it("detects pure additions", () => {
		const segs = diffWords("hello", "hello world");
		const added = segs.filter((s) => s.added);
		expect(added.length).toBeGreaterThan(0);
	});

	it("detects pure removals", () => {
		const segs = diffWords("hello world", "hello");
		const removed = segs.filter((s) => s.removed);
		expect(removed.length).toBeGreaterThan(0);
	});

	it("segments preserve original order", () => {
		const segs = diffWords("foo bar baz", "foo qux baz");
		// The added segment is somewhere in the middle
		const added = segs.filter((s) => s.added).map((s) => s.value).join("");
		expect(added).toContain("qux");
	});

	it("handles empty strings", () => {
		expect(diffWords("", "")).toEqual([]);
		expect(diffWords("", "x")).toEqual([{ value: "x", added: true }]);
		expect(diffWords("x", "")).toEqual([{ value: "x", removed: true }]);
	});
});

describe("diffWordsRender", () => {
	it("produces ANSI colored strings", () => {
		const r = diffWordsRender("foo bar", "foo baz");
		expect(r.old).toContain("\u001b[");
		expect(r.new).toContain("\u001b[");
	});

	it("keeps equal portions unchanged", () => {
		const r = diffWordsRender("foo bar", "foo baz");
		expect(r.old).toContain("foo");
		expect(r.new).toContain("foo");
	});
});

// ── diffStat ───────────────────────────────────────────────────

describe("diffStat", () => {
	it("renders a summary for single-file diffs", () => {
		const r = diff("a\nb\nc", "a\nB\nc");
		const stat = diffStat(r);
		expect(stat).toContain("hunk");
		expect(stat).toMatch(/\+\d+/);
		expect(stat).toMatch(/-\d+/);
	});

	it("renders a summary for multi-file diffs", () => {
		const mr = diffFiles([
			{ oldPath: "a.ts", newPath: "a.ts", oldContent: "x", newContent: "y" },
		]);
		const stat = diffStat(mr);
		expect(stat).toContain("1 file changed");
	});
});

// ── diffFiles ──────────────────────────────────────────────────

describe("diffFiles", () => {
	it("renders multiple files with per-file stats", () => {
		const r = diffFiles([
			{ oldPath: "a.ts", newPath: "a.ts", oldContent: "x", newContent: "y" },
			{ oldPath: "b.ts", newPath: "b.ts", oldContent: "1\n2", newContent: "1\n3" },
		]);
		expect(r.files).toHaveLength(2);
		expect(r.totals.files).toBe(2);
		expect(r.totals.additions + r.totals.deletions).toBeGreaterThan(0);
	});

	it("marks added files with status=added", () => {
		const r = diffFiles([
			{ oldPath: "a.ts", newPath: "a.ts", oldContent: "", newContent: "hello" },
		]);
		expect(r.files[0]?.status).toBe("added");
	});

	it("marks removed files with status=removed", () => {
		const r = diffFiles([
			{ oldPath: "a.ts", newPath: "a.ts", oldContent: "hello", newContent: "" },
		]);
		expect(r.files[0]?.status).toBe("removed");
	});

	it("honors an explicit status", () => {
		const r = diffFiles([
			{ oldPath: "a.ts", newPath: "a.ts", oldContent: "x", newContent: "x", status: "removed" },
		]);
		expect(r.files[0]?.status).toBe("removed");
	});

	it("skips identical files silently", () => {
		const r = diffFiles([
			{ oldPath: "a.ts", newPath: "a.ts", oldContent: "x", newContent: "x" },
		]);
		expect(r.files[0]?.result.additions).toBe(0);
		expect(r.files[0]?.result.deletions).toBe(0);
	});
});

// ── Realistic code diff ────────────────────────────────────────

describe("realistic code-diff usage", () => {
	it("renders typical TypeScript changes", () => {
		const oldCode = `function greet(name: string) {
  console.log("Hello", name);
  return name;
}`;
		const newCode = `function greet(name: string, polite = false) {
  console.log(polite ? \`Hello, \${name}\` : \`Hi \${name}\`);
  return name;
}`;
		const r = diff(oldCode, newCode, { filename: "greet.ts" });
		expect(r.output).toContain("greet.ts");
		expect(r.hunks).toBeGreaterThanOrEqual(1);
		expect(r.additions + r.deletions).toBeGreaterThan(0);
	});

	it("renders CSS edits", () => {
		const oldCss = `.btn {
  color: black;
  padding: 4px;
}`;
		const newCss = `.btn {
  color: white;
  padding: 8px;
  border-radius: 4px;
}`;
		const r = diff(oldCss, newCss, { filename: "styles.css" });
		expect(r.additions).toBeGreaterThan(0);
		expect(r.deletions).toBeGreaterThan(0);
	});

	it("renders large file changes with multiple hunks", () => {
		const oldFile = Array.from({ length: 100 }, (_, i) => `line${i}`).join("\n");
		const newFile = Array.from({ length: 100 }, (_, i) =>
			i === 20 || i === 80 ? `CHANGED${i}` : `line${i}`,
		).join("\n");
		const r = diff(oldFile, newFile, { context: 2 });
		expect(r.hunks).toBeGreaterThanOrEqual(2);
	});
});
