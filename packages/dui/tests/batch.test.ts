import { Writable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBatch, getDefaultBatch, resetDefaultBatch } from "../src/batch";

interface Capture {
	stream: Writable;
	written: string[];
}

function createCapture(): Capture {
	const written: string[] = [];
	const stream = new Writable({
		write(chunk, _enc, cb) {
			written.push(chunk.toString());
			cb();
		},
	});
	return { stream, written };
}

async function flushMicrotasks(): Promise<void> {
	await vi.advanceTimersByTimeAsync(10);
}

describe("createBatch", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		resetDefaultBatch();
	});

	it("buffers writes until flush", () => {
		const { stream, written } = createCapture();
		const batch = createBatch({ stream });

		batch.write("Hello ");
		batch.write("World");
		expect(written).toEqual([]);
		expect(batch.size()).toBe(11);
		expect(batch.read()).toBe("Hello World");

		batch.flush();
		expect(written).toEqual(["Hello World"]);
		expect(batch.size()).toBe(0);
	});

	it("writeAndFlush writes through immediately", () => {
		const { stream, written } = createCapture();
		const batch = createBatch({ stream });

		batch.writeAndFlush("Hello");
		expect(written).toEqual(["Hello"]);
	});

	it("auto-flushes when the buffer reaches maxSize", () => {
		const { stream, written } = createCapture();
		const batch = createBatch({ stream, maxSize: 5 });

		batch.write("123");
		batch.write("45");
		expect(written).toEqual(["12345"]);
		expect(batch.size()).toBe(0);
	});

	it("appends a newline on flush when newlineOnFlush is set", () => {
		const { stream, written } = createCapture();
		const batch = createBatch({ stream, newlineOnFlush: true });

		batch.write("line");
		batch.flush();
		expect(written).toEqual(["line\n"]);
	});

	it("defer schedules a single coalesced flush across writes", async () => {
		const { stream, written } = createCapture();
		const batch = createBatch({ stream });

		batch.write("a");
		batch.defer();
		batch.write("b");
		batch.defer();
		batch.write("c");

		expect(written).toEqual([]);
		await flushMicrotasks();
		expect(written).toEqual(["abc"]);
	});

	it("passthrough writes directly to the stream", () => {
		const { stream, written } = createCapture();
		const batch = createBatch({ stream, passthrough: true });

		batch.write("immediate");
		expect(written).toEqual(["immediate"]);
		expect(batch.size()).toBe(0);
	});

	it("setPassthrough toggles the mode at runtime", () => {
		const { stream, written } = createCapture();
		const batch = createBatch({ stream, passthrough: false });

		batch.write("buffered");
		expect(written).toEqual([]);

		batch.setPassthrough(true);
		batch.write("through");
		expect(written).toEqual(["through"]);
	});

	it("clear drops the buffer without writing", () => {
		const { stream, written } = createCapture();
		const batch = createBatch({ stream });

		batch.write("to be dropped");
		batch.clear();
		expect(batch.size()).toBe(0);
		batch.flush();
		expect(written).toEqual([]);
	});

	it("destroy flushes residual data and stops further writes", () => {
		const { stream, written } = createCapture();
		const batch = createBatch({ stream, flushInterval: 30 });

		batch.write("remainder");
		batch.destroy();
		expect(written).toEqual(["remainder"]);

		batch.write("after-destroy");
		expect(written).toEqual(["remainder"]);

		vi.advanceTimersByTime(100);
		expect(written).toEqual(["remainder"]);
	});

	it("flushInterval auto-flushes on the interval", () => {
		const { stream, written } = createCapture();
		const batch = createBatch({ stream, flushInterval: 20 });

		batch.write("tick");
		vi.advanceTimersByTime(19);
		expect(written).toEqual([]);
		vi.advanceTimersByTime(2);
		expect(written).toEqual(["tick"]);
	});

	it("keeps buffering between interval flushes", () => {
		const { stream, written } = createCapture();
		const batch = createBatch({ stream, flushInterval: 20 });

		batch.write("one");
		vi.advanceTimersByTime(20);
		expect(written).toEqual(["one"]);

		batch.write("two");
		expect(written).toEqual(["one"]);
		vi.advanceTimersByTime(20);
		expect(written).toEqual(["one", "two"]);
	});

	it("does not throw when the stream write fails", () => {
		const failingStream = new Writable({
			write(_chunk, _enc, _cb) {
				throw new Error("EPIPE");
			},
		});
		const batch = createBatch({ stream: failingStream });
		expect(() => batch.write("boom")).not.toThrow();
		expect(() => batch.flush()).not.toThrow();
	});
});

describe("getDefaultBatch", () => {
	afterEach(() => {
		resetDefaultBatch();
	});

	it("returns a singleton", () => {
		const first = getDefaultBatch();
		const second = getDefaultBatch();
		expect(first).toBe(second);
	});

	it("applies options only on first creation", () => {
		const first = getDefaultBatch({ newlineOnFlush: true });
		const second = getDefaultBatch({ newlineOnFlush: false });
		expect(first).toBe(second);
	});

	it("resetDefaultBatch clears the singleton", () => {
		const first = getDefaultBatch();
		resetDefaultBatch();
		const second = getDefaultBatch();
		expect(first).not.toBe(second);
	});

	it("uses process.stdout by default", () => {
		const spy = vi
			.spyOn(process.stdout, "write")
			.mockImplementation(() => true);
		const batch = getDefaultBatch();
		batch.write("out");
		batch.flush();
		expect(spy).toHaveBeenCalledWith("out");
		spy.mockRestore();
	});
});
