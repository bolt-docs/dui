import { describe, expect, it } from "vitest";
import { detectMoves } from "../src/move";

function removed(
	lines: string[],
	start = 1,
): Array<{ text: string; lineNo: number }> {
	return lines.map((text, i) => ({ text, lineNo: start + i }));
}

function added(
	lines: string[],
	start = 1,
): Array<{ text: string; lineNo: number }> {
	return lines.map((text, i) => ({ text, lineNo: start + i }));
}

describe("detectMoves", () => {
	it("matches an identical block moved within the file", () => {
		const block = ["function handleClick() {", "  return true;", "}"];
		const moves = detectMoves(removed(block, 10), added(block, 42));
		expect(moves).toHaveLength(1);
		expect(moves[0].source.startLine).toBe(10);
		expect(moves[0].dest.startLine).toBe(42);
	});

	it("returns empty when there are no matching blocks", () => {
		const moves = detectMoves(
			removed(["import { a } from './a'"]),
			added(["import { b } from './b'"]),
		);
		expect(moves).toHaveLength(0);
	});

	it("respects minLines by ignoring small blocks", () => {
		const moves = detectMoves(
			removed(["one", "two"], 5),
			added(["one", "two"], 20),
			{ minLines: 3 },
		);
		expect(moves).toHaveLength(0);
	});

	it("still matches when minLines is set to 1", () => {
		const moves = detectMoves(removed(["single"], 5), added(["single"], 20), {
			minLines: 1,
		});
		expect(moves).toHaveLength(1);
	});

	it("matches blocks separated by unchanged content", () => {
		const blockA = ["const a = 1;", "const b = 2;", "const c = 3;"];
		const moves = detectMoves(removed(blockA, 1), [
			...added(blockA, 2),
			...added(["const kept = 0;"], 20),
		]);
		expect(moves).toHaveLength(1);
		expect(moves[0].source.startLine).toBe(1);
		expect(moves[0].dest.startLine).toBe(2);
	});

	it("matches the LAST occurrence of a duplicate destination", () => {
		const block = ["fn moveTarget() {", "  return 42;", "}"];
		const moves = detectMoves(removed(block, 10), [
			...added(block, 1),
			...added(block, 30),
		]);
		expect(moves).toHaveLength(1);
		expect(moves[0].dest.startLine).toBe(30);
	});

	it("deduplicates when several removed blocks share a hash", () => {
		const block = ["x = 1", "y = 2", "z = 3"];
		const moves = detectMoves(
			[...removed(block, 1), ...removed(block, 10)],
			added(block, 50),
		);
		expect(moves).toHaveLength(1);
		expect(moves[0].source.startLine).toBe(1);
	});

	it("returns empty when either side is empty", () => {
		expect(detectMoves([], added(["a", "b", "c"]))).toHaveLength(0);
		expect(detectMoves(removed(["a", "b", "c"]), [])).toHaveLength(0);
	});

	it("defaults minLines to 3", () => {
		const moves = detectMoves(removed(["a", "b"], 1), added(["a", "b"], 10));
		expect(moves).toHaveLength(0);

		const bigger = detectMoves(
			removed(["a", "b", "c"], 1),
			added(["a", "b", "c"], 10),
		);
		expect(bigger).toHaveLength(1);
	});
});
