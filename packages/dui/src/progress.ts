import readline from "node:readline";
import type { Easing } from "./animation";
import { animateProgress } from "./animation";
import type { ColorInput } from "./color";
import { colorize, interpolateColor } from "./color";
import { getConfig } from "./config";
import type { ColorStyle } from "./theme";
import { resolveColor } from "./theme";
import {
	calcPercentage,
	buildBarString,
	formatProgressLine,
} from "./render";

export interface ProgressBarOptions {
	width?: number;
	prefix?: string;
	suffix?: string;
	barChar?: string;
	emptyChar?: string;
	color?: ColorStyle;
}

export interface ProgressBar {
	start(total?: number): void;
	update(current: number, message?: string): void;
	stop(message?: string): void;
	readonly percentage: number;
}

/**
 * Extended options for the smooth-fill animated progress bar.
 *
 * In addition to all `ProgressBarOptions`, you can configure the
 * animation easing and duration so that each `update()` call
 * smoothly fills the bar from its current position to the target
 * value instead of jumping discretely.
 *
 * @example
 * ```ts
 * import { createAnimatedProgressBar } from "@bdocs/dui"
 *
 * const bar = createAnimatedProgressBar({
 *   width: 40,
 *   easing: "ease-out-elastic",
 *   animDuration: 600,
 *   prefix: "installing...",
 * })
 * bar.start(12)
 * bar.update(4)   // smoothly fills to 33%
 * bar.update(12)  // smoothly fills to 100%
 * bar.stop("done")
 * ```
 */
export interface AnimatedProgressBarOptions extends ProgressBarOptions {
	/**
	 * Easing function or preset name for the smooth-fill animation.
	 * Accepts any value that `animateProgress()` accepts — named presets
	 * (`"ease-out"`, `"ease-out-elastic"`, `"ease-in-out-cubic"`, …),
	 * custom functions, `cubic-bezier()` strings, or a spring config.
	 *
	 * @default "ease-out"
	 */
	easing?: Easing;
	/**
	 * Duration of each smooth-fill transition in milliseconds.
	 * A shorter duration feels snappier; a longer duration looks more
	 * deliberate and lets the easing curve show.
	 *
	 * @default 300
	 */
	animDuration?: number;
}

export function createProgressBar(opts?: ProgressBarOptions): ProgressBar {
	const barWidth = opts?.width ?? 30;
	const barChar = opts?.barChar ?? "\u2588";
	const emptyChar = opts?.emptyChar ?? "\u2591";
	const isTTY = process.stdout.isTTY;
	const theme = getConfig().theme;
	const { apply: barStyle } = resolveColor("progress.bar", theme, opts?.color);

	let total = 100;
	let current = 0;
	let message = "";
	let timer: ReturnType<typeof setInterval> | null = null;
	let started = false;
	let stopped = false;

	const prefixStr = opts?.prefix ?? "";
	const suffixStr = opts?.suffix ?? "";

	function render() {
		if (stopped) return;
		const pct = calcPercentage(total, current);
		const rawBar = buildBarString(pct, barWidth, barChar, emptyChar);
		const coloredBar = barStyle(rawBar);
		const line = formatProgressLine(pct, coloredBar, message, prefixStr, suffixStr);
		if (isTTY) {
			readline.clearLine(process.stdout, 0);
			readline.cursorTo(process.stdout, 0);
			process.stdout.write(line);
		}
	}

	function start(t?: number) {
		if (started) return;
		started = true;
		stopped = false;
		if (t !== undefined) total = t;

		if (isTTY) {
			process.stdout.write("\u001b[?25l");
			render();
			timer = setInterval(render, 100);
		} else {
			const pct = calcPercentage(total, current);
			const rawBar = buildBarString(pct, barWidth, barChar, emptyChar);
			const coloredBar = barStyle(rawBar);
			process.stdout.write(formatProgressLine(pct, coloredBar, message, prefixStr, suffixStr) + "\n");
		}
	}

	function update(c: number, msg?: string) {
		current = c;
		if (msg !== undefined) message = msg;

		if (!isTTY && started) {
			const pct = calcPercentage(total, current);
			const rawBar = buildBarString(pct, barWidth, barChar, emptyChar);
			const coloredBar = barStyle(rawBar);
			process.stdout.write(formatProgressLine(pct, coloredBar, message, prefixStr, suffixStr) + "\n");
		}
	}

	function stop(msg?: string) {
		if (stopped) return;
		stopped = true;
		if (msg !== undefined) message = msg;

		if (timer) {
			clearInterval(timer);
			timer = null;
		}

		const pct = calcPercentage(total, current);
		const rawBar = buildBarString(pct, barWidth, barChar, emptyChar);
		const coloredBar = barStyle(rawBar);
		const line = formatProgressLine(pct, coloredBar, message, prefixStr, suffixStr);

		if (isTTY) {
			readline.clearLine(process.stdout, 0);
			readline.cursorTo(process.stdout, 0);
			process.stdout.write(line + "\n");
			process.stdout.write("\u001b[?25h");
		} else {
			process.stdout.write(line + "\n");
		}
	}

	return {
		start,
		update,
		stop,
		get percentage() {
			return calcPercentage(total, current);
		},
	};
}

/**
 * Creates an animated progress bar with smooth-fill transitions.
 *
 * Every `update()` call triggers an `animateProgress()` transition from
 * the bar's **displayed** position to the new target, using the
 * configured easing and duration. Rapid successive calls cancel the
 * in-flight animation and start fresh from wherever the bar is currently
 * shown, so the bar always feels responsive.
 *
 * On non-TTY terminals the bar falls back to discrete writes (same as
 * `createProgressBar`), so it works seamlessly in CI / piped output.
 *
 * @example
 * ```ts
 * import { createAnimatedProgressBar } from "@bdocs/dui"
 *
 * const bar = createAnimatedProgressBar({
 *   width: 40,
 *   prefix: "downloading",
 *   suffix: "MB",
 *   easing: "ease-out-cubic",     // smooth deceleration
 *   animDuration: 500,            // 500ms per transition
 * })
 *
 * bar.start(100)       // total = 100 MB
 * bar.update(25)       // animates to 25%
 * bar.update(50)       // animates from displayed ~25% to 50%
 * bar.update(75)       // animates from displayed ~50% to 75%
 * bar.stop("complete") // jumps to 100% immediately
 * ```
 */
// ── MultiProgressBar ───────────────────────────────────────────

/**
 * Configuration for a single bar within a `MultiProgressBar`.
 * Extends `AnimatedProgressBarOptions` so each bar can have its
 * own easing, duration, color, label, characters, and prefix/suffix.
 *
 * @example
 * ```ts
 * { label: "build", color: "green", easing: "ease-out-cubic" }
 * { label: "lint",  color: "yellow" }
 * { label: "test",  color: "red", animDuration: 500 }
 * ```
 */
export interface MultiBarConfig extends AnimatedProgressBarOptions {
	/**
	 * Optional short label displayed at the start of the bar line.
	 * Useful when multiple bars represent different tasks.
	 */
	label?: string;
}

/**
 * Handle to control an individual bar inside a `MultiProgressBar`.
 */
export interface MultiBarHandle {
	/** Zero-based index of this bar within the multi-bar group. */
	readonly index: number;
	/**
	 * Start this bar with an optional total.
	 * Calling this sets the bar's total without affecting the multi-bar
	 * group — the group must be started via `multi.start()` first.
	 */
	start(total?: number): void;
	/** Update this bar's progress to `current` and optionally set a message. */
	update(current: number, message?: string): void;
	/**
	 * Stop this individual bar, freezing it at its current percentage.
	 * The multi-bar group continues to render; call `multi.stop()` to
	 * stop the entire group and restore the cursor.
	 */
	stop(message?: string): void;
	/** Current percentage (0–100) computed from current / total. */
	readonly percentage: number;
}

/**
 * Options for constructing a `MultiProgressBar`.
 *
 * @example
 * ```ts
 * const multi = createMultiProgressBar({
 *   bars: [
 *     { label: "build", width: 40, color: "green", easing: "ease-out-cubic" },
 *     { label: "lint",  width: 40, color: "yellow" },
 *     { label: "test",  width: 40, color: "red", animDuration: 500 },
 *   ],
 *   spacing: 1,
 * })
 * ```
 */
export interface MultiProgressBarOptions {
	/** Array of per-bar configurations. */
	bars: MultiBarConfig[];
	/**
	 * Extra blank rows between each bar.
	 * @default 0
	 */
	spacing?: number;
}

/**
 * Handle for a group of parallel animated progress bars rendered in
 * stacked rows on the same terminal.
 */
export interface MultiProgressBarHandle {
	/** Read-only array of individual bar handles. */
	readonly bars: readonly MultiBarHandle[];
	/**
	 * Start all bars, hide cursor, and render the initial state
	 * (each bar at 0%) on stacked rows.
	 */
	start(): void;
	/**
	 * Stop all bars, kill any in-flight animations, render the final
	 * state of each bar, restore the cursor, and advance past the
	 * multi-bar area so subsequent output isn't overwritten.
	 */
	stop(message?: string): void;
}

/**
 * Creates a multi-bar progress group that composes multiple
 * `createAnimatedProgressBar` instances in parallel — each bar has its
 * own easing, color, and characters — rendered on stacked terminal rows.
 *
 * Perfect for download managers, parallel build steps (lint, test,
 * build running simultaneously), or server-health dashboards where
 * each metric gets its own animated bar.
 *
 * **TTY behaviour** — animates each bar independently via
 * `animateProgress()`. On every animation frame all bars are
 * re-rendered at their current displayed percentage on their respective
 * terminal rows, so the group stays visually coherent.
 *
 * **Non-TTY fallback** — each individual `update()` writes a full
 * snapshot of every bar, one per line, so CI / piped output still
 * shows progress.
 *
 * @example
 * ```ts
 * const multi = createMultiProgressBar({
 *   bars: [
 *     { label: "download", width: 30, color: "cyan",  easing: "ease-out" },
 *     { label: "verify",   width: 30, color: "green", easing: "ease-out-cubic" },
 *     { label: "install",  width: 30, color: "yellow" },
 *   ],
 *   spacing: 1,
 * })
 *
 * multi.start()
 *
 * // Simulate concurrent updates
 * multi.bars[0].update(50)
 * multi.bars[1].update(30)
 * multi.bars[2].update(10)
 *
 * setTimeout(() => {
 *   multi.bars[0].update(100, "complete")
 *   multi.bars[1].update(100)
 *   multi.bars[2].update(100)
 *   multi.stop("all done")
 * }, 3000)
 * ```
 */
export function createMultiProgressBar(
	opts: MultiProgressBarOptions,
): MultiProgressBarHandle {
	const barConfigs = opts.bars;
	const spacing = opts.spacing ?? 0;
	const isTTY = process.stdout.isTTY;
	const stdout = process.stdout;
	const theme = getConfig().theme;

	interface BarState {
		config: MultiBarConfig;
		total: number;
		current: number;
		message: string;
		displayPct: number;
		barStarted: boolean;
		barStopped: boolean;
		animHandle: { stop(): void } | null;
	}

	const states: BarState[] = barConfigs.map((cfg) => ({
		config: cfg,
		total: 100,
		current: 0,
		message: "",
		displayPct: 0,
		barStarted: false,
		barStopped: false,
		animHandle: null,
	}));

	let multiStarted = false;
	let multiStopped = false;
	let writtenLines = 0;

	function renderLine(state: BarState, pct: number, msg: string): string {
		const { apply: barStyle } = resolveColor(
			"progress.bar",
			theme,
			state.config.color,
		);
		const width = state.config.width ?? 30;
		const barChar = state.config.barChar ?? "\u2588";
		const emptyChar = state.config.emptyChar ?? "\u2591";
		const rawBar = buildBarString(pct, width, barChar, emptyChar);
		const coloredBar = barStyle(rawBar);
		const label = state.config.label ?? "";
		const prefix = state.config.prefix ?? "";
		const suffix = state.config.suffix ?? "";
		// Label is prepended to prefix for the shared formatter
		const combinedPrefix = [label, prefix].filter(Boolean).join(" ");
		return formatProgressLine(pct, coloredBar, msg, combinedPrefix, suffix);
	}

	function renderLineAtPct(state: BarState, pct: number): string {
		return renderLine(state, pct, state.message);
	}

	function animateTo(state: BarState, targetPct: number) {
		if (state.animHandle) {
			state.animHandle.stop();
			state.animHandle = null;
		}

		const startPct = state.displayPct;
		const delta = targetPct - startPct;

		if (Math.abs(delta) < 0.5) {
			state.displayPct = targetPct;
			renderAll();
			return;
		}

		const easing = state.config.easing ?? "ease-out";
		const animDuration = state.config.animDuration ?? 300;

		state.animHandle = animateProgress({
			duration: animDuration,
			easing,
			onFrame: (p) => {
				state.displayPct = startPct + delta * p;
				renderAll();
			},
		});
	}

	function renderAll() {
		if (multiStopped) return;

		// Move cursor to the first bar's row
		if (writtenLines > 0) {
			stdout.write("\r");
			if (writtenLines > 1) {
				stdout.write("\u001b[" + (writtenLines - 1) + "A");
			}
		}

		let count = 0;
		for (let i = 0; i < states.length; i++) {
			const state = states[i];
			const line = renderLineAtPct(state, state.displayPct);
			stdout.write("\u001b[2K" + line);
			count++;

			if (i < states.length - 1) {
				stdout.write("\n");
				count++;
				for (let s = 0; s < spacing; s++) {
					stdout.write("\u001b[2K\n");
					count++;
				}
			}
		}

		writtenLines = count;
	}

	const bars: MultiBarHandle[] = states.map((state, i) => {
		function handleStart(total?: number) {
			if (state.barStopped) return;
			state.barStarted = true;
			if (total !== undefined) state.total = total;
		}

		function handleUpdate(current: number, msg?: string) {
			state.current = current;
			if (msg !== undefined) state.message = msg;

			if (!multiStarted || state.barStopped) return;

			if (isTTY) {
				animateTo(state, calcPercentage(state.total, state.current));
			} else {
				state.displayPct = calcPercentage(state.total, state.current);
				// Non-TTY: write full snapshot
				for (const s of states) {
					stdout.write(renderLineAtPct(s, s.displayPct) + "\n");
				}
			}
		}

		function handleStop(msg?: string) {
			if (state.barStopped) return;
			state.barStopped = true;
			if (msg !== undefined) state.message = msg;

			if (state.animHandle) {
				state.animHandle.stop();
				state.animHandle = null;
			}

			state.displayPct = calcPercentage(state.total, state.current);

			// Re-render if multi is still active
			if (multiStarted && !multiStopped && isTTY) {
				renderAll();
			}
		}

		return {
			index: i,
			start: handleStart,
			update: handleUpdate,
			stop: handleStop,
			get percentage() {
				return calcPercentage(state.total, state.current);
			},
		};
	});

	function start() {
		if (multiStarted) return;
		multiStarted = true;
		multiStopped = false;
		writtenLines = 0;

		for (const state of states) {
			state.barStarted = true;
			state.barStopped = false;
			state.displayPct = 0;
		}

		if (isTTY) {
			stdout.write("\u001b[?25l");
			renderAll();
		} else {
			for (const state of states) {
				stdout.write(renderLineAtPct(state, 0) + "\n");
			}
		}
	}

	function stop(msg?: string) {
		if (multiStopped) return;

		// Kill all animations, finalize each bar
		for (const state of states) {
			if (state.animHandle) {
				state.animHandle.stop();
				state.animHandle = null;
			}
			state.barStopped = true;
			if (msg !== undefined) state.message = msg;
			state.displayPct = calcPercentage(state.total, state.current);
		}

		// Render final state (renderAll is still allowed because
		// multiStopped is not set yet)
		if (isTTY) {
			renderAll();
			stdout.write("\n");
			stdout.write("\u001b[?25h");
		} else {
			for (const state of states) {
				stdout.write(renderLineAtPct(state, state.displayPct) + "\n");
			}
		}

		multiStopped = true;
		writtenLines = 0;
	}

	return { bars, start, stop };
}

// ── Task ───────────────────────────────────────────────────────

/**
 * Context passed to the task work function.
 * Lets the caller report progress via `update(current, message?)`
 * and read the current `percentage` at any point.
 */
export interface TaskContext {
	/**
	 * Advance the progress bar to `current` and optionally update
	 * the status message shown after the bar.
	 */
	update(current: number, message?: string): void;
	/**
	 * Update the status message without changing progress.
	 */
	setMessage(message: string): void;
	/** Current progress as a 0–100 value. */
	readonly percentage: number;
}

/**
 * Options for the high-level `task()` wrapper.
 * Extends `AnimatedProgressBarOptions` so you can control the
 * bar's appearance (width, characters, color, easing, etc.).
 */
export interface TaskOptions extends AnimatedProgressBarOptions {
	/**
	 * Total number of steps for this task.
	 * @default 1
	 */
	total?: number;
	/**
	 * Message shown when the task completes successfully.
	 * @default `${label} done`
	 */
	successMessage?: string;
	/**
	 * Message shown when the task fails.
	 * @default `${label} failed`
	 */
	errorMessage?: string;
}

/**
 * Wraps a promise-returning function with an animated progress bar.
 *
 * The bar auto-starts with the given `label` as prefix. The work
 * function receives a `TaskContext` that lets it report progress
 * via `update(current, message?)`. When the promise resolves the
 * bar automatically finishes with a success message; when it
 * rejects the bar shows an error message and the rejection
 * propagates.
 *
 * @example
 * ```ts
 * import { task } from "@bdocs/dui"
 *
 * const result = await task("installing", 3, async (ctx) => {
 *   await fetchPackage()
 *   ctx.update(1, "fetched")
 *
 *   await build()
 *   ctx.update(2, "compiled")
 *
 *   await deploy()
 *   ctx.update(3, "deployed")
 * })
 * ```
 *
 * @param label - Short label used as the progress bar prefix.
 * @param optionsOrTotal - Either a `TaskOptions` object or a shorthand number for `total`.
 * @param fn - Async work function that receives a `TaskContext`.
 * @returns The resolved value of the work function.
 */
export function task<T>(
	label: string,
	optionsOrTotal: TaskOptions | number,
	fn: (ctx: TaskContext) => Promise<T>,
): Promise<T> {
	const opts: TaskOptions =
		typeof optionsOrTotal === "number"
			? { total: optionsOrTotal }
			: optionsOrTotal;

	const total = opts.total ?? 1;
	const successMessage = opts.successMessage ?? `${label} done`;
	const errorMessage = opts.errorMessage ?? `${label} failed`;

	// Build the bar using the label as prefix and passing through
	// bar-level options (width, suffix, easing, color, etc.)
	const bar = createAnimatedProgressBar({
		prefix: label,
		suffix: opts.suffix,
		width: opts.width,
		barChar: opts.barChar,
		emptyChar: opts.emptyChar,
		color: opts.color,
		easing: opts.easing,
		animDuration: opts.animDuration,
	});

	// Track the raw step count so setMessage can re-render at the
	// *same* progress position without confusing current vs percentage.
	let _current = 0;

	const context: TaskContext = {
		update(current: number, message?: string) {
			_current = current;
			bar.update(current, message);
		},
		setMessage(message: string) {
			// Pass the raw step count (not percentage) so
			// bar.update() correctly computes the percentage.
			bar.update(_current, message);
		},
		get percentage() {
			return bar.percentage;
		},
	};

	bar.start(total);

	// Wrap in a try-catch so a synchronous throw from fn still
	// stops the bar and restores the cursor before propagating.
	let promise: Promise<T>;
	try {
		promise = fn(context);
	} catch (err) {
		bar.stop(errorMessage);
		throw err;
	}

	return promise.then(
		(value: T) => {
			bar.stop(successMessage);
			return value;
		},
		(error: unknown) => {
			bar.stop(errorMessage);
			throw error;
		},
	);
}

export function createAnimatedProgressBar(
	opts?: AnimatedProgressBarOptions,
): ProgressBar {
	const barWidth = opts?.width ?? 30;
	const barChar = opts?.barChar ?? "\u2588";
	const emptyChar = opts?.emptyChar ?? "\u2591";
	const isTTY = process.stdout.isTTY;
	const theme = getConfig().theme;
	const { apply: barStyle } = resolveColor("progress.bar", theme, opts?.color);
	const easing = opts?.easing ?? "ease-out";
	const animDuration = opts?.animDuration ?? 300;

	let total = 100;
	let current = 0;
	let message = "";
	let started = false;
	let stopped = false;
	let displayPct = 0;
	let animHandle: { stop(): void } | null = null;

	const prefixStr = opts?.prefix ?? "";
	const suffixStr = opts?.suffix ?? "";

	function renderAt(pct: number) {
		if (stopped) return;
		displayPct = pct;
		const rawBar = buildBarString(pct, barWidth, barChar, emptyChar);
		const coloredBar = barStyle(rawBar);
		const line = formatProgressLine(pct, coloredBar, message, prefixStr, suffixStr);
		if (isTTY) {
			readline.clearLine(process.stdout, 0);
			readline.cursorTo(process.stdout, 0);
			process.stdout.write(line);
		}
	}

	function animateTo(targetPct: number) {
		// Cancel any running animation so we start fresh from the
		// *displayed* position, not the (potentially stale) target.
		if (animHandle) {
			animHandle.stop();
			animHandle = null;
		}

		const startPct = displayPct;
		const delta = targetPct - startPct;

		// Skip the animation loop for tiny nudges — just snap.
		if (Math.abs(delta) < 0.5) {
			renderAt(targetPct);
			return;
		}

		animHandle = animateProgress({
			duration: animDuration,
			easing,
			onFrame: (p) => {
				renderAt(startPct + delta * p);
			},
		});
	}

	function start(t?: number) {
		if (started) return;
		started = true;
		stopped = false;
		if (t !== undefined) total = t;

		if (isTTY) {
			process.stdout.write("\u001b[?25l");
			renderAt(0);
		} else {
			const pct = calcPercentage(total, current);
			const rawBar = buildBarString(pct, barWidth, barChar, emptyChar);
			const coloredBar = barStyle(rawBar);
			process.stdout.write(formatProgressLine(pct, coloredBar, message, prefixStr, suffixStr) + "\n");
		}
	}

	function update(c: number, msg?: string) {
		current = c;
		if (msg !== undefined) message = msg;

		if (isTTY && started) {
			animateTo(calcPercentage(total, current));
		} else if (!isTTY && started) {
			const pct = calcPercentage(total, current);
			const rawBar = buildBarString(pct, barWidth, barChar, emptyChar);
			const coloredBar = barStyle(rawBar);
			process.stdout.write(formatProgressLine(pct, coloredBar, message, prefixStr, suffixStr) + "\n");
		}
	}

	function stop(msg?: string) {
		if (stopped) return;
		stopped = true;
		if (msg !== undefined) message = msg;

		// Kill any in-flight animation immediately.
		if (animHandle) {
			animHandle.stop();
			animHandle = null;
		}

		const pct = calcPercentage(total, current);
		const rawBar = buildBarString(pct, barWidth, barChar, emptyChar);
		const coloredBar = barStyle(rawBar);
		const line = formatProgressLine(pct, coloredBar, message, prefixStr, suffixStr);

		if (isTTY) {
			readline.clearLine(process.stdout, 0);
			readline.cursorTo(process.stdout, 0);
			process.stdout.write(line + "\n");
			process.stdout.write("\u001b[?25h");
		} else {
			process.stdout.write(line + "\n");
		}
	}

	return {
		start,
		update,
		stop,
		get percentage() {
			return calcPercentage(total, current);
		},
	};
}
