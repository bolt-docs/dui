import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	applyDiff,
	applyHunks,
	parseDiff,
	reviewDiff,
	serializeHunk,
	serializeHunks,
} from "../src/index";

// Same TTY-override dance as the core's select tests: Node 22 exposes
// `isTTY` as a getter-only inherited property, so direct assignment
// throws. Override with Object.defineProperty and delete afterwards.
function setTTY(value: boolean): void {
	Object.defineProperty(process.stdin, "isTTY", {
		value,
		writable: true,
		configurable: true,
	});
	Object.defineProperty(process.stdout, "isTTY", {
		value,
		writable: true,
		configurable: true,
	});
}

function clearTTYOverride(): void {
	delete (process.stdin as { isTTY?: boolean }).isTTY;
	delete (process.stdout as { isTTY?: boolean }).isTTY;
}

// Content with two well-separated changes → two hunks.
const OLD = Array.from({ length: 60 }, (_, i) => `L${i}`).join("\n");
const NEW = OLD.split("\n")
	.map((l, i) => (i === 10 ? "C1" : i === 40 ? "C2" : l))
	.join("\n");

describe("parseDiff", () => {
	it("returns zero hunks for identical content", () => {
		const r = parseDiff("a\nb", "a\nb");
		expect(r.hunks).toHaveLength(0);
		expect(r.additions).toBe(0);
		expect(r.deletions).toBe(0);
	});

	it("splits separated changes into multiple hunks", () => {
		const r = parseDiff(OLD, NEW);
		expect(r.hunks.length).toBeGreaterThanOrEqual(2);
	});

	it("counts per-hunk and total stats", () => {
		const r = parseDiff("a\nb\nc", "a\nB\nC\nD");
		expect(r.additions).toBeGreaterThanOrEqual(1);
		expect(r.deletions).toBeGreaterThanOrEqual(1);
		const sum = r.hunks.reduce((s, h) => s + h.additions + h.deletions, 0);
		expect(sum).toBe(r.additions + r.deletions);
	});

	it("exposes raw and stripped line views", () => {
		const r = parseDiff("x", "y");
		const h = r.hunks[0];
		expect(h).toBeDefined();
		expect(h.lines.some((l) => l.startsWith("-x"))).toBe(true);
		expect(h.lines.some((l) => l.startsWith("+y"))).toBe(true);
		expect(h.content.some((c) => c === "x")).toBe(true);
		expect(h.content.some((c) => c === "y")).toBe(true);
	});

	it("respects the context option", () => {
		const small = parseDiff(OLD, NEW, { context: 1 });
		const large = parseDiff(OLD, NEW, { context: 5 });
		expect(large.hunks[0].lines.length).toBeGreaterThan(
			small.hunks[0].lines.length,
		);
	});

	it("tracks hunk start positions", () => {
		const r = parseDiff(OLD, NEW);
		const starts = r.hunks.map((h) => h.oldStart).sort((a, b) => a - b);
		expect(starts[0]).toBeLessThan(starts[1] ?? Infinity);
	});
});

describe("serializeHunk / serializeHunks", () => {
	it("serializes a hunk back to unified format", () => {
		const r = parseDiff("a\nb\nc", "a\nB\nc");
		const text = serializeHunk(r.hunks[0]);
		expect(text).toMatch(/^@@ -\d+,\d+ \+\d+,\d+ @@\n/);
		expect(text).toContain("-b\n");
		expect(text).toContain("+B\n");
	});

	it("handles zero-line hunks (pure insert/delete)", () => {
		const added = parseDiff("", "x\ny");
		expect(serializeHunk(added.hunks[0])).toMatch(/@@ -0,0 \+1,\d+ @@/);
		const removed = parseDiff("x\ny", "");
		expect(serializeHunk(removed.hunks[0])).toMatch(/@@ -1,\d+ \+0,0 @@/);
	});

	it("returns only selected hunks from serializeHunks", () => {
		const r = parseDiff(OLD, NEW);
		const text = serializeHunks(r.hunks, [true, false]);
		expect(text).toContain(`@@ -${r.hunks[0].oldStart}`);
		expect(text).not.toContain(`@@ -${r.hunks[1].oldStart}`);
	});

	it("returns empty string when nothing is selected", () => {
		const r = parseDiff(OLD, NEW);
		expect(serializeHunks(r.hunks, [false, false])).toBe("");
	});
});

describe("applyHunks", () => {
	it("returns the original content when nothing is selected", () => {
		const r = parseDiff(OLD, NEW);
		expect(applyHunks(OLD, r.hunks, [false, false])).toBe(OLD);
	});

	it("applies only the selected hunk", () => {
		const r = parseDiff(OLD, NEW);
		const out = applyHunks(OLD, r.hunks, [false, true]);
		const lines = out.split("\n");
		expect(lines[10]).toBe("L10"); // hunk 0 untouched
		expect(lines[40]).toBe("C2"); // hunk 1 applied
	});

	it("applies multiple hunks at once", () => {
		const r = parseDiff(OLD, NEW);
		const out = applyHunks(OLD, r.hunks, [true, true]);
		const lines = out.split("\n");
		expect(lines[10]).toBe("C1");
		expect(lines[40]).toBe("C2");
	});

	it("round-trips to the full new content when everything is applied", () => {
		const r = parseDiff(OLD, NEW);
		expect(applyHunks(OLD, r.hunks, [true, true])).toBe(NEW);
	});

	it("preserves a trailing newline", () => {
		const oldText = "a\nb\nc\n";
		const newText = "a\nB\nc\n";
		const r = parseDiff(oldText, newText);
		const out = applyHunks(oldText, r.hunks, [true]);
		expect(out).toBe(newText);
	});

	it("handles pure additions and deletions", () => {
		const add = parseDiff("", "x\ny\nz");
		expect(applyHunks("", add.hunks, [true])).toBe("x\ny\nz");
		const del = parseDiff("x\ny\nz", "");
		expect(applyHunks("x\ny\nz", del.hunks, [true])).toBe("");
	});

	it("applies multiple hunks with shifted offsets", () => {
		// Change at line 4 and line 16 with context 3 → two non-adjacent
		// hunks. Applying only the SECOND one must land at the correct
		// offset, proving applyPatch's offset tracking works.
		const oldText = Array.from({ length: 24 }, (_, i) => `L${i}`).join("\n");
		const newText = oldText
			.split("\n")
			.map((l, i) => (i === 4 ? "X" : i === 16 ? "Y" : l))
			.join("\n");
		const r = parseDiff(oldText, newText, { context: 3 });
		expect(r.hunks.length).toBe(2);
		const out = applyHunks(oldText, r.hunks, [true, true]);
		expect(out).toBe(newText);
		const onlySecond = applyHunks(oldText, r.hunks, [false, true]);
		expect(onlySecond.split("\n")[4]).toBe("L4");
		expect(onlySecond.split("\n")[16]).toBe("Y");
	});
});

describe("reviewDiff (non-TTY)", () => {
	beforeEach(() => {
		setTTY(false);
	});

	afterEach(() => {
		clearTTYOverride();
		vi.restoreAllMocks();
	});

	it("applies nothing by default", async () => {
		const r = await reviewDiff(OLD, NEW);
		expect(r.applied.every((a) => !a)).toBe(true);
		expect(r.output).toBe(OLD);
		expect(r.changed).toBe(false);
		expect(r.cancelled).toBe(false);
		expect(r.patch).toBe("");
	});

	it("applies everything with defaultApply", async () => {
		const r = await reviewDiff(OLD, NEW, { defaultApply: true });
		expect(r.applied.every(Boolean)).toBe(true);
		expect(r.output).toBe(NEW);
		expect(r.changed).toBe(true);
		expect(r.additions).toBe(2);
		expect(r.deletions).toBe(2);
	});

	it("respects the disable option on a TTY", async () => {
		setTTY(true);
		const r = await reviewDiff(OLD, NEW, { disable: true, defaultApply: true });
		expect(r.output).toBe(NEW);
	});
});	describe("reviewDiff (interactive)", () => {
	let dataHandler: ((data: string | Buffer) => void) | undefined;

	beforeEach(() => {
		setTTY(true);
		dataHandler = undefined;
		if (typeof (process.stdin as any).setRawMode !== "function") {
			(process.stdin as any).setRawMode = vi.fn();
		}
		vi.spyOn(process.stdin, "on").mockImplementation(
			(event: any, handler: any) => {
				if (event === "data") dataHandler = handler;
				return process.stdin;
			},
		);
		vi.spyOn(process.stdin, "removeListener").mockImplementation(() => {
			return process.stdin;
		});
		vi.spyOn(process.stdin as any, "setRawMode").mockImplementation(
			() => process.stdin,
		);
		vi.spyOn(process.stdin, "setEncoding").mockImplementation(() => {
			return process.stdin;
		});
		vi.spyOn(process.stdout, "write").mockImplementation(() => true);
		vi.spyOn(process.stdout, "isTTY", "get").mockReturnValue(true);
	});

	afterEach(() => {
		clearTTYOverride();
		vi.restoreAllMocks();
	});

	function writeData(str: string) {
		if (dataHandler) dataHandler(Buffer.from(str, "utf8"));
	}

	it("applies a hunk with 'a' and moves to the next", async () => {
		const promise = reviewDiff(OLD, NEW);
		writeData("a"); // apply hunk 0, focus moves to hunk 1
		writeData("q"); // quit with selection
		const r = await promise;
		expect(r.applied).toEqual([true, false]);
		expect(r.output.split("\n")[10]).toBe("C1");
		expect(r.output.split("\n")[40]).toBe("L40");
		expect(r.changed).toBe(true);
		expect(r.cancelled).toBe(false);
	});

	it("discards with 'd'", async () => {
		const promise = reviewDiff(OLD, NEW);
		writeData("d"); // discard hunk 0
		writeData("a"); // apply hunk 1
		writeData("\r"); // enter finishes
		const r = await promise;
		expect(r.applied).toEqual([false, true]);
		expect(r.output.split("\n")[10]).toBe("L10");
		expect(r.output.split("\n")[40]).toBe("C2");
	});

	it("applies all with 'A'", async () => {
		const promise = reviewDiff(OLD, NEW);
		writeData("A");
		const r = await promise;
		expect(r.applied.every(Boolean)).toBe(true);
		expect(r.output).toBe(NEW);
	});

	it("discards all with 'D'", async () => {
		const promise = reviewDiff(OLD, NEW);
		writeData("a");
		writeData("D");
		const r = await promise;
		expect(r.applied.every((a) => !a)).toBe(true);
		expect(r.output).toBe(OLD);
	});

	it("navigates with j/k and keeps decisions", async () => {
		const promise = reviewDiff(OLD, NEW);
		writeData("j"); // to hunk 1
		writeData("a"); // apply hunk 1
		writeData("k"); // back to hunk 0
		writeData("q");
		const r = await promise;
		expect(r.applied).toEqual([false, true]);
	});

	it("supports arrow-key navigation", async () => {
		const promise = reviewDiff(OLD, NEW);
		writeData("\x1b[B"); // down → hunk 1
		writeData("a");
		writeData("q");
		const r = await promise;
		expect(r.applied).toEqual([false, true]);
	});

	it("cancels with Ctrl+C (nothing applied)", async () => {
		const promise = reviewDiff(OLD, NEW);
		writeData("a");
		writeData("\x03");
		const r = await promise;
		expect(r.cancelled).toBe(true);
		expect(r.applied.every((a) => !a)).toBe(true);
		expect(r.output).toBe(OLD);
	});

	it("returns immediately when there are no hunks", async () => {
		const promise = reviewDiff("same", "same");
		const r = await promise;
		expect(r.review.hunks).toHaveLength(0);
		expect(r.applied).toEqual([]);
		expect(r.changed).toBe(false);
	});
});

describe("applyDiff", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("writes only changed files", async () => {
		setTTY(false);
		const written: string[] = [];
		const writeFile = vi.fn(async (p: string, c: string) => {
			written.push(`${p}:${c}`);
		});
		const result = await applyDiff(
			[
				{
					path: "a.txt",
					oldContent: "x",
					newContent: "y",
					options: { defaultApply: true },
				},
				{
					path: "b.txt",
					oldContent: "same",
					newContent: "same",
					options: { defaultApply: true },
				},
			],
			{ writeFile },
		);
		expect(result.changedFiles).toBe(1);
		expect(result.skippedFiles).toBe(1);
		expect(writeFile).toHaveBeenCalledTimes(1);
		expect(written[0]).toContain("a.txt");
		clearTTYOverride();
	});

	it("does not write anything in dry-run mode", async () => {
		setTTY(false);
		const writeFile = vi.fn(async () => {});
		const result = await applyDiff(
			[
				{
					path: "a.txt",
					oldContent: "x",
					newContent: "y",
					options: { defaultApply: true },
				},
			],
			{ writeFile, dryRun: true },
		);
		expect(result.changedFiles).toBe(1);
		expect(writeFile).not.toHaveBeenCalled();
		clearTTYOverride();
	});
});
