import type { Easing } from "@bdocs/dui";

const EASING_FNS: Record<string, (t: number) => number> = {
	linear: (t) => t,
	"ease-in": (t) => t * t,
	"ease-out": (t) => t * (2 - t),
	"ease-in-out": (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};

function resolveEasing(easing: Easing): (t: number) => number {
	if (typeof easing === "function") return easing;
	return EASING_FNS[easing] ?? EASING_FNS.linear;
}

export interface AnimateChartConfig {
	duration?: number;
	loop?: boolean;
	easing?: Easing;
	onFrame: (progress: number) => void;
}

export interface AnimateChartHandle {
	stop(): void;
}

export function animateChart(config: AnimateChartConfig): AnimateChartHandle {
	const { duration = 1000, loop = false, easing = "ease-out", onFrame } = config;
	const easingFn = resolveEasing(easing);
	const startTime = performance.now();
	let timer: ReturnType<typeof setTimeout> | null = null;
	let stopped = false;

	function tick() {
		if (stopped) return;

		const elapsed = performance.now() - startTime;
		const rawT = elapsed / duration;
		const t = loop ? rawT % 1 : Math.min(rawT, 1);
		const easedT = easingFn(t);

		onFrame(easedT);

		if (!loop && rawT >= 1) return;

		timer = setTimeout(tick, 1000 / 60);
	}

	tick();

	return {
		stop() {
			stopped = true;
			if (timer !== null) {
				clearTimeout(timer);
				timer = null;
			}
		},
	};
}
