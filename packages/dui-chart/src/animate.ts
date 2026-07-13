import { animateProgress, type Easing } from "@bdocs/dui";

export interface AnimateChartConfig {
	duration?: number;
	loop?: boolean;
	easing?: Easing;
	onFrame: (progress: number) => void;
}

export interface AnimateChartHandle {
	stop(): void;
}

/**
 * Animate chart progress using the core animation engine.
 *
 * Thin wrapper around `animateProgress()` from @bdocs/dui,
 * re-exported for convenience so chart users don't need to
 * import from the core package directly.
 *
 * Supports all easing presets, spring physics, and custom
 * cubic-bezier easings via `createEasing()`.
 */
export function animateChart(config: AnimateChartConfig): AnimateChartHandle {
	const { duration = 1000, loop = false, easing = "ease-out", onFrame } = config;

	const handle = animateProgress({
		duration,
		loop,
		easing,
		onFrame,
	});

	return {
		stop() {
			handle.stop();
		},
	};
}
