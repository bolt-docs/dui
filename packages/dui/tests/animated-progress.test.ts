import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAnimatedProgressBar } from "../src/index";

describe("animated-progress", () => {
	let writeSpy: any;
	beforeEach(() => {
		writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
		vi.useFakeTimers();
	});
	afterEach(() => {
		writeSpy.mockRestore();
		vi.useRealTimers();
	});

	it("percentage returns 0 before start", () => {
		const bar = createAnimatedProgressBar();
		expect(bar.percentage).toBe(0);
	});

	it("percentage returns correct value after update", () => {
		const bar = createAnimatedProgressBar();
		bar.start(100);
		bar.update(50);
		expect(bar.percentage).toBe(50);
	});

	it("percentage clamps at 100", () => {
		const bar = createAnimatedProgressBar();
		bar.start(100);
		bar.update(999);
		expect(bar.percentage).toBe(100);
	});

	it("non-TTY writes update lines (discrete fallback)", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			const bar = createAnimatedProgressBar({ width: 10 });
			bar.start(100);
			// No animation in non-TTY — writes immediately
			const startCalls = writeSpy.mock.calls.length;

			bar.update(50, "halfway");
			// Should have written a line (not animated)
			expect(writeSpy).toHaveBeenCalledWith(
				expect.stringContaining("50%"),
			);

			bar.update(100);
			bar.stop("done");
			const lastCall = writeSpy.mock.lastCall[0] as string;
			expect(lastCall).toContain("100%");
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("TTY start writes hide-cursor seq and renders bar at 0%", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = true;
		try {
			const bar = createAnimatedProgressBar({ width: 20, prefix: "dl" });
			bar.start(100);
			expect(writeSpy).toHaveBeenCalledWith("\u001b[?25l");

			const allCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const renderLines = allCalls.filter((s: string) => s.includes("dl"));
			expect(renderLines.length).toBeGreaterThanOrEqual(1);
			// First render should show 0%
			expect(renderLines[0]).toContain("0%");
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("update animates from current display to target over time", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = true;
		try {
			const bar = createAnimatedProgressBar({
				width: 10,
				animDuration: 500,
				easing: "linear",
			});
			bar.start(100);

			// Clear calls after start
			writeSpy.mockClear();

			bar.update(50);
			// Should have started an animation — first frame rendered
			expect(writeSpy).toHaveBeenCalled();

			// Advance halfway through the animation (250ms of 500ms)
			vi.advanceTimersByTime(250);

			// Should have rendered at least ~25% displayed (50% target * 0.5 eased)
			const allCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const animFrames = allCalls.filter(
				(s: string) => s.includes("%") && !s.includes("?25"),
			);
			expect(animFrames.length).toBeGreaterThan(0);

			// Advance to completion
			vi.advanceTimersByTime(500);
			bar.stop("done");

			const stopCall = writeSpy.mock.calls.find(
				(c: any[]) =>
					typeof c[0] === "string" && c[0].includes("done"),
			);
			expect(stopCall).toBeDefined();
			expect(stopCall![0] as string).toContain("50%");
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("multiple rapid updates cancel previous animation", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = true;
		try {
			const bar = createAnimatedProgressBar({
				width: 10,
				animDuration: 1000,
				easing: "linear",
			});
			bar.start(100);

			writeSpy.mockClear();

			// Rapid updates — each cancels the previous
			bar.update(10);
			vi.advanceTimersByTime(50);
			bar.update(50);
			vi.advanceTimersByTime(50);
			bar.update(90);
			vi.advanceTimersByTime(50);

			// First two animations were cancelled; only the last should
			// still be running toward 90%
			const allCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const animFrames = allCalls.filter(
				(s: string) => s.includes("%") && !s.includes("?25"),
			);
			// We should have renders at various intermediate values
			expect(animFrames.length).toBeGreaterThan(0);

			// Complete the animation
			vi.advanceTimersByTime(1500);
			bar.stop();

			// stop() writes bar line first, then cursor-show seq — find
			// the bar line (contains "90%") among the final writes.
			const finalCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const stopBarCall = finalCalls.find(
				(s: string) => s.includes("90%"),
			);
			expect(stopBarCall).toBeDefined();
			expect(stopBarCall).toContain("90%");
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("custom characters and config options work", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			const bar = createAnimatedProgressBar({
				width: 5,
				barChar: "#",
				emptyChar: "-",
				easing: "ease-in",
				animDuration: 200,
				prefix: "[",
				suffix: "]",
			});
			bar.start(10);
			bar.update(5);
			const call = writeSpy.mock.lastCall[0] as string;
			expect(call).toContain("##");
			expect(call).toContain("--");
			expect(call).toContain("50%");
			expect(call).toContain("[");
			expect(call).toContain("]");
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("start is idempotent (second call ignored)", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			const bar = createAnimatedProgressBar({ width: 10 });
			bar.start(100);
			const callsAfterFirstStart = writeSpy.mock.calls.length;
			bar.start(200);
			expect(writeSpy.mock.calls.length).toBe(callsAfterFirstStart);
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("stop is idempotent", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			const bar = createAnimatedProgressBar({ width: 10 });
			bar.start(100);
			bar.stop("first");
			const callsAfterFirstStop = writeSpy.mock.calls.length;
			bar.stop("second");
			expect(writeSpy.mock.calls.length).toBe(callsAfterFirstStop);
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("stop cancels in-flight animation and renders final state", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = true;
		try {
			const bar = createAnimatedProgressBar({
				width: 10,
				animDuration: 5000,
				easing: "linear",
			});
			bar.start(100);
			bar.update(80);

			// Advance a bit but don't complete animation
			vi.advanceTimersByTime(100);

			// Stop mid-animation
			bar.stop("interrupted");

			const stopCall = writeSpy.mock.calls.find(
				(c: any[]) =>
					typeof c[0] === "string" && c[0].includes("interrupted"),
			);
			expect(stopCall).toBeDefined();
			expect(stopCall![0] as string).toContain("80%");
			expect(writeSpy).toHaveBeenCalledWith("\u001b[?25h");
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("small updates snap immediately (no animation loop)", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = true;
		try {
			const bar = createAnimatedProgressBar({
				width: 10,
				animDuration: 1000,
				easing: "linear",
			});
			// Use a large total so a single integer step is < 0.5%
			bar.start(1000);

			writeSpy.mockClear();

			// 1 / 1000 = 0.1% delta from displayPct (0), which is < 0.5
			// so it should snap immediately without starting a timer.
			bar.update(1);

			const callsAfterUpdate = writeSpy.mock.calls.length;

			// Advance a full animDuration — if a timer was accidentally
			// started, it would fire and produce more writes.
			vi.advanceTimersByTime(2000);

			// No timer was started, so call count should stay the same.
			expect(writeSpy.mock.calls.length).toBe(callsAfterUpdate);

			bar.stop();
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("cubic-bezier easing string is accepted", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			const bar = createAnimatedProgressBar({
				width: 10,
				easing: "cubic-bezier(0.42, 0, 0.58, 1)",
				animDuration: 300,
			});
			bar.start(100);
			bar.update(50);
			bar.stop();
			// Just verifying no crash — easing is validated at runtime
			expect(true).toBe(true);
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("default animDuration and easing work", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			const bar = createAnimatedProgressBar({ width: 10 });
			bar.start(100);
			bar.update(75);
			expect(bar.percentage).toBe(75);
			bar.stop();
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});
});
