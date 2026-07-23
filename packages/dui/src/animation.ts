import type { ColorInput } from "./color";
import { interpolateColor } from "./color";

// ── Easing system ───────────────────────────────────────────────

/** Easing names — common presets plus smooth-step variants. */
export type EasingName =
	| "linear"
	| "ease-in"
	| "ease-out"
	| "ease-in-out"
	// Quad, cubic, quart, quint — power series
	| "ease-in-quad"
	| "ease-out-quad"
	| "ease-in-out-quad"
	| "ease-in-cubic"
	| "ease-out-cubic"
	| "ease-in-out-cubic"
	| "ease-in-quart"
	| "ease-out-quart"
	| "ease-in-out-quart"
	| "ease-in-quint"
	| "ease-out-quint"
	| "ease-in-out-quint"
	// Trigonometric
	| "ease-in-sine"
	| "ease-out-sine"
	| "ease-in-out-sine"
	// Exponential
	| "ease-in-expo"
	| "ease-out-expo"
	| "ease-in-out-expo"
	// Circular
	| "ease-in-circ"
	| "ease-out-circ"
	| "ease-in-out-circ"
	// Overshoot
	| "ease-in-back"
	| "ease-out-back"
	| "ease-in-out-back"
	// Elastic (oscillates before settling)
	| "ease-in-elastic"
	| "ease-out-elastic"
	| "ease-in-out-elastic"
	// Bounce
	| "ease-in-bounce"
	| "ease-out-bounce"
	| "ease-in-out-bounce";

/** Spring physics parameters for natural motion. */
export interface SpringConfig {
	/** Spring stiffness (tension). Higher = faster. Default 180. */
	stiffness?: number;
	/** Damping coefficient. Lower = more bounce. Default 12. */
	damping?: number;
	/** Mass of the object. Higher = slower. Default 1. */
	mass?: number;
	/** Initial velocity. Default 0. */
	velocity?: number;
}

export type Easing = EasingName | ((t: number) => number) | SpringConfig;

// ── Easing implementations ──────────────────────────────────────

type EasingFn = (t: number) => number;

const EASING_FNS: Record<string, EasingFn> = {
	// Linear
	linear: (t) => t,

	// Standard (same as CSS)
	"ease-in": (t) => t * t,
	"ease-out": (t) => t * (2 - t),
	"ease-in-out": (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

	// Quad
	"ease-in-quad": (t) => t * t,
	"ease-out-quad": (t) => t * (2 - t),
	"ease-in-out-quad": (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

	// Cubic
	"ease-in-cubic": (t) => t * t * t,
	"ease-out-cubic": (t) => --t * t * t + 1,
	"ease-in-out-cubic": (t) =>
		t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

	// Quart
	"ease-in-quart": (t) => t * t * t * t,
	"ease-out-quart": (t) => 1 - --t * t * t * t,
	"ease-in-out-quart": (t) =>
		t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,

	// Quint
	"ease-in-quint": (t) => t * t * t * t * t,
	"ease-out-quint": (t) => 1 + --t * t * t * t * t,
	"ease-in-out-quint": (t) =>
		t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t,

	// Sine
	"ease-in-sine": (t) => 1 - Math.cos((t * Math.PI) / 2),
	"ease-out-sine": (t) => Math.sin((t * Math.PI) / 2),
	"ease-in-out-sine": (t) => -(Math.cos(Math.PI * t) - 1) / 2,

	// Exponential
	"ease-in-expo": (t) => (t === 0 ? 0 : 2 ** (10 * (t - 1))),
	"ease-out-expo": (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
	"ease-in-out-expo": (t) => {
		if (t === 0 || t === 1) return t;
		return t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2;
	},

	// Circular
	"ease-in-circ": (t) => 1 - Math.sqrt(1 - t * t),
	"ease-out-circ": (t) => Math.sqrt(1 - --t * t),
	"ease-in-out-circ": (t) =>
		t < 0.5
			? (1 - Math.sqrt(1 - 4 * t * t)) / 2
			: (Math.sqrt(1 - 4 * (t - 1) * (t - 1)) + 1) / 2,

	// Back (overshoots)
	"ease-in-back": (t) => {
		const c1 = 1.70158;
		return (c1 + 1) * t * t * t - c1 * t * t;
	},
	"ease-out-back": (t) => {
		const c1 = 1.70158;
		return 1 + (c1 + 1) * --t * t * t + c1 * t * t;
	},
	"ease-in-out-back": (t) => {
		const c2 = 1.70158 * 1.525;
		return t < 0.5
			? (2 * t * (2 * t) * ((c2 + 1) * 2 * t - c2)) / 2
			: ((2 * t - 2) * (2 * t - 2) * ((c2 + 1) * (2 * t - 2) + c2) + 2) / 2;
	},

	// Elastic
	"ease-in-elastic": (t) => {
		if (t === 0 || t === 1) return t;
		const c4 = (2 * Math.PI) / 3;
		return -(2 ** (10 * (t - 1))) * Math.sin((t * 10 - 10.75) * c4);
	},
	"ease-out-elastic": (t) => {
		if (t === 0 || t === 1) return t;
		const c4 = (2 * Math.PI) / 3;
		return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
	},
	"ease-in-out-elastic": (t) => {
		if (t === 0 || t === 1) return t;
		const c5 = (2 * Math.PI) / 4.5;
		return t < 0.5
			? -(2 ** (20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
			: (2 ** (-20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
	},

	// Bounce
	"ease-in-bounce": (t) => 1 - bounceOut(1 - t),
	"ease-out-bounce": bounceOut,
	"ease-in-out-bounce": (t) =>
		t < 0.5 ? (1 - bounceOut(1 - 2 * t)) / 2 : (1 + bounceOut(2 * t - 1)) / 2,
};

/** Helper: bounce-out curve (used by all bounce variants). */
function bounceOut(t: number): number {
	const n1 = 7.5625;
	const d1 = 2.75;
	if (t < 1 / d1) return n1 * t * t;
	if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
	if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
	return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

// ── Easing resolver ─────────────────────────────────────────────

function isSpringConfig(easing: Easing): easing is SpringConfig {
	return (
		typeof easing === "object" &&
		easing !== null &&
		("stiffness" in easing || "damping" in easing)
	);
}

function resolveEasing(easing: Easing): EasingFn {
	if (typeof easing === "function") return easing;
	if (isSpringConfig(easing)) return createSpring(easing);
	return EASING_FNS[easing] ?? EASING_FNS.linear;
}

// ── Spring physics ──────────────────────────────────────────────

/**
 * Creates a spring-based easing function.
 *
 * Uses a critically-damped / underdamped spring model so the
 * animation "settles" naturally instead of following a fixed curve.
 *
 * @example
 * ```ts
 * const springEasing = createSpring({ stiffness: 200, damping: 15 })
 * animate({ keyframes, duration: 500, easing: springEasing, onFrame })
 * ```
 */
export function createSpring(config?: SpringConfig): EasingFn {
	const {
		stiffness = 180,
		damping = 12,
		mass = 1,
		velocity = 0,
	} = config ?? {};

	const w0 = Math.sqrt(stiffness / mass);
	const zeta = damping / (2 * Math.sqrt(stiffness * mass));
	const wd = w0 * Math.sqrt(1 - zeta * zeta);
	const A = 1;
	const B = (velocity + zeta * w0 * A) / wd;

	return (t: number) => {
		if (t >= 1) return 1;
		if (zeta < 1) {
			// Underdamped — oscillates and settles
			const envelope = Math.exp(-zeta * w0 * t);
			return A - envelope * (A * Math.cos(wd * t) + B * Math.sin(wd * t));
		}
		// Critically damped or overdamped — smooth settle
		return 1 - Math.exp(-stiffness * t) * (1 + stiffness * t);
	};
}

// ── Cubic bezier custom easing ──────────────────────────────────

/**
 * Creates a custom easing function from a cubic bezier curve.
 * Mirrors the CSS `cubic-bezier()` timing function.
 *
 * @param p0 - First control point X (0..1)
 * @param p1 - First control point Y
 * @param p2 - Second control point X (0..1)
 * @param p3 - Second control point Y
 *
 * @example
 * ```ts
 * // CSS ease-in-out equivalent
 * const myEasing = createEasing(0.42, 0, 0.58, 1)
 * ```
 */
export function createEasing(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
): EasingFn {
	const epsilon = 1 / 1000;

	function sampleCurveX(t: number): number {
		return (
			3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t
		);
	}

	function sampleCurveY(t: number): number {
		return (
			3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t
		);
	}

	function solveCurveX(x: number): number {
		let t0 = 0;
		let t1 = 1;
		let t2 = x;
		let x2Est: number;

		for (let i = 0; i < 10; i++) {
			x2Est = sampleCurveX(t2) - x;
			if (Math.abs(x2Est) < epsilon) return t2;
			if (x2Est < 0) t0 = t2;
			else t1 = t2;
			t2 = (t1 - t0) / 2 + t0;
		}

		return t2;
	}

	return (t: number) => {
		if (t <= 0 || t >= 1) return t;
		return sampleCurveY(solveCurveX(t));
	};
}

// ── Keyframe types ──────────────────────────────────────────────

export interface Keyframe {
	/** Position along the timeline, from 0 (start) to 1 (end) — CSS-style. */
	offset: number;
	/** Text content to display at this keyframe. */
	content?: string;
	/** Foreground color. */
	fg?: ColorInput;
	/** Background color. */
	bg?: ColorInput;
}

export interface ResolvedFrame {
	content: string;
	fg?: string;
	bg?: string;
}

// ── Animation config ────────────────────────────────────────────

export interface AnimationConfig {
	/** Ordered list of keyframes with offsets between 0 and 1. */
	keyframes: Keyframe[];
	/** Total duration in milliseconds. */
	duration: number;
	/** Whether to loop forever. Default false. */
	loop?: boolean;
	/** Easing function or preset name. Default "linear". */
	easing?: Easing;
	/** Target frame rate. Default 60. */
	fps?: number;
}

export interface AnimationHandle {
	/** Stop the animation immediately. */
	stop(): void;
	/** Register a callback for when the animation ends (non-looping only). */
	then(cb: () => void): void;
}

// ── Core: lerp ──────────────────────────────────────────────────

export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

// ── Core: findSegment ───────────────────────────────────────────

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

// ── Core: resolveFrame ──────────────────────────────────────────

function resolveFrame(
	keyframes: Keyframe[],
	t: number,
	easing: EasingFn,
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

// ── Normalize keyframes (auto-fill 0/1 if missing) ──────────────

function normalizeKeyframes(keyframes: Keyframe[]): Keyframe[] {
	if (keyframes.length === 0) return [];

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

	return sorted;
}

// ── Core: animate ───────────────────────────────────────────────

/**
 * Animates over a set of keyframes, calling `onFrame` for each
 * rendered frame.
 *
 * Supports CSS-style offset keyframes (0..1), 20+ easing presets,
 * spring physics, and custom cubic-bezier easings via `createEasing()`.
 *
 * @example
 * ```ts
 * const anim = animate({
 *   keyframes: [
 *     { offset: 0, content: "•", fg: "#ff0000" },
 *     { offset: 0.5, content: "►", fg: "#ffff00" },
 *     { offset: 1, content: "■", fg: "#00ff00" },
 *   ],
 *   duration: 1000,
 *   easing: "ease-out-elastic",
 *   onFrame: (frame) => render(frame.content, frame.fg),
 * })
 * ```
 */
export function animate(
	config: AnimationConfig & {
		onFrame: (frame: ResolvedFrame) => void;
	},
): AnimationHandle {
	const { keyframes, duration, loop = false, fps = 60, onFrame } = config;
	const easingFn = resolveEasing(config.easing ?? "linear");
	const startTime = performance.now();
	const frameInterval = 1000 / fps;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let stopped = false;
	const doneCallbacks: (() => void)[] = [];

	if (keyframes.length === 0) {
		console.warn(
			"[dui] animate() called with empty keyframes array. Provide at least one keyframe.",
		);
		return { stop: () => {}, then: (cb) => cb() };
	}

	const sorted = normalizeKeyframes(keyframes);

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

		timer = setTimeout(tick, frameInterval);
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

// ── animateProgress ─────────────────────────────────────────────

export interface AnimateProgressConfig {
	/** Total duration in milliseconds. Default 1000. */
	duration?: number;
	/** Whether to loop forever. Default false. */
	loop?: boolean;
	/** Easing function or preset name. Default "ease-out". */
	easing?: Easing;
	/** Target frame rate. Default 60. */
	fps?: number;
	/** Called each frame with the eased progress (0..1). */
	onFrame: (progress: number) => void;
}

export interface AnimateProgressHandle {
	/** Stop the animation immediately. */
	stop(): void;
}

/**
 * Animates a progress value from 0 to 1 using the given easing.
 * A simpler alternative to `animate()` when you don't need keyframes
 * — just a smooth progress over time.
 *
 * @example
 * ```ts
 * animateProgress({
 *   duration: 2000,
 *   easing: "ease-out-elastic",
 *   onFrame: (p) => renderBar(p),
 * })
 * ```
 */
export function animateProgress(
	config: AnimateProgressConfig,
): AnimateProgressHandle {
	const { duration = 1000, loop = false, fps = 60, onFrame } = config;
	const easingFn = resolveEasing(config.easing ?? "ease-out");
	const startTime = performance.now();
	const frameInterval = 1000 / fps;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let stopped = false;

	function tick() {
		if (stopped) return;

		const elapsed = performance.now() - startTime;
		const rawT = elapsed / duration;
		const t = loop ? rawT % 1 : Math.min(rawT, 1);
		const eased = easingFn(t);

		onFrame(eased);

		if (!loop && rawT >= 1) return;

		timer = setTimeout(tick, frameInterval);
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

// ── Timeline ────────────────────────────────────────────────────

interface TimelineEntry {
	config: AnimateProgressConfig;
	startOffset: number; // ms delay before starting
}

/**
 * Creates a timeline for sequencing or overlapping animations.
 *
 * Animations are **lazy**: they won't start until `.play()` is called.
 * This lets you build the full sequence declaratively, then start it.
 *
 * @example
 * ```ts
 * const tl = createTimeline()
 *
 * // Parallel (default)
 * tl.add({ duration: 500, onFrame: render1 })
 * tl.add({ duration: 500, onFrame: render2 })  // starts same time
 *
 * // Sequential
 * tl.add({ duration: 500, onFrame: render1 })
 * tl.add({ duration: 500, onFrame: render2 }, { after: true })
 *
 * // Overlap — start when previous is 70% done
 * tl.add({ duration: 1000, onFrame: render1 })
 * tl.add({ duration: 500, onFrame: render2 }, { offset: 0.7 })
 *
 * const handle = tl.play()
 * handle.stop()   // stop all
 * handle.then(() => console.log("all done"))
 * ```
 */
export function createTimeline() {
	const entries: TimelineEntry[] = [];
	const doneCallbacks: (() => void)[] = [];

	function add(
		config: AnimateProgressConfig,
		opts?: {
			/**
			 * Start after the previous animation ends.
			 * If false (default), starts in parallel (same time as previous).
			 */
			after?: boolean;
			/**
			 * Offset relative to the previous animation:
			 * - When `after` is false (parallel): fraction of previous duration.
			 *   E.g. 0.5 starts halfway through the previous.
			 * - When `after` is true: additional ms after previous ends.
			 */
			offset?: number;
		},
	) {
		const lastEntry = entries[entries.length - 1];
		const lastDuration = lastEntry?.config.duration ?? 0;
		let startOffset = 0;

		if (opts?.after) {
			startOffset = lastEntry
				? lastEntry.startOffset + lastDuration + (opts.offset ?? 0)
				: 0;
		} else {
			startOffset = lastEntry?.startOffset ?? 0;
			if (opts?.offset !== undefined && lastEntry) {
				startOffset += opts.offset * lastDuration;
			}
		}

		entries.push({ config, startOffset });
	}

	function play(): { stop: () => void; then: (cb: () => void) => void } {
		const handles: AnimateProgressHandle[] = [];
		const timers: ReturnType<typeof setTimeout>[] = [];
		const totalDuration = Math.max(
			...entries.map((e) => e.startOffset + (e.config.duration ?? 1000)),
		);

		for (const entry of entries) {
			const startDelay = entry.startOffset;

			if (startDelay <= 0) {
				handles.push(animateProgress(entry.config));
			} else {
				const timer = setTimeout(() => {
					handles.push(animateProgress(entry.config));
				}, startDelay);
				timers.push(timer);
			}
		}

		const totalTimer = setTimeout(() => {
			for (const cb of doneCallbacks) cb();
		}, totalDuration + 50); // small buffer for scheduling

		return {
			stop() {
				for (const t of timers) clearTimeout(t);
				clearTimeout(totalTimer);
				for (const h of handles) h.stop();
			},
			then(cb: () => void) {
				doneCallbacks.push(cb);
			},
		};
	}

	return { add, play };
}
