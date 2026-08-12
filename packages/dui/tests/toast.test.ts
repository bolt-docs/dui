import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createToastCenter } from "../src/index";

function ttyStream(rows = 24): NodeJS.WriteStream {
	const stream = new PassThrough() as unknown as NodeJS.WriteStream;
	Object.defineProperty(stream, "isTTY", { value: true, configurable: true });
	Object.defineProperty(stream, "rows", { value: rows, configurable: true });
	return stream;
}

describe("toast", () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllEnvs();
	});

	it("prints a plain log line in plain mode", () => {
		vi.stubEnv("NO_COLOR", "1");
		const stream = new PassThrough() as unknown as NodeJS.WriteStream;
		const write = vi.spyOn(stream, "write");
		const center = createToastCenter({ stream, ttl: 5000 });
		center.toast("Deploy finished", { type: "success", title: "CI" });
		expect(write).toHaveBeenCalledWith("✔ CI: Deploy finished\n");
	});

	it("draws toasts near the bottom row on a TTY", () => {
		vi.stubEnv("NO_COLOR", "");
		const stream = ttyStream(24);
		const write = vi.spyOn(stream, "write");
		const center = createToastCenter({ stream, ttl: 5000 });
		center.toast("Hello");
		const written = write.mock.calls.map((c) => String(c[0])).join("");
		// One 3-line toast is anchored 2 rows up from the bottom.
		expect(written).toContain("\x1b[22;1H");
		expect(written).toContain("Hello");
	});

	it("auto-dismisses after the TTL", () => {
		vi.useFakeTimers();
		vi.stubEnv("NO_COLOR", "");
		const stream = ttyStream(24);
		const write = vi.spyOn(stream, "write");
		const center = createToastCenter({ stream, ttl: 100 });
		center.toast("Bye");
		// readline.clearScreenDown emits \x1b[0J.
		const clearsBefore = write.mock.calls.join("").split("\u001b[0J").length - 1;
		vi.advanceTimersByTime(5000);
		// After expiry the area is cleared again (an extra
		// clearScreenDown beyond the initial draw).
		const clearsAfter = write.mock.calls.join("").split("\u001b[0J").length - 1;
		expect(clearsAfter).toBeGreaterThan(clearsBefore);
	});

	it("dismissAll clears the stack", () => {
		vi.useFakeTimers();
		vi.stubEnv("NO_COLOR", "");
		const stream = ttyStream(24);
		const write = vi.spyOn(stream, "write");
		const center = createToastCenter({ stream, ttl: 5000 });
		center.toast("One");
		center.toast("Two");
		center.dismissAll();
		const written = write.mock.calls.map((c) => String(c[0])).join("");
		expect(written).toContain("\u001b[0J"); // clear-area write
	});

	it("caps the visible stack", () => {
		vi.useFakeTimers();
		vi.stubEnv("NO_COLOR", "");
		const stream = ttyStream(24);
		const write = vi.spyOn(stream, "write");
		const center = createToastCenter({ stream, ttl: 5000, max: 2 });
		center.toast("1");
		center.toast("2");
		center.toast("3");
		// The final draw (last write call) contains only the newest two.
		const last = String(write.mock.calls[write.mock.calls.length - 1][0]);
		expect(last).toContain("2");
		expect(last).toContain("3");
		expect(last).not.toContain("1");
	});
});
