/**
 * Output Batching — collect multiple write/render operations and flush
 * them as a single write, reducing terminal I/O overhead and preventing
 * flicker during rapid re-renders.
 *
 * Instead of writing each buffer, cursor move, or ANSI string to stdout
 * individually (which causes a syscall per write), batch them:
 *
 *   1. **Manual batching** — explicitly `buffer.write()` chunks and
 *      `buffer.flush()` when ready.
 *   2. **Auto-flush on interval** — pass `flushInterval` to auto-flush
 *      every N ms (ideal for animations and streaming output).
 *   3. **Deferred / microtask flush** — call `buffer.defer()` to schedule
 *      a flush on the next `setImmediate` / microtask, coalescing
 *      multiple synchronous writes into one.
 *
 * Batching composes with `RenderSurface.flush()` — the surface produces
 * its minimal diff string, then that string is written through the batch
 * buffer rather than directly to stdout.
 *
 * @example
 * ```ts
 * import { createBatch } from "@bdocs/dui"
 *
 * const batch = createBatch({ flushInterval: 16 }) // ~60 fps
 *
 * // These accumulate in the buffer
 * batch.write("Hello ")
 * batch.write("World\n")
 *
 * // Explicit flush sends everything at once
 * batch.flush()
 *
 * // With RenderSurface
 * const surface = new RenderSurface({ width: 80, height: 24 })
 * // ... render to surface ...
 * batch.write(surface.flush()) // only changed cells
 * batch.flush()
 * ```
 *
 * @example Streaming:
 * ```ts
 * const batch = createBatch({ flushInterval: 100 })
 * for (const line of logLines) {
 *   batch.write(line + "\n")
 * }
 * // Auto-flush every 100ms sends accumulated lines in bursts
 * // instead of one syscall per line
 * batch.destroy() // stop the interval timer
 * batch.flush()   // flush remaining
 * ```
 */

import { createLogger } from "./logger";

/* ── Types ───────────────────────────────────────────────────── */

export interface BatchOptions {
	/**
	 * Maximum bytes to accumulate before auto-flushing.
	 * Default: 16384 (16 KB).
	 */
	maxSize?: number;
	/**
	 * Auto-flush interval in milliseconds. When set, a timer periodically
	 * flushes the buffer. Default: `undefined` (no auto-flush).
	 */
	flushInterval?: number;
	/**
	 * The stream to write to. Default: `process.stdout`.
	 */
	stream?: NodeJS.WriteStream;
	/**
	 * When `true`, writes through to the stream on every `write()` call,
	 * bypassing batching. Useful for debugging or when batching is
	 * temporarily disabled. Default: `false`.
	 */
	passthrough?: boolean;
	/**
	 * Whether to append a newline on each `flush()`. Useful for log
	 * collectors. Default: `false`.
	 */
	newlineOnFlush?: boolean;
}

export interface BatchHandle {
	/** Write text to the internal buffer. */
	write(text: string): void;
	/**
	 * Write text and immediately flush.
	 * Equivalent to `batch.write(text); batch.flush()`.
	 */
	writeAndFlush(text: string): void;
	/** Flush the buffer to the output stream. */
	flush(): void;
	/**
	 * Schedule a flush on the next microtask / `setImmediate`.
	 * Multiple `defer()` calls within the same synchronous block
	 * coalesce into a single flush. Each batch instance has its own
	 * deferred timer so they never collide.
	 */
	defer(): void;
	/** Get the current buffer contents without flushing. */
	read(): string;
	/** Get the current buffer size in bytes. */
	size(): number;
	/** Clear the buffer without flushing. */
	clear(): void;
	/** Enable or disable passthrough mode. */
	setPassthrough(enabled: boolean): void;
	/**
	 * Destroy the batch: stop the interval timer, flush remaining,
	 * and release resources.
	 */
	destroy(): void;
}

/* ── Create Batch ────────────────────────────────────────────── */

/**
 * Create a render batch that collects write operations and flushes them
 * efficiently.
 *
 * Every batch instance has its own deferred-timer state, so multiple
 * batches calling `defer()` in the same tick work independently.
 *
 * @param options - Batch configuration
 * @returns A `BatchHandle` for writing, flushing, and lifecycle management.
 */
export function createBatch(options?: BatchOptions): BatchHandle {
	const {
		maxSize = 16384,
		flushInterval,
		stream = process.stdout,
		passthrough: initialPassthrough = false,
		newlineOnFlush = false,
	} = options ?? {};

	const logger = createLogger("batch");

	let buffer = "";
	let destroyed = false;
	let intervalTimer: ReturnType<typeof setInterval> | null = null;

	// Mutable passthrough flag — defined before any closure so write()
	// can read the live value without a fragile override pattern.
	const passthroughState = { enabled: initialPassthrough };

	// Per-instance deferred timer state. Each batch gets its own
	// timer/callback pair so concurrent batches never collide.
	// Uses setTimeout rather than setImmediate for portability
	// (no type gymnastics across Node.js runtimes).
	let deferToken: ReturnType<typeof setTimeout> | null = null;
	let deferScheduled = false;

	// ── Auto-flush interval ────────────────────────────────────

	if (flushInterval !== undefined && flushInterval > 0) {
		intervalTimer = setInterval(() => {
			if (destroyed) return;
			doFlush();
		}, flushInterval);

		if (typeof intervalTimer === "object" && "unref" in intervalTimer) {
			(intervalTimer as NodeJS.Timeout).unref();
		}
	}

	// ── Flush implementation ───────────────────────────────────

	function doFlush(): void {
		deferScheduled = false;
		if (destroyed || buffer.length === 0) return;

		try {
			const data = newlineOnFlush ? buffer + "\n" : buffer;
			stream.write(data);
		} catch (err) {
			logger.error("batch flush failed", err);
		}

		buffer = "";
	}

	// ── Per-instance deferred flush ────────────────────────────

	function scheduleDeferred(): void {
		if (deferScheduled) return; // Already pending — coalesce
		deferScheduled = true;

		// Use a single pattern: always schedule via setTimeout(0).
		// The `setImmediate` vs `setTimeout(0)` distinction doesn't
		// matter for the flush granularity DUI needs (one macrotask
		// is sufficient to coalesce writes). Avoiding the type
		// gymnastics around `setImmediate`'s narrower Node.js type
		// keeps the code cleaner and more portable.
		deferToken = setTimeout(() => {
			deferToken = null;
			doFlush();
		}, 0);
	}

	function cancelDeferred(): void {
		if (deferToken !== null) {
			clearTimeout(deferToken);
			deferToken = null;
		}
		deferScheduled = false;
	}

	// ── Handle (built once, no overrides needed) ───────────────

	const handle: BatchHandle = {
		write(text: string): void {
			if (destroyed) return;

			if (passthroughState.enabled) {
				stream.write(text);
				return;
			}

			buffer += text;

			if (buffer.length >= maxSize) {
				doFlush();
			}
		},

		writeAndFlush(text: string): void {
			handle.write(text);
			doFlush();
		},

		flush(): void {
			doFlush();
		},

		defer(): void {
			scheduleDeferred();
		},

		read(): string {
			return buffer;
		},

		size(): number {
			return buffer.length;
		},

		clear(): void {
			buffer = "";
		},

		setPassthrough(enabled: boolean): void {
			passthroughState.enabled = enabled;
		},

		destroy(): void {
			if (intervalTimer !== null) {
				clearInterval(intervalTimer);
				intervalTimer = null;
			}
			cancelDeferred();
			// Flush remaining buffer BEFORE marking as destroyed.
			// `doFlush()` checks `destroyed` and returns early when set.
			doFlush();
			destroyed = true;
		},
	};

	return handle;
}

/* ── Singleton default batch ─────────────────────────────────── */

let defaultBatch: BatchHandle | null = null;

/**
 * Get or create the default render batch singleton.
 * Useful when you want a single batch throughout your CLI without
 * passing handles around.
 *
 * @param options - Applied only on first call (singleton creation).
 * @returns The default batch handle.
 *
 * @example
 * ```ts
 * import { getDefaultBatch } from "@bdocs/dui"
 *
 * getDefaultBatch().write("Hello\n")
 * getDefaultBatch().flush()
 * ```
 */
export function getDefaultBatch(options?: BatchOptions): BatchHandle {
	if (!defaultBatch) {
		defaultBatch = createBatch(options);
	}
	return defaultBatch;
}

/**
 * Destroy and reset the default batch singleton.
 */
export function resetDefaultBatch(): void {
	if (defaultBatch) {
		defaultBatch.destroy();
		defaultBatch = null;
	}
}
