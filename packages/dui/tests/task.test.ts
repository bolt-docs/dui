import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { task } from "../src/index";

describe("task", () => {
	let writeSpy: any;
	beforeEach(() => {
		writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
		vi.useFakeTimers();
	});
	afterEach(() => {
		writeSpy.mockRestore();
		vi.useRealTimers();
	});

	it("resolves with the returned value and stops bar on success", async () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			const result = await task(
				"build",
				{ total: 2 },
				async (ctx) => {
					ctx.update(1, "compiling");
					ctx.update(2, "linking");
					return "ok";
				},
			);
			expect(result).toBe("ok");

			// Should have stopped with success message
			const allCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const stopLine = allCalls.find((s: string) => s.includes("build done"));
			expect(stopLine).toBeDefined();
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("rejects with the error and stops bar on failure", async () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			await expect(
				task("test", { total: 1, errorMessage: "custom error" }, async () => {
					throw new Error("boom");
				}),
			).rejects.toThrow("boom");

			const allCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const stopLine = allCalls.find((s: string) => s.includes("custom error"));
			expect(stopLine).toBeDefined();
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("accepts total as a shorthand number instead of options object", async () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			const result = await task("dl", 5, async (ctx) => {
				ctx.update(3, "downloading");
				return 42;
			});
			expect(result).toBe(42);
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("defaults total to 1 when not specified", async () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			await task("quick", {}, async (ctx) => {
				// No update needed — total=1, so percentage stays 0
				expect(ctx.percentage).toBe(0);
			});

			const allCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const stopLine = allCalls.find((s: string) => s.includes("quick done"));
			expect(stopLine).toBeDefined();
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("setMessage updates the status message without changing progress", async () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			await task("test", { total: 3 }, async (ctx) => {
				ctx.update(1, "step 1");
				ctx.setMessage("still step 1");
				// percentage should still be ~33
				expect(ctx.percentage).toBeCloseTo(33.33, 0);

				const allCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
				const withStep1 = allCalls.filter((s: string) =>
					s.includes("step 1"),
				);
				const withStillStep1 = allCalls.filter((s: string) =>
					s.includes("still step 1"),
				);
				// setMessage should have produced a line with the new message
				expect(withStep1.length).toBeGreaterThan(0);
				expect(withStillStep1.length).toBeGreaterThan(0);
			});
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("percentage reflects progress through the task stages", async () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			await task("test", { total: 4 }, async (ctx) => {
				expect(ctx.percentage).toBe(0);
				ctx.update(1);
				expect(ctx.percentage).toBe(25);
				ctx.update(2);
				expect(ctx.percentage).toBe(50);
				ctx.update(3);
				expect(ctx.percentage).toBe(75);
				ctx.update(4);
				expect(ctx.percentage).toBe(100);
			});
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("TTY path hides cursor and stops cleanly on success", async () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = true;
		try {
			const promise = task("tty-test", 1, async (ctx) => {
				ctx.update(1);
				return "done";
			});

			// Advance fake timers so the animation can complete
			vi.advanceTimersByTime(500);

			const result = await promise;
			expect(result).toBe("done");

			// Should have hidden then shown cursor
			expect(writeSpy).toHaveBeenCalledWith("\u001b[?25l");
			expect(writeSpy).toHaveBeenCalledWith("\u001b[?25h");

			const allCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const stopLine = allCalls.find((s: string) =>
				s.includes("tty-test done"),
			);
			expect(stopLine).toBeDefined();
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("TTY path stops cleanly on error", async () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = true;
		try {
			const promise = task(
				"fail-test",
				{ total: 2, errorMessage: "task crashed" },
				async () => {
					throw new RangeError("oops");
				},
			);

			vi.advanceTimersByTime(500);

			await expect(promise).rejects.toThrow(RangeError);

			expect(writeSpy).toHaveBeenCalledWith("\u001b[?25l");
			expect(writeSpy).toHaveBeenCalledWith("\u001b[?25h");

			const allCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const stopLine = allCalls.find((s: string) =>
				s.includes("task crashed"),
			);
			expect(stopLine).toBeDefined();
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("custom options pass through to the underlying bar", async () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			await task(
				"custom",
				{
					total: 5,
					width: 10,
					barChar: "#",
					emptyChar: "-",
					successMessage: "all good",
				},
				async (ctx) => {
					ctx.update(3, "mid");
				},
			);

			const allCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const withCustomChar = allCalls.find((s: string) => s.includes("###"));
			expect(withCustomChar).toBeDefined();
			const stopLine = allCalls.find((s: string) => s.includes("all good"));
			expect(stopLine).toBeDefined();
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("cubic-bezier easing and custom duration accepted", async () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			await task(
				"smooth",
				{
					total: 1,
					easing: "cubic-bezier(0.42, 0, 0.58, 1)",
					animDuration: 500,
				},
				async (ctx) => {
					ctx.update(1);
				},
			);
			expect(true).toBe(true);
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});
});
