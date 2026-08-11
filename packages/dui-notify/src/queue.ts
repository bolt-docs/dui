/**
 * Notification Queue — debounce, prioritize, and batch rapid-fire
 * notifications so the terminal never gets overwhelmed.
 *
 * ## Problem
 *
 * CI pipelines, watch-mode builders, and real-time monitors can emit
 * dozens of notifications per second. Without a queue:
 *
 *   - The terminal toast backend flashes so fast nothing is readable.
 *   - `notify-send` spawns explode the process table with short-lived
 *     children.
 *   - The OSC escape stream becomes an incomprehensible wall of
 *     `\x1b]99;...\x1b\\` sequences.
 *
 * ## Solution
 *
 * `NotifyQueue` wraps any `NotifyApi` and intercepts every `notify()`
 * call. Instead of firing immediately, notifications are:
 *
 *   1. **Debounced** — same `(title, body)` pair within the debounce
 *      window is collapsed into a single notification (the latest
 *      level wins).
 *   2. **Prioritized** — `error` fires before `warning`, before `info`,
 *      before `success`/`neutral`, regardless of arrival order.
 *   3. **Batchable** — multiple queued notifications are merged into
 *      one terminal toast with a summary header and grouped body.
 *   4. **Throttled** — the queue drains at a configurable rate so
 *      the backend never receives more than N notifications per
 *      second.
 *   5. **Bounded** — a max queue size prevents memory leaks; overflow
 *      drops the lowest-priority notification.
 *
 * @example
 * ```ts
 * import { createNotifyQueue } from "@dui-toolkit/plugin-notify"
 * import { notifyApi } from "@dui-toolkit/plugin-notify"
 *
 * const q = createNotifyQueue(notifyApi, {
 *   debounceMs: 200,
 *   throttleMs: 300,
 *   maxQueueSize: 50,
 *   batchTerminal: true,
 * })
 *
 * // These three calls collapse into one after 200ms debounce
 * q.warning("Disk space low")
 * q.warning("Disk space low")
 * q.error("Disk space critical")
 *
 * // The queue fires one notification with level "error" (highest wins).
 * ```
 */

import type { NotifyApi, NotifyEvent } from "./notify.js";
import type { NotifyLevel, NotifyOptions, NotifyResult } from "./types.js";

/* ── Types ───────────────────────────────────────────────────── */

export interface NotifyQueueOptions {
	/**
	 * Debounce window in milliseconds. Consecutive notifications with
	 * the same `(title, body)` key within this window collapse into
	 * one. The highest `level` among them wins. Default: `200`.
	 */
	debounceMs?: number;
	/**
	 * Minimum interval between backend dispatches in milliseconds.
	 * Notifications are queued and drained at this rate to prevent
	 * overwhelming the backend. Default: `300`.
	 */
	throttleMs?: number;
	/**
	 * Maximum number of queued notifications. When exceeded, the
	 * lowest-priority notification is dropped. Default: `100`.
	 */
	maxQueueSize?: number;
	/**
	 * When `true`, multiple queued notifications destined for the
	 * `terminal` backend are merged into a single grouped toast
	 * rather than dispatched individually. Default: `true`.
	 */
	batchTerminal?: boolean;
	/**
	 * Callback invoked when a notification is dropped from the queue
	 * due to overflow. Receives the dropped notification's options.
	 */
	onDropped?: (opts: NotifyOptions) => void;
}

interface QueuedItem {
	opts: NotifyOptions;
	resolvers: Array<{
		resolve: (result: NotifyResult) => void;
		reject: (err: Error) => void;
	}>;
	debounceKey: string;
	levelPriority: number;
	enqueuedAt: number;
}

/* ── Priority mapping ────────────────────────────────────────── */

const LEVEL_PRIORITY: Record<NotifyLevel, number> = {
	error: 100,
	warning: 75,
	info: 50,
	success: 25,
	neutral: 10,
};

function levelPriority(level?: NotifyLevel): number {
	return LEVEL_PRIORITY[level ?? "info"] ?? 50;
}

function makeDebounceKey(opts: NotifyOptions): string {
	return `${opts.title ?? ""}\x00${opts.body ?? ""}`;
}

function pickHighestLevel(a?: NotifyLevel, b?: NotifyLevel): NotifyLevel {
	const pa = levelPriority(a);
	const pb = levelPriority(b);
	return pa >= pb ? (a ?? "info") : (b ?? "info");
}

/* ── Batch merging ───────────────────────────────────────────── */

/**
 * Merge multiple notifications into a single grouped toast.
 * The highest-level title becomes the merged title; bodies are
 * collected with a severity prefix per item.
 */
function mergeBatch(items: QueuedItem[]): NotifyOptions {
	if (items.length === 0) throw new Error("Cannot merge empty batch");
	if (items.length === 1) return { ...items[0].opts };

	// The highest-priority item drives both the merged level AND the
	// merged title (docstring contract: "the highest-level title becomes
	// the merged title"). A naive "first title wins" picks whichever
	// item arrived first, which can surface an `info` title while the
	// toast itself is `error`.
	let mergedLevel: NotifyLevel = "info";
	let mergedTitle = "";
	const bodies: string[] = [];

	let highestIdx = 0;
	for (let i = 0; i < items.length; i++) {
		const lvl = items[i].opts.level ?? "info";
		if (levelPriority(lvl) > levelPriority(mergedLevel)) {
			mergedLevel = lvl;
			highestIdx = i;
		}
		if (items[i].opts.body) {
			const prefix =
				lvl === "error" ? "✖" : lvl === "warning" ? "⚠" : "·";
			bodies.push(`${prefix} ${items[i].opts.body}`);
		}
	}

	mergedTitle = items[highestIdx].opts.title ?? "";

	return {
		level: mergedLevel,
		title: mergedTitle || `${items.length} notifications`,
		body: bodies.join("\n"),
		// Carry forward optional settings from the highest-priority item
		ttl: items[highestIdx].opts.ttl,
		sound: items[highestIdx].opts.sound,
		force: items[highestIdx].opts.force,
		actions:
			items.length <= 2 ? items[highestIdx].opts.actions : undefined,
	};
}

/* ── Queue class ─────────────────────────────────────────────── */

export interface NotifyQueueHandle {
	/**
	 * Queue a notification. Returns a promise that resolves when the
	 * notification is actually dispatched (after debounce + throttle).
	 * This is identical to the `NotifyApi` signature.
	 */
	notify: NotifyApi;

	/**
	 * Get the current queue depth (number of pending notifications).
	 */
	depth(): number;

	/**
	 * Flush the queue immediately — dispatch all pending notifications
	 * now, bypassing throttle timing. Returns a promise that resolves
	 * when all have been dispatched.
	 */
	flush(): Promise<void>;

	/**
	 * Destroy the queue — cancel pending items, clear intervals, and
	 * release resources. Any unresolved promises are rejected with a
	 * `QueueDestroyedError`.
	 */
	destroy(): void;

	/**
	 * Update queue options at runtime. Only provided keys are changed;
	 * omitted keys keep their previous value.
	 */
	configure(opts: Partial<NotifyQueueOptions>): void;
}

export class QueueDestroyedError extends Error {
	constructor() {
		super("NotifyQueue has been destroyed");
		this.name = "QueueDestroyedError";
	}
}

/**
 * Create a notification queue that wraps a `NotifyApi`.
 *
 * @param backend - The underlying notify API to dispatch through.
 * @param options - Queue configuration.
 * @returns A `NotifyQueueHandle` with `notify`, `depth`, `flush`,
 *   `destroy`, and `configure`.
 */
export function createNotifyQueue(
	backend: NotifyApi,
	options?: NotifyQueueOptions,
): NotifyQueueHandle {
	const {
		debounceMs = 200,
		throttleMs = 300,
		maxQueueSize = 100,
		batchTerminal = true,
		onDropped,
	} = options ?? {};

	// ── State ──────────────────────────────────────────────────

	const queue: QueuedItem[] = [];
	const debounceMap = new Map<string, QueuedItem>();
	let timer: ReturnType<typeof setTimeout> | null = null;
	let destroyed = false;
	let draining = false;
	let pendingFlush: (() => void) | null = null;

	// Mutable options so `configure()` can update them at runtime.
	const mutableOpts = {
		debounceMs,
		throttleMs,
		maxQueueSize,
		batchTerminal,
		onDropped,
	};

	// ── Dispatch ───────────────────────────────────────────────

	function doDispatch(item: QueuedItem): void {
		if (destroyed) return;
		backend(item.opts).then(
			(result) => {
				for (const { resolve } of item.resolvers) resolve(result);
			},
			(err) => {
				for (const { reject } of item.resolvers) reject(err);
			},
		);
	}

	function doDispatchBatch(items: QueuedItem[]): void {
		if (destroyed || items.length === 0) return;

		// When batching is enabled AND all items target terminal, merge.
		const allTerminal = items.every(
			(i) => (i.opts.force ?? "auto") === "auto" || i.opts.force === "terminal",
		);

		if (mutableOpts.batchTerminal && allTerminal && items.length > 1) {
			const merged = mergeBatch(items);
			// Collect all resolvers across all items
			const allResolvers = items.flatMap((i) => i.resolvers);
			backend(merged).then(
				(result) => {
					for (const { resolve } of allResolvers) resolve(result);
				},
				(err) => {
					for (const { reject } of allResolvers) reject(err);
				},
			);
			return;
		}

		// Dispatch individually
		for (const item of items) doDispatch(item);
	}

	// ── Drain ──────────────────────────────────────────────────

	function drain(): void {
		if (destroyed || queue.length === 0) {
			draining = false;
			if (pendingFlush) {
				pendingFlush();
				pendingFlush = null;
			}
			return;
		}

		draining = true;

		// Sort by priority (highest first), then by enqueue time.
		queue.sort((a, b) => {
			if (a.levelPriority !== b.levelPriority) {
				return b.levelPriority - a.levelPriority;
			}
			return a.enqueuedAt - b.enqueuedAt;
		});

		// Take one item (or one batch) off the queue
		const batchSize = mutableOpts.batchTerminal ? Math.min(queue.length, 5) : 1;
		const batch = queue.splice(0, batchSize);
		doDispatchBatch(batch);

		// Schedule next drain after throttle interval
		if (queue.length > 0) {
			timer = setTimeout(drain, mutableOpts.throttleMs);
			if (typeof timer === "object" && "unref" in timer) {
				(timer as NodeJS.Timeout).unref();
			}
		} else {
			draining = false;
			if (pendingFlush) {
				pendingFlush();
				pendingFlush = null;
			}
		}
	}

	function scheduleDrain(): void {
		if (draining || timer) return;
		// First drain fires immediately (no throttle delay for the
		// first item), then subsequent drains follow throttleMs.
		drain();
	}

	// ── Enqueue ────────────────────────────────────────────────

	function enqueue(notifyOpts: NotifyOptions): Promise<NotifyResult> {
		if (destroyed) {
			return Promise.reject(new QueueDestroyedError());
		}

		return new Promise<NotifyResult>((resolve, reject) => {
			const debounceKey = makeDebounceKey(notifyOpts);
			const existing = debounceMap.get(debounceKey);

			if (existing) {
				// Debounce — update the existing entry with the higher priority
				// and add the new resolvers so ALL callers resolve together.
				existing.opts.level = pickHighestLevel(
					existing.opts.level,
					notifyOpts.level,
				);
				existing.opts.body = notifyOpts.body ?? existing.opts.body;
				existing.opts.title = notifyOpts.title ?? existing.opts.title;
				existing.opts.ttl = notifyOpts.ttl ?? existing.opts.ttl;
				existing.resolvers.push({ resolve, reject });
				return;
			}

			// Overflow protection — drop lowest priority
			if (queue.length >= mutableOpts.maxQueueSize) {
				const lowest = queue.reduce((worst, item) =>
					item.levelPriority < worst.levelPriority ? item : worst,
				);
				if (levelPriority(notifyOpts.level) <= lowest.levelPriority) {
					// Incoming is same or lower priority — drop it.
					const err = new Error(
						`Queue overflow (${queue.length} items): notification dropped`,
					);
					reject(err);
					process.emitWarning(err.message, "DUINotifyQueueOverflow");
					mutableOpts.onDropped?.(notifyOpts);
					return;
				}
				// Incoming is higher priority — drop the lowest.
				const idx = queue.indexOf(lowest);
				if (idx !== -1) {
					const currentSize = queue.length;
					queue.splice(idx, 1);
					debounceMap.delete(makeDebounceKey(lowest.opts));
					const err = new Error(
						`Queue overflow (${currentSize} items): dropped lowest-priority notification`,
					);
					for (const { reject: r } of lowest.resolvers) {
						r(err);
					}
					process.emitWarning(err.message, "DUINotifyQueueOverflow");
					mutableOpts.onDropped?.(lowest.opts);
				}
			}

			const item: QueuedItem = {
				opts: notifyOpts,
				resolvers: [{ resolve, reject }],
				debounceKey,
				levelPriority: levelPriority(notifyOpts.level),
				enqueuedAt: Date.now(),
			};

			queue.push(item);
			debounceMap.set(debounceKey, item);

			// Schedule drain after debounce window.
			// Important: clear `timer` BEFORE calling scheduleDrain() in the
			// callback so the guard `scheduleDrain() → if (timer) return` does
			// not block the drain from firing. The timer variable is shared
			// between debounce and throttle scheduling, so it must be null
			// before we attempt to schedule the next drain.
			if (mutableOpts.debounceMs > 0) {
				const debounceTimer = setTimeout(() => {
					timer = null; // clear so scheduleDrain can proceed
					debounceMap.delete(debounceKey);
					scheduleDrain();
				}, mutableOpts.debounceMs);
				timer = debounceTimer;
				if (
					typeof debounceTimer === "object" &&
					"unref" in debounceTimer
				) {
					(debounceTimer as NodeJS.Timeout).unref();
				}
			} else {
				scheduleDrain();
			}
		});
	}

	// ── Shorthands ─────────────────────────────────────────────

	const shortFor =
		(level: NotifyLevel) =>
		(text: string, opts_?: Partial<NotifyOptions>) =>
			enqueue({ ...(opts_ ?? {}), level, body: text });

	// ── Public API ─────────────────────────────────────────────

	const notify: NotifyApi = Object.assign(
		(opts_: NotifyOptions): Promise<NotifyResult> => enqueue(opts_),
		{
			success: shortFor("success"),
			info: shortFor("info"),
			warning: shortFor("warning"),
			error: shortFor("error"),
			neutral: shortFor("neutral"),
			subscribe(handler: (event: NotifyEvent) => void) {
				// Subscribe through the underlying backend
				return backend.subscribe(handler);
			},
		},
	) as NotifyApi;

	// ── Process exit cleanup ───────────────────────────────────

	let exitHandler: (() => void) | null = null;

	function onExit(): void {
		if (destroyed) return;
		destroyed = true;
		if (timer !== null) clearTimeout(timer);
		timer = null;
		// Flush remaining with immediate dispatch (no throttle)
		const remaining = queue.splice(0);
		debounceMap.clear();
		for (const item of remaining) {
			backend(item.opts).then(
				(result) => {
					for (const { resolve } of item.resolvers) resolve(result);
				},
				(err) => {
					for (const { reject } of item.resolvers) reject(err);
				},
			);
		}
		// Deregister after running to avoid re-entrance
		if (exitHandler) {
			process.off("beforeExit", exitHandler);
			exitHandler = null;
		}
	}

	exitHandler = onExit;
	process.once("beforeExit", onExit);

	const handle: NotifyQueueHandle = {
		notify,

		depth(): number {
			return queue.length;
		},

		async flush(): Promise<void> {
			if (destroyed) return;
			if (queue.length === 0) return;

			return new Promise<void>((resolve) => {
				pendingFlush = resolve;
				// Cancel pending debounce timers
				debounceMap.clear();
				// Drain immediately
				draining = false;
				if (timer !== null) {
					clearTimeout(timer);
					timer = null;
				}
				drain();
			});
		},

		destroy(): void {
			if (destroyed) return;
			destroyed = true;
			if (timer !== null) clearTimeout(timer);
			timer = null;
			if (exitHandler) {
				process.off("beforeExit", exitHandler);
				exitHandler = null;
			}
			const remaining = queue.splice(0);
			debounceMap.clear();
			const err = new QueueDestroyedError();
			for (const item of remaining) {
				for (const { reject: r } of item.resolvers) r(err);
			}
		},

		configure(opts_: Partial<NotifyQueueOptions>): void {
			if (opts_.debounceMs !== undefined) mutableOpts.debounceMs = opts_.debounceMs;
			if (opts_.throttleMs !== undefined)
				mutableOpts.throttleMs = opts_.throttleMs;
			if (opts_.maxQueueSize !== undefined)
				mutableOpts.maxQueueSize = opts_.maxQueueSize;
			if (opts_.batchTerminal !== undefined)
				mutableOpts.batchTerminal = opts_.batchTerminal;
			if (opts_.onDropped !== undefined)
				mutableOpts.onDropped = opts_.onDropped;
		},
	};

	return handle;
}
