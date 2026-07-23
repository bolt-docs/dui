import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSpinner } from "../src/index";

vi.mock("node:readline", async (importActual) => {
	const actual = await importActual<typeof import("node:readline")>();
	return {
		...actual,
		default: {
			...actual.default,
			createInterface: vi.fn(),
			clearLine: vi.fn(),
			cursorTo: vi.fn(),
		},
	};
});

describe("spinner", () => {
	let writeSpy: any;
	beforeEach(() => {
		writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
	});
	afterEach(() => {
		writeSpy.mockRestore();
	});

	it("non-TTY logs cleanly", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = false;
		try {
			const spinner = createSpinner("Loading...");
			spinner.start();
			expect(writeSpy).toHaveBeenCalledWith(
				expect.stringContaining("... Loading..."),
			);

			spinner.update("Still Loading...");
			expect(writeSpy).toHaveBeenCalledWith(
				expect.stringContaining("... Still Loading..."),
			);

			spinner.stop("success", "Done!");
			const lastCall = writeSpy.mock.lastCall[0] as string;
			expect(lastCall).toContain("✔");
			expect(lastCall).toContain("Done!");
		} finally {
			process.stdout.isTTY = origTTY;
		}
	});

	it("TTY starts animation and stops", () => {
		const origTTY = process.stdout.isTTY;
		process.stdout.isTTY = true;
		vi.useFakeTimers();
		try {
			const spinner = createSpinner("Installing...");
			spinner.start();

			expect(writeSpy).toHaveBeenCalledWith("\u001b[?25l");

			vi.advanceTimersByTime(200);

			spinner.stop("fail", "Failed!");
			const allCalls = writeSpy.mock.calls.map((c: any[]) => c[0] as string);
			const hasFailMsg = allCalls.some(
				(s: string) => s.includes("✖") && s.includes("Failed!"),
			);
			expect(hasFailMsg).toBe(true);
			expect(writeSpy).toHaveBeenCalledWith("\u001b[?25h");
		} finally {
			process.stdout.isTTY = origTTY;
			vi.useRealTimers();
		}
	});
});
