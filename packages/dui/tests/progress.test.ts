import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProgressBar } from "../src/index";

describe("progress", () => {
	let writeSpy: any;
	beforeEach(() => {
		writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
	});
	afterEach(() => {
		writeSpy.mockRestore();
	});

	it("percentage returns 0 before start", () => {
		const bar = createProgressBar();
		expect(bar.percentage).toBe(0);
	});

	it("percentage returns correct value after update", () => {
		const bar = createProgressBar();
		bar.start(100);
		bar.update(50);
		expect(bar.percentage).toBe(50);
	});

	it("percentage clamps at 100", () => {
		const bar = createProgressBar();
		bar.start(100);
		bar.update(999);
		expect(bar.percentage).toBe(100);
	});

	it("non-TTY writes update lines", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			const bar = createProgressBar({ width: 10 });
			bar.start(100);
			expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining("░"));

			bar.update(50, "halfway");
			expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining("50%"));

			bar.update(100);
			bar.stop("done");
			const lastCall = writeSpy.mock.lastCall[0] as string;
			expect(lastCall).toContain("100%");
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("TTY starts animation and stops cleanly", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = true;
		vi.useFakeTimers();
		try {
			const bar = createProgressBar({ width: 10, prefix: "test" });
			bar.start(200);
			expect(writeSpy).toHaveBeenCalledWith("\u001b[?25l");

			vi.advanceTimersByTime(50);
			const firstRender = writeSpy.mock.calls.find(
				(c: any[]) => typeof c[0] === "string" && c[0].includes("test"),
			);
			expect(firstRender).toBeDefined();

			bar.update(100);
			bar.stop("complete");
			const allCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const stopLine = allCalls.find((s: string) => s.includes("complete"));
			expect(stopLine).toBeDefined();
			expect(stopLine).toContain("50%");
			expect(writeSpy).toHaveBeenCalledWith("\u001b[?25h");
		} finally {
			process.stdout.isTTY = origTTY;
			vi.useRealTimers();
		}
	});

	it("custom characters render correctly", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			const bar = createProgressBar({
				width: 5,
				barChar: "#",
				emptyChar: "-",
			});
			bar.start(10);
			bar.update(5);
			const call = writeSpy.mock.lastCall[0] as string;
			expect(call).toContain("##");
			expect(call).toContain("--");
			expect(call).toContain("50%");
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("start is idempotent (second call ignored)", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			const bar = createProgressBar({ width: 10 });
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
			const bar = createProgressBar({ width: 10 });
			bar.start(100);
			bar.stop("first");
			const callsAfterFirstStop = writeSpy.mock.calls.length;
			bar.stop("second");
			expect(writeSpy.mock.calls.length).toBe(callsAfterFirstStop);
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("shows suffix when provided", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			const bar = createProgressBar({ width: 10, suffix: "downloads" });
			bar.start(1);
			bar.stop();
			const call = writeSpy.mock.lastCall[0] as string;
			expect(call).toContain("downloads");
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});
});
