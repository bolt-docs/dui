import { stripAnsi } from "@bdocs/dui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { animateChart, bar, column, line, pie, sparkline } from "../src/index";
import {
	applyColor,
	barColor,
	clamp,
	formatNumber,
	padEnd,
	repeat,
	scale,
} from "../src/utils";

// ── Utility functions ───────────────────────────────────────────

describe("clamp", () => {
	it("clamps values within range", () => {
		expect(clamp(5, 0, 10)).toBe(5);
		expect(clamp(-1, 0, 10)).toBe(0);
		expect(clamp(15, 0, 10)).toBe(10);
	});

	it("handles edge values", () => {
		expect(clamp(0, 0, 10)).toBe(0);
		expect(clamp(10, 0, 10)).toBe(10);
	});
});

describe("scale", () => {
	it("scales linearly", () => {
		expect(scale(5, 0, 10, 0, 100)).toBe(50);
		expect(scale(0, 0, 10, 0, 100)).toBe(0);
		expect(scale(10, 0, 10, 0, 100)).toBe(100);
	});

	it("returns toMin when from range is zero", () => {
		expect(scale(5, 10, 10, 0, 100)).toBe(0);
	});

	it("handles negative ranges", () => {
		expect(scale(0, -10, 10, 0, 100)).toBe(50);
	});
});

describe("formatNumber", () => {
	it("formats with locale separators", () => {
		expect(formatNumber(1000)).toBe("1,000");
		expect(formatNumber(1234567)).toBe("1,234,567");
	});

	it("formats small numbers", () => {
		expect(formatNumber(0)).toBe("0");
		expect(formatNumber(42)).toBe("42");
		expect(formatNumber(-5)).toBe("-5");
	});

	it("formats decimals", () => {
		expect(formatNumber(3.14)).toBe("3.14");
	});
});

describe("repeat", () => {
	it("repeats character n times", () => {
		expect(repeat("█", 5)).toBe("█████");
		expect(repeat("-", 0)).toBe("");
	});

	it("returns empty string for negative count", () => {
		expect(repeat("x", -1)).toBe("");
	});
});

describe("padEnd", () => {
	it("pads string to desired length", () => {
		expect(padEnd("hi", 5)).toBe("hi   ");
		expect(padEnd("hello", 3)).toBe("hello");
	});

	it("uses custom fill character", () => {
		expect(padEnd("x", 4, ".")).toBe("x...");
	});
});

describe("barColor", () => {
	it("cycles through palette", () => {
		expect(barColor(0)).toBe("#00d4aa");
		expect(barColor(1)).toBe("#ff8c42");
		expect(barColor(5)).toBe(barColor(0)); // cycles
	});

	it("handles index modulo", () => {
		expect(barColor(5)).toBe("#00d4aa");
		expect(barColor(6)).toBe("#ff8c42");
	});
});

describe("applyColor", () => {
	it("applies ANSI color", () => {
		const result = applyColor("text", "#ff0000");
		expect(result).toContain("\x1b[");
		expect(result).toContain("text");
	});

	it("returns text unchanged when no color", () => {
		expect(applyColor("hello")).toBe("hello");
	});
});

// ── Chart components ────────────────────────────────────────────

describe("bar", () => {
	it("renders bars with proportional widths", () => {
		const result = bar([100, 50, 25], {
			labels: ["A", "B", "C"],
			width: 40,
		});
		const clean = stripAnsi(result);
		expect(clean).toContain("A");
		expect(clean).toContain("B");
		expect(clean).toContain("C");
	});

	it("returns empty for empty data", () => {
		expect(bar([])).toBe("");
	});

	it("respects progress option", () => {
		const full = bar([100], { width: 40 });
		const half = bar([100], { width: 40, progress: 0.5 });
		expect(stripAnsi(full).length).toBeGreaterThan(0);
		expect(stripAnsi(half).length).toBeGreaterThan(0);
	});

	it("handles zero values", () => {
		const result = bar([0, 0], { labels: ["A", "B"], width: 40 });
		expect(stripAnsi(result)).toContain("A");
	});

	it("renders with title", () => {
		const result = bar([10, 20], {
			title: "Scores",
			labels: ["A", "B"],
			width: 40,
		});
		const clean = stripAnsi(result);
		expect(clean).toContain("Scores");
		expect(clean).toContain("A");
		expect(clean).toContain("B");
	});

	it("renders with custom color", () => {
		const result = bar([50], { color: "#ff0000", width: 40 });
		expect(result).toContain("\x1b[");
	});

	it("renders single value", () => {
		const result = bar([99], { width: 40 });
		expect(stripAnsi(result).length).toBeGreaterThan(0);
	});
});

describe("column", () => {
	it("renders columns with correct height", () => {
		const result = column([10, 20, 30], {
			labels: ["A", "B", "C"],
			height: 6,
		});
		const clean = stripAnsi(result);
		expect(clean).toContain("A");
		expect(clean).toContain("B");
	});

	it("returns empty for empty data", () => {
		expect(column([])).toBe("");
	});

	it("respects progress", () => {
		const result = column([100], { progress: 0 });
		expect(result).not.toContain("█");
	});

	it("renders with custom color", () => {
		const result = column([10, 20], {
			color: "#6c5ce7",
			height: 4,
		});
		expect(result).toContain("\x1b[");
	});

	it("handles single column", () => {
		const result = column([100], { height: 4 });
		expect(stripAnsi(result).length).toBeGreaterThan(0);
	});

	it("handles all equal values", () => {
		const result = column([50, 50, 50], {
			labels: ["A", "B", "C"],
			height: 4,
		});
		const clean = stripAnsi(result);
		expect(clean).toContain("A");
		expect(clean).toContain("B");
		expect(clean).toContain("C");
	});
});

describe("line", () => {
	it("renders line chart", () => {
		const result = line([1, 3, 2, 5, 4], {
			width: 10,
			height: 4,
			labels: ["A", "E"],
		});
		expect(stripAnsi(result).length).toBeGreaterThan(0);
	});

	it("returns values for < 2 data points", () => {
		const result = line([42]);
		expect(stripAnsi(result)).toBe("42");
	});

	it("returns empty for 0 data points", () => {
		const result = line([]);
		expect(result).toBe("");
	});

	it("renders area fill", () => {
		const result = line([1, 3, 2], { width: 6, height: 4, fill: true });
		expect(stripAnsi(result).length).toBeGreaterThan(0);
	});

	it("renders with custom color", () => {
		const result = line([1, 2, 3], {
			color: "#6c5ce7",
			width: 10,
			height: 4,
		});
		expect(result).toContain("\x1b[");
	});

	it("renders with progress at boundaries", () => {
		const zero = line([1, 2, 3], { progress: 0, width: 10, height: 4 });
		const full = line([1, 2, 3], { progress: 1, width: 10, height: 4 });
		expect(stripAnsi(zero).length).toBeGreaterThan(0);
		expect(stripAnsi(full).length).toBeGreaterThan(0);
	});

	it("renders with longer datasets", () => {
		const data = Array.from(
			{ length: 20 },
			(_, i) => Math.sin(i * 0.5) * 10 + 10,
		);
		const result = line(data, { width: 16, height: 6 });
		expect(stripAnsi(result).length).toBeGreaterThan(0);
	});
});

describe("pie", () => {
	it("renders pie slices", () => {
		const result = pie([
			{ label: "JS", value: 50 },
			{ label: "TS", value: 30 },
			{ label: "Py", value: 20 },
		]);
		const clean = stripAnsi(result);
		expect(clean).toContain("JS");
		expect(clean).toContain("TS");
		expect(clean).toContain("Py");
		expect(clean).toContain("%");
	});

	it("returns empty for empty data", () => {
		expect(pie([])).toBe("");
	});

	it("returns empty for zero total", () => {
		expect(pie([{ label: "A", value: 0 }])).toBe("");
	});

	it("respects progress", () => {
		const result = pie(
			[
				{ label: "A", value: 60 },
				{ label: "B", value: 40 },
			],
			{ progress: 0.5 },
		);
		const clean = stripAnsi(result);
		expect(clean).toContain("%");
	});

	it("renders single slice", () => {
		const result = pie([{ label: "Solo", value: 100 }]);
		const clean = stripAnsi(result);
		expect(clean).toContain("Solo");
		expect(clean).toContain("%");
	});

	it("renders with progress at 0", () => {
		const result = pie(
			[
				{ label: "A", value: 60 },
				{ label: "B", value: 40 },
			],
			{ progress: 0 },
		);
		expect(stripAnsi(result)).toContain("0.0%");
	});
});

describe("sparkline", () => {
	it("renders sparkline characters", () => {
		const result = sparkline([1, 2, 3, 4, 5, 6, 7, 8]);
		expect(result.length).toBeGreaterThan(0);
		expect(result).toContain("▁");
	});

	it("returns empty for empty data", () => {
		expect(sparkline([])).toBe("");
	});

	it("applies color", () => {
		const colored = sparkline([1, 2, 3], { color: "#ff0000" });
		expect(colored).toContain("\x1b[");
	});

	it("respects progress", () => {
		const full = sparkline([10, 20, 30]);
		const zero = sparkline([10, 20, 30], { progress: 0 });
		expect(stripAnsi(full)).not.toBe(stripAnsi(zero));
	});

	it("handles equal values", () => {
		const result = sparkline([5, 5, 5, 5]);
		expect(result.length).toBeGreaterThan(0);
	});

	it("handles single value", () => {
		const result = sparkline([42]);
		expect(result.length).toBeGreaterThan(0);
	});

	it("respects custom width", () => {
		const result = sparkline([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], { width: 5 });
		expect(result.length).toBeLessThanOrEqual(5);
	});
});

describe("animateChart", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("calls onFrame with increasing progress", () => {
		const onFrame = vi.fn();
		const handle = animateChart({ duration: 100, onFrame });

		vi.advanceTimersByTime(16);
		expect(onFrame).toHaveBeenCalled();
		expect(onFrame.mock.calls[0][0]).toBeGreaterThanOrEqual(0);

		handle.stop();
	});

	it("stops calling onFrame after stop", () => {
		const onFrame = vi.fn();
		const handle = animateChart({ duration: 100, onFrame });

		handle.stop();
		vi.advanceTimersByTime(100);
		// Only the initial call (from tick()) should have happened
		expect(onFrame).toHaveBeenCalledTimes(1);
	});

	it("accepts custom easing", () => {
		const onFrame = vi.fn();
		const handle = animateChart({ duration: 100, easing: "ease-in", onFrame });
		vi.advanceTimersByTime(16);
		expect(onFrame).toHaveBeenCalled();
		expect(onFrame.mock.calls[0][0]).toBeGreaterThanOrEqual(0);
		handle.stop();
	});

	it("accepts custom easing function", () => {
		const onFrame = vi.fn();
		const customEasing = (t: number) => t * t * t;
		const handle = animateChart({
			duration: 100,
			easing: customEasing,
			onFrame,
		});
		vi.advanceTimersByTime(16);
		expect(onFrame).toHaveBeenCalled();
		handle.stop();
	});

	it("loops when loop is enabled", () => {
		const onFrame = vi.fn();
		const handle = animateChart({ duration: 50, loop: true, onFrame });

		// Advance past duration + some extra
		vi.advanceTimersByTime(120);

		// Should have been called multiple times (loop resets)
		expect(onFrame.mock.calls.length).toBeGreaterThan(1);
		handle.stop();
	});
});
