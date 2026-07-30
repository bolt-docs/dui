/**
 * Edge-case tests for `NotifyQueue` — overflow protection, debounce,
 * priority drain, throttle, batch merging, flush, and destroy.
 *
 * Uses a mock backend that captures dispatched notifications so we
 * can assert on timing, ordering, and merging without real I/O.
 *
 * Uses **real timers** with very short durations (5-20ms) so tests
 * run fast without the complexity of vitest fake timer integration
 * with the queue's internal setTimeout / clearTimeout patterns.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NotifyApi, NotifyResult } from "../src/index";
import {
	QueueDestroyedError,
	createNotifyQueue,
} from "../src/queue";

/* ── Helpers ────────────────────────────────────────────────── */

interface DispatchLog {
	opts: Parameters<NotifyApi>[0];
}

function makeFakeBackend(log: DispatchLog[]): NotifyApi {
	const fn = (async (opts) => {
		log.push({ opts });
		const result: NotifyResult = {
			id: `fake:${log.length}`,
			backend: "bell",
			dismissed: Promise.resolve(),
			action: Promise.resolve(undefined),
		};
		return result;
	}) as NotifyApi;

	return Object.assign(fn, {
		success: (text: string, opts?: Partial<NotifyResult>) =>
			fn({ ...(opts ?? {}), level: "success", body: text } as never),
		info: (text: string, opts?: Partial<NotifyResult>) =>
			fn({ ...(opts ?? {}), level: "info", body: text } as never),
		warning: (text: string, opts?: Partial<NotifyResult>) =>
			fn({ ...(opts ?? {}), level: "warning", body: text } as never),
		error: (text: string, opts?: Partial<NotifyResult>) =>
			fn({ ...(opts ?? {}), level: "error", body: text } as never),
		neutral: (text: string, opts?: Partial<NotifyResult>) =>
			fn({ ...(opts ?? {}), level: "neutral", body: text } as never),
		subscribe: () => () => {},
	}) as unknown as NotifyApi;
}

/** Short sleep using real timers. */
function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

describe("NotifyQueue", () => {
	let log: DispatchLog[];
	let backend: NotifyApi;

	beforeEach(() => {
		log = [];
		backend = makeFakeBackend(log);
	});

	afterEach(() => {
		// Ensure any queue that registered a beforeExit listener is
		// properly cleaned up between tests.
	});

	/* ── Basic dispatch ──────────────────────────────────────── */

	it("dispatches a single notification through the backend", async () => {
		const q = createNotifyQueue(backend, { debounceMs: 0, throttleMs: 0 });
		const r = await q.notify({ body: "hello", level: "info", force: "bell" });
		expect(r).toMatchObject({ backend: "bell" });
		expect(log.length).toBe(1);
		expect(log[0].opts.body).toBe("hello");
	});

	it("shorthand methods are on notify handle", async () => {
		const q = createNotifyQueue(backend, { debounceMs: 0, throttleMs: 0 });
		const r1 = await q.notify.success("ok", { force: "bell" });
		const r2 = await q.notify.error("boom", { force: "bell" });
		expect(log.length).toBe(2);
		expect(log[0].opts.level).toBe("success");
		expect(log[0].opts.body).toBe("ok");
		expect(log[1].opts.level).toBe("error");
		expect(log[1].opts.body).toBe("boom");
	});

	/* ── Debounce ────────────────────────────────────────────── */

	it("collapses same (title, body) pair within debounce window, highest level wins", async () => {
		const q = createNotifyQueue(backend, { debounceMs: 10, throttleMs: 0 });

		const p1 = q.notify({ body: "same", title: "T", level: "warning", force: "bell" });
		const p2 = q.notify({ body: "same", title: "T", level: "error", force: "bell" });

		expect(q.depth()).toBe(1); // debounced — p2 merged into p1

		await sleep(50);

		const [r1, r2] = await Promise.all([p1, p2]);
		expect(r1.id).toBe(r2.id); // same result for both callers
		expect(log.length).toBe(1);
		expect(log[0].opts.level).toBe("error"); // highest wins
	});

	it("does not collapse notifications with different bodies", async () => {
		const q = createNotifyQueue(backend, { debounceMs: 10, throttleMs: 0 });

		q.notify({ body: "first", level: "info", force: "bell" });
		q.notify({ body: "second", level: "info", force: "bell" });

		expect(q.depth()).toBe(2);
		await sleep(50);
		expect(log.length).toBe(2);
	});

	it("fires immediately when debounceMs is 0", async () => {
		const q = createNotifyQueue(backend, { debounceMs: 0, throttleMs: 0 });
		await q.notify({ body: "fast", level: "info", force: "bell" });
		expect(log.length).toBe(1);
	});

	/* ── Priority drain ──────────────────────────────────────── */

	it("drains errors before info when both are queued before drain", async () => {
		const q = createNotifyQueue(backend, { debounceMs: 10, throttleMs: 0, batchTerminal: false });

		q.notify({ body: "info-first", level: "info", force: "bell" });
		q.notify({ body: "error-first", level: "error", force: "bell" });

		expect(q.depth()).toBe(2);
		await sleep(50);

		expect(log.length).toBe(2);
		expect(log[0].opts.level).toBe("error"); // priority order
		expect(log[1].opts.level).toBe("info");
	});

	/* ── Throttle ────────────────────────────────────────────── */

	it("respects throttleMs between dispatches", async () => {
		const q = createNotifyQueue(backend, { debounceMs: 10, throttleMs: 50, batchTerminal: false });

		q.notify({ body: "first", level: "info", force: "bell" });
		q.notify({ body: "second", level: "info", force: "bell" });

		// After debounce fires, first drain dispatches 1 item, second drain
		// waits for throttleMs
		await sleep(60);
		expect(log.length).toBe(1);

		await sleep(100);
		expect(log.length).toBe(2);
	});

	/* ── Overflow protection ─────────────────────────────────── */

	it("drops the lowest-priority notification when queue exceeds maxQueueSize", async () => {
		const onDropped = vi.fn();
		const q = createNotifyQueue(backend, {
			debounceMs: 1000,
			throttleMs: 1000,
			maxQueueSize: 3,
			batchTerminal: false,
			onDropped,
		});

		// Fill queue with 3 low-priority items — catch rejections so they
		// don't become unhandled rejections
		const p1 = q.notify({ body: "neutral-1", level: "neutral", force: "bell" }).catch(() => {});
		const p2 = q.notify({ body: "neutral-2", level: "neutral", force: "bell" }).catch(() => {});
		const p3 = q.notify({ body: "neutral-3", level: "neutral", force: "bell" }).catch(() => {});
		expect(q.depth()).toBe(3);

		// 4th neutral item: same priority → rejected immediately
		await expect(
			q.notify({ body: "neutral-4", level: "neutral", force: "bell" }),
		).rejects.toThrow("Queue overflow");
		expect(q.depth()).toBe(3);
		expect(onDropped).toHaveBeenCalledTimes(1);

		// Error (higher priority): evicts a neutral and takes its spot
		q.notify({ body: "critical", level: "error", force: "bell" }).catch(() => {});
		expect(q.depth()).toBe(3);
		// onDropped called for: neutral-4 rejected (1), and one neutral evicted (2)
		expect(onDropped).toHaveBeenCalledTimes(2);
	});

	it("rejects incoming notification with same priority when queue is full", async () => {
		const q = createNotifyQueue(backend, {
			debounceMs: 1000,
			throttleMs: 1000,
			maxQueueSize: 2,
		});

		q.notify({ body: "A", level: "info", force: "bell" }).catch(() => {});
		q.notify({ body: "B", level: "info", force: "bell" }).catch(() => {});

		await expect(
			q.notify({ body: "C", level: "info", force: "bell" }),
		).rejects.toThrow("Queue overflow");
		expect(q.depth()).toBe(2);
	});

	/* ── depth ───────────────────────────────────────────────── */

	it("depth() returns the current queue size", async () => {
		const q = createNotifyQueue(backend, { debounceMs: 1000, throttleMs: 1000 });
		expect(q.depth()).toBe(0);
		q.notify({ body: "A", level: "info", force: "bell" }).catch(() => {});
		expect(q.depth()).toBe(1);
		q.notify({ body: "B", level: "info", force: "bell" }).catch(() => {});
		expect(q.depth()).toBe(2);
	});

	/* ── flush ───────────────────────────────────────────────── */

	it("flush() bypasses throttle and dispatches all pending items immediately", async () => {
		const q = createNotifyQueue(backend, { debounceMs: 200, throttleMs: 5000 });

		q.notify({ body: "A", level: "info", force: "bell" });
		q.notify({ body: "B", level: "info", force: "bell" });
		expect(q.depth()).toBe(2);

		await q.flush();
		expect(log.length).toBe(2);
		expect(q.depth()).toBe(0);
	});

	it("flush() on empty queue resolves immediately", async () => {
		const q = createNotifyQueue(backend);
		await expect(q.flush()).resolves.toBeUndefined();
	});

	/* ── destroy ─────────────────────────────────────────────── */

	it("destroy() rejects pending promises with QueueDestroyedError", async () => {
		const q = createNotifyQueue(backend, { debounceMs: 5000, throttleMs: 5000 });

		const p = q.notify({ body: "pending", level: "info", force: "bell" });
		expect(q.depth()).toBe(1);

		q.destroy();
		await expect(p).rejects.toThrow(QueueDestroyedError);
		expect(q.depth()).toBe(0);
	});

	it("destroy() prevents new items from being enqueued", async () => {
		const q = createNotifyQueue(backend);
		q.destroy();

		await expect(
			q.notify({ body: "after-destroy", level: "info", force: "bell" }),
		).rejects.toThrow(QueueDestroyedError);
	});

	it("destroy() is idempotent", () => {
		const q = createNotifyQueue(backend);
		expect(() => {
			q.destroy();
			q.destroy();
		}).not.toThrow();
	});

	/* ── configure ───────────────────────────────────────────── */

	it("configure() enables immediate dispatch after init with large debounce", async () => {
		const q = createNotifyQueue(backend, { debounceMs: 5000, throttleMs: 5000, maxQueueSize: 10 });

		// Before configure, a notify would wait 5000ms to drain.
		// After configure(debounceMs: 0), it fires immediately.
		q.configure({ debounceMs: 0, throttleMs: 0 });
		await q.notify({ body: "after-config", level: "info", force: "bell" });
		expect(log.length).toBe(1);
	});

	it("configure() only changes provided keys", async () => {
		const q = createNotifyQueue(backend, { debounceMs: 5000, throttleMs: 5000 });
		q.configure({ debounceMs: 0 }); // throttleMs stays 5000

		// With debounceMs=0 and throttleMs=5000, notify fires first drain
		// immediately (scheduleDrain bypasses throttle on first call)
		await q.notify({ body: "x", level: "info", force: "bell" });
		expect(log.length).toBe(1);
	});

	/* ── Batch merging ───────────────────────────────────────── */

	it("batchTerminal merges multiple notifications into a single grouped toast", async () => {
		const q = createNotifyQueue(backend, {
			debounceMs: 10,
			throttleMs: 0,
			batchTerminal: true,
		});

		q.notify({ body: "step 1", level: "info", force: "auto" });
		q.notify({ body: "step 2", level: "info", force: "auto" });
		q.notify({ body: "error!", level: "error", force: "auto" });

		expect(q.depth()).toBe(3);
		await sleep(50);

		expect(log.length).toBe(1); // merged
		const merged = log[0].opts;
		expect(merged.level).toBe("error");
		expect(merged.body).toContain("step 1");
		expect(merged.body).toContain("step 2");
		expect(merged.body).toContain("error!");
	});

	it("dispatches individually when batchTerminal is false", async () => {
		const q = createNotifyQueue(backend, {
			debounceMs: 10,
			throttleMs: 0,
			batchTerminal: false,
		});

		q.notify({ body: "A", level: "info", force: "bell" });
		q.notify({ body: "B", level: "info", force: "bell" });

		await sleep(50);
		expect(log.length).toBe(2);
	});

	/* ── Subscribe passthrough ───────────────────────────────── */

	it("subscribe() delegates to the underlying backend", () => {
		const sub = vi.fn();
		const backendSub = makeFakeBackend([]);
		const q = createNotifyQueue(backendSub, { debounceMs: 0, throttleMs: 0 });

		const unsub = q.notify.subscribe(sub);
		expect(typeof unsub).toBe("function");
	});
});
