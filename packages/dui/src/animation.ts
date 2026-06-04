import { interpolateColor } from "./color";
import type { ColorInput } from "./color";

export type Easing =
	| "linear"
	| "ease-in"
	| "ease-out"
	| "ease-in-out"
	| ((t: number) => number);

export interface Keyframe {
	offset: number;
	content?: string;
	fg?: ColorInput;
	bg?: ColorInput;
}

export interface ResolvedFrame {
	content: string;
	fg?: string;
	bg?: string;
}

export interface AnimationConfig {
	keyframes: Keyframe[];
	duration: number;
	loop?: boolean;
	easing?: Easing;
}

export interface AnimationHandle {
	stop(): void;
	then(cb: () => void): void;
}

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

export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

function findSegment(
	keyframes: Keyframe[],
	t: number,
): [Keyframe, Keyframe, number] {
	if (t <= 0) return [keyframes[0], keyframes[1] ?? keyframes[0], 0];
	if (t >= 1)
		return [
			keyframes[keyframes.length - 2] ?? keyframes[0],
			keyframes[keyframes.length - 1],
			1,
		];

	for (let i = 0; i < keyframes.length - 1; i++) {
		const a = keyframes[i];
		const b = keyframes[i + 1];
		if (t >= a.offset && t <= b.offset) {
			const localT =
				b.offset === a.offset ? 0 : (t - a.offset) / (b.offset - a.offset);
			return [a, b, localT];
		}
	}

	return [keyframes[0], keyframes[keyframes.length - 1], t];
}

function resolveFrame(
	keyframes: Keyframe[],
	t: number,
	easing: (t: number) => number,
): ResolvedFrame {
	const [a, b, localT] = findSegment(keyframes, t);
	const et = easing(localT);

	const firstContent =
		keyframes.find((k) => k.content !== undefined)?.content ?? "";
	let content = a.content ?? firstContent;
	if (b.content !== undefined && a.content !== b.content) {
		content = et < 0.5 ? (a.content ?? firstContent) : b.content;
	}

	const fg =
		a.fg && b.fg && a.fg !== b.fg
			? interpolateColor(a.fg, b.fg, et)
			: (a.fg ?? b.fg);

	const bg =
		a.bg && b.bg && a.bg !== b.bg
			? interpolateColor(a.bg, b.bg, et)
			: (a.bg ?? b.bg);

	return { content, fg, bg };
}

export function animate(
	config: AnimationConfig & {
		onFrame: (frame: ResolvedFrame) => void;
	},
): AnimationHandle {
	const { keyframes, duration, loop, easing, onFrame } = config;
	const easingFn = resolveEasing(easing ?? "linear");
	const startTime = performance.now();
	let timer: ReturnType<typeof setTimeout> | null = null;
	let stopped = false;
	const doneCallbacks: (() => void)[] = [];

	if (keyframes.length === 0) {
		console.warn("[dui] animate() called with empty keyframes array. Provide at least one keyframe.");
		return { stop: () => {}, then: (cb) => cb() };
	}

	const sorted = [...keyframes].sort((a, b) => a.offset - b.offset);
	if (sorted[0].offset !== 0) {
		sorted.unshift({
			offset: 0,
			content: sorted[0].content,
			fg: sorted[0].fg,
			bg: sorted[0].bg,
		});
	}
	if (sorted[sorted.length - 1].offset !== 1) {
		sorted.push({
			offset: 1,
			content: sorted[sorted.length - 1].content,
			fg: sorted[sorted.length - 1].fg,
			bg: sorted[sorted.length - 1].bg,
		});
	}

	function tick() {
		if (stopped) return;

		const elapsed = performance.now() - startTime;
		const rawT = elapsed / duration;
		const t = loop ? rawT % 1 : Math.min(rawT, 1);

		const frame = resolveFrame(sorted, t, easingFn);
		onFrame(frame);

		if (!loop && rawT >= 1) {
			for (const cb of doneCallbacks) cb();
			return;
		}

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
		then(cb: () => void) {
			doneCallbacks.push(cb);
		},
	};
}
