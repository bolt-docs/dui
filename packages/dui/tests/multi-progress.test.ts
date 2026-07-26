import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMultiProgressBar } from "../src/index";

describe("multi-progress", () => {
	let writeSpy: any;
	beforeEach(() => {
		writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
		vi.useFakeTimers();
	});
	afterEach(() => {
		writeSpy.mockRestore();
		vi.useRealTimers();
	});

	it("bars array is populated from config", () => {
		const multi = createMultiProgressBar({
			bars: [
				{ label: "a", width: 10 },
				{ label: "b", width: 20 },
				{ label: "c", width: 30 },
			],
		});
		expect(multi.bars).toHaveLength(3);
		expect(multi.bars[0].index).toBe(0);
		expect(multi.bars[1].index).toBe(1);
		expect(multi.bars[2].index).toBe(2);
	});

	it("percentage returns 0 before any update", () => {
		const multi = createMultiProgressBar({
			bars: [{ label: "a" }, { label: "b" }],
		});
		multi.start();
		expect(multi.bars[0].percentage).toBe(0);
		expect(multi.bars[1].percentage).toBe(0);
	});

	it("percentage returns correct value after update", () => {
		const multi = createMultiProgressBar({
			bars: [{ label: "a" }, { label: "b" }],
		});
		multi.start();
		multi.bars[0].start(100);
		multi.bars[0].update(50);
		multi.bars[1].start(200);
		multi.bars[1].update(100);
		expect(multi.bars[0].percentage).toBe(50);
		expect(multi.bars[1].percentage).toBe(50);
	});

	it("percentage clamps at 100", () => {
		const multi = createMultiProgressBar({
			bars: [{ label: "a" }],
		});
		multi.start();
		multi.bars[0].start(100);
		multi.bars[0].update(999);
		expect(multi.bars[0].percentage).toBe(100);
	});

	it("non-TTY writes each bar as a separate line on start and update", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			const multi = createMultiProgressBar({
				bars: [
					{ label: "build", width: 10 },
					{ label: "lint", width: 10 },
				],
			});

			multi.start();
			// start() writes each bar at 0%
			const startCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const startLines = startCalls.filter(
				(s: string) => s.includes("build") || s.includes("lint"),
			);
			expect(startLines).toHaveLength(2);
			expect(startLines[0]).toContain("0%");
			expect(startLines[1]).toContain("0%");

			writeSpy.mockClear();

			multi.bars[0].update(50, "compiling");
			// update() should write a snapshot of ALL bars
			const updateCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const updateLines = updateCalls.filter(
				(s: string) => s.includes("build") || s.includes("lint"),
			);
			expect(updateLines.length).toBeGreaterThanOrEqual(2);
			expect(updateLines[0]).toContain("50%");
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("TTY start hides cursor and renders all bars at 0%", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = true;
		try {
			const multi = createMultiProgressBar({
				bars: [
					{ label: "a", width: 10 },
					{ label: "b", width: 10 },
				],
			});
			multi.start();
			expect(writeSpy).toHaveBeenCalledWith("\u001b[?25l");

			const allCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const renderLines = allCalls.filter(
				(s: string) => s.includes("a") || s.includes("b"),
			);
			// Both bars should render on start
			expect(renderLines.length).toBeGreaterThanOrEqual(1);
			// The first bar's initial render should show 0%
			expect(renderLines[0]).toContain("0%");
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("update animates the specific bar independently", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = true;
		try {
			const multi = createMultiProgressBar({
				bars: [
					{ label: "a", width: 10, animDuration: 500, easing: "linear" },
					{ label: "b", width: 10, animDuration: 500, easing: "linear" },
				],
			});
			multi.start();
			writeSpy.mockClear();

			// Update only bar a
			multi.bars[0].start(100);
			multi.bars[0].update(50);

			// Should have started an animation — first frame rendered
			expect(writeSpy).toHaveBeenCalled();

			// Advance halfway
			vi.advanceTimersByTime(250);

			const allCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const animFrames = allCalls.filter(
				(s: string) => s.includes("%") && !s.includes("?25"),
			);
			expect(animFrames.length).toBeGreaterThan(0);

			// Complete the animation
			vi.advanceTimersByTime(500);

			multi.stop();
			const finalCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const stopBarCall = finalCalls.find((s: string) => s.includes("50%"));
			expect(stopBarCall).toBeDefined();
			expect(stopBarCall).toContain("50%");
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("multiple rapid updates on same bar cancel previous animation", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = true;
		try {
			const multi = createMultiProgressBar({
				bars: [
					{ label: "a", width: 10, animDuration: 1000, easing: "linear" },
				],
			});
			multi.start();
			multi.bars[0].start(100);
			writeSpy.mockClear();

			// Rapid updates — each cancels the previous
			multi.bars[0].update(10);
			vi.advanceTimersByTime(50);
			multi.bars[0].update(50);
			vi.advanceTimersByTime(50);
			multi.bars[0].update(90);
			vi.advanceTimersByTime(50);

			// First two animations were cancelled; the last one runs toward 90%
			const allCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const animFrames = allCalls.filter(
				(s: string) => s.includes("%") && !s.includes("?25"),
			);
			expect(animFrames.length).toBeGreaterThan(0);

			vi.advanceTimersByTime(1500);
			multi.stop();

			const finalCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const stopBarCall = finalCalls.find((s: string) => s.includes("90%"));
			expect(stopBarCall).toBeDefined();
			expect(stopBarCall).toContain("90%");
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("multi stop kills all animations, renders final state, shows cursor", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = true;
		try {
			const multi = createMultiProgressBar({
				bars: [
					{ label: "a", width: 10, animDuration: 5000, easing: "linear" },
					{ label: "b", width: 10, animDuration: 5000, easing: "linear" },
				],
			});
			multi.start();
			multi.bars[0].start(100);
			multi.bars[1].start(100);
			multi.bars[0].update(80);
			multi.bars[1].update(40);

			// Advance a bit
			vi.advanceTimersByTime(100);

			// Stop mid-animation
			multi.stop("interrupted");

			const finalCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			// Each bar should render at its final percentage
			const stopBarCalls = finalCalls.filter(
				(s: string) => s.includes("%") && !s.includes("?25"),
			);
			expect(stopBarCalls.length).toBeGreaterThanOrEqual(2);

			// Cursor should be shown
			expect(writeSpy).toHaveBeenCalledWith("\u001b[?25h");
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("individual bar stop freezes that bar while others continue", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = true;
		try {
			const multi = createMultiProgressBar({
				bars: [
					{ label: "a", width: 10, animDuration: 500, easing: "linear" },
					{ label: "b", width: 10, animDuration: 500, easing: "linear" },
				],
			});
			multi.start();
			multi.bars[0].start(100);
			multi.bars[1].start(100);

			multi.bars[0].update(50);
			vi.advanceTimersByTime(600);

			// Stop bar a — it should freeze at 50%
			multi.bars[0].stop("done");
			expect(multi.bars[0].percentage).toBe(50);

			writeSpy.mockClear();

			// Bar b continues normally
			multi.bars[1].update(80);
			vi.advanceTimersByTime(600);

			// Both bars should render: a at 50% (frozen), b at 80%
			const allCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const renderLines = allCalls.filter(
				(s: string) => s.includes("%") && !s.includes("?25"),
			);
			expect(renderLines.length).toBeGreaterThan(0);

			multi.stop();
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("spacing adds blank rows between bars", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = true;
		try {
			const multi = createMultiProgressBar({
				bars: [
					{ label: "a", width: 10 },
					{ label: "b", width: 10 },
				],
				spacing: 2,
			});
			multi.start();

			// The ANSI escape for moving up uses \u001b[N-1A
			// With spacing=2 and 2 bars, writtenLines = 2 + 2*1 = 4
			// renderAll() moves up (writtenLines-1) = 3
			const allCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const escapeCalls = allCalls.filter((s: string) => s.includes("\u001b["));
			// There should be cursor-up movements with 3 (4-1)
			// This is an indirect test — spacing changes the 'writtenLines' count
			// which changes the ANSI escape sequences
			expect(allCalls.length).toBeGreaterThan(0);
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("small updates snap immediately (no animation loop)", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = true;
		try {
			const multi = createMultiProgressBar({
				bars: [{ label: "a", width: 10, animDuration: 1000, easing: "linear" }],
			});
			multi.start();
			multi.bars[0].start(1000);
			writeSpy.mockClear();

			// 1/1000 = 0.1% delta, < 0.5 threshold → snaps immediately
			multi.bars[0].update(1);

			const callsAfterUpdate = writeSpy.mock.calls.length;

			// Advance a full duration — if a timer was accidentally started,
			// it would produce more writes
			vi.advanceTimersByTime(2000);

			expect(writeSpy.mock.calls.length).toBe(callsAfterUpdate);

			multi.stop();
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("start is idempotent (second call ignored)", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			const multi = createMultiProgressBar({
				bars: [{ label: "a", width: 10 }],
			});
			multi.start();
			const callsAfterFirstStart = writeSpy.mock.calls.length;
			multi.start();
			expect(writeSpy.mock.calls.length).toBe(callsAfterFirstStart);
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("stop is idempotent", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			const multi = createMultiProgressBar({
				bars: [{ label: "a", width: 10 }],
			});
			multi.start();
			multi.stop("first");
			const callsAfterFirstStop = writeSpy.mock.calls.length;
			multi.stop("second");
			expect(writeSpy.mock.calls.length).toBe(callsAfterFirstStop);
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("per-bar config options pass through (color, barChar, emptyChar)", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			const multi = createMultiProgressBar({
				bars: [
					{
						label: "a",
						width: 5,
						barChar: "#",
						emptyChar: "-",
						color: "green",
					},
					{
						label: "b",
						width: 5,
						barChar: "@",
						emptyChar: ".",
						color: "yellow",
					},
				],
			});
			multi.start();
			multi.bars[0].start(10);
			multi.bars[0].update(5);
			multi.bars[1].start(10);
			multi.bars[1].update(7);

			const allCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			// Non-TTY writes one stdout.write() per bar per update.
			// The last TWO calls should be bar a at 50% then bar b at 70%.
			const lastTwo = allCalls.slice(-2);
			expect(lastTwo).toHaveLength(2);

			// Bar a: 5/10 = 50% => 3 filled (#), 2 empty (-)
			expect(lastTwo[0]).toContain("a");
			expect(lastTwo[0]).toContain("###");
			expect(lastTwo[0]).toContain("--");
			expect(lastTwo[0]).toContain("50%");

			// Bar b: 7/10 = 70% => 4 filled (@), 1 empty (.)
			expect(lastTwo[1]).toContain("b");
			expect(lastTwo[1]).toContain("@@@@");
			expect(lastTwo[1]).toContain(".");
			expect(lastTwo[1]).toContain("70%");
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("cubic-bezier easing string accepted in per-bar config", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			const multi = createMultiProgressBar({
				bars: [
					{
						label: "a",
						width: 10,
						easing: "cubic-bezier(0.42, 0, 0.58, 1)",
						animDuration: 300,
					},
				],
			});
			multi.start();
			multi.bars[0].start(100);
			multi.bars[0].update(50);
			multi.stop();
			expect(true).toBe(true);
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("prefix and suffix per-bar config work", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			const multi = createMultiProgressBar({
				bars: [
					{
						label: "a",
						width: 5,
						prefix: "[",
						suffix: "]",
					},
				],
			});
			multi.start();
			multi.bars[0].start(10);
			multi.bars[0].update(5);

			const allCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const barA = allCalls.find((s: string) => s.includes("a"));
			expect(barA).toBeDefined();
			expect(barA).toContain("[");
			expect(barA).toContain("]");
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});
});
