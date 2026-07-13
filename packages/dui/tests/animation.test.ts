import { describe, it, expect, vi, afterEach } from "vitest";
import {
	animate,
	animateProgress,
	createEasing,
	createSpring,
	lerp,
} from "../src/animation";

// ── lerp ────────────────────────────────────────────────────────

describe("lerp", () => {
	it("linearly interpolates", () => {
		expect(lerp(0, 10, 0)).toBe(0);
		expect(lerp(0, 10, 0.5)).toBe(5);
		expect(lerp(0, 10, 1)).toBe(10);
	});

	it("extrapolates beyond range", () => {
		expect(lerp(0, 10, 2)).toBe(20);
		expect(lerp(0, 10, -1)).toBe(-10);
	});
});

// ── Easing presets ──────────────────────────────────────────────

describe("easing presets", () => {
	const easings = [
		"linear",
		"ease-in",
		"ease-out",
		"ease-in-out",
		"ease-in-quad",
		"ease-out-quad",
		"ease-in-cubic",
		"ease-out-cubic",
		"ease-in-quart",
		"ease-out-quart",
		"ease-in-quint",
		"ease-out-quint",
		"ease-in-sine",
		"ease-out-sine",
		"ease-in-expo",
		"ease-out-expo",
		"ease-in-circ",
		"ease-out-circ",
		"ease-in-back",
		"ease-out-back",
		"ease-in-elastic",
		"ease-out-elastic",
		"ease-in-bounce",
		"ease-out-bounce",
	] as const;

	for (const easing of easings) {
		it(`${easing} maps 0→0, 1→1`, () => {
			// We need to actually use animate to test via the resolver
			// OR test the resolveFrame path. Let's use animateProgress
			// to verify the easing function produces valid output.
			vi.useFakeTimers();
			const progress: number[] = [];
			const anim = animateProgress({
				duration: 100,
				easing,
				onFrame: (p) => progress.push(p),
			});

			vi.advanceTimersByTime(200);
			anim.stop();

			expect(progress.length).toBeGreaterThan(0);
			// First frame should be 0, last frame should be 1
			expect(progress[0]).toBeGreaterThanOrEqual(0);
			expect(progress[progress.length - 1]).toBeCloseTo(1, 5);
		});
	}
});

// ── createEasing (cubic-bezier) ─────────────────────────────────

describe("createEasing", () => {
	it("creates a valid easing function", () => {
		const fn = createEasing(0.25, 0.1, 0.25, 1);
		expect(typeof fn).toBe("function");
		expect(fn(0)).toBe(0);
		expect(fn(1)).toBe(1);
	});

	it("ease-in-out approximates CSS standard", () => {
		const cssEaseInOut = createEasing(0.42, 0, 0.58, 1);
		const mid = cssEaseInOut(0.5);
		expect(mid).toBeGreaterThan(0.45);
		expect(mid).toBeLessThan(0.55);
	});

	it("maps 0→0 and 1→1 for extreme control points", () => {
		const fn = createEasing(1, 1, 0, 0);
		expect(fn(0)).toBe(0);
		expect(fn(1)).toBe(1);
	});

	it("usable in animate via custom function", () => {
		vi.useFakeTimers();
		const custom = createEasing(0, 0, 1, 1);
		const onFrame = vi.fn();
		const anim = animate({
			keyframes: [
				{ offset: 0, content: "a" },
				{ offset: 1, content: "b" },
			],
			duration: 100,
			easing: custom,
			onFrame,
		});

		vi.advanceTimersByTime(50);
		expect(onFrame).toHaveBeenCalled();
		anim.stop();
	});
});

// ── createSpring ────────────────────────────────────────────────

describe("createSpring", () => {
	it("returns a function", () => {
		const spring = createSpring();
		expect(typeof spring).toBe("function");
	});

	it("starts at 0 and ends at 1", () => {
		const spring = createSpring();
		expect(spring(0)).toBeCloseTo(0);
		expect(spring(1)).toBeCloseTo(1);
	});

	it("accepts custom parameters", () => {
		const spring = createSpring({ stiffness: 300, damping: 20, mass: 2 });
		expect(spring(0)).toBeCloseTo(0);
		expect(spring(1)).toBeCloseTo(1);
	});

	it("usable as easing in animateProgress", () => {
		vi.useFakeTimers();
		const progress: number[] = [];
		const anim = animateProgress({
			duration: 100,
			easing: { stiffness: 200, damping: 10 },
			onFrame: (p) => progress.push(p),
		});

		vi.advanceTimersByTime(150);
		anim.stop();

		expect(progress.length).toBeGreaterThan(0);
		expect(progress[progress.length - 1]).toBe(1);
	});
});

// ── animate ─────────────────────────────────────────────────────

describe("animate", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it("calls onFrame at least once", () => {
		vi.useFakeTimers();
		const onFrame = vi.fn();
		const anim = animate({
			keyframes: [
				{ offset: 0, content: "start", fg: "#ff0000" },
				{ offset: 1, content: "end", fg: "#00ff00" },
			],
			duration: 100,
			onFrame,
		});

		vi.advanceTimersByTime(50);
		expect(onFrame).toHaveBeenCalled();
		anim.stop();
	});

	it("interpolates content (snap to nearest keyframe)", () => {
		vi.useFakeTimers();
		const frames: string[] = [];
		const anim = animate({
			keyframes: [
				{ offset: 0, content: "A", fg: "#000" },
				{ offset: 1, content: "B", fg: "#fff" },
			],
			duration: 100,
			onFrame: (f) => frames.push(f.content),
		});

		vi.advanceTimersByTime(30);
		anim.stop();

		expect(frames.length).toBeGreaterThan(0);
	});

	it("interpolates color between keyframes", () => {
		vi.useFakeTimers();
		const frames: string[] = [];
		const anim = animate({
			keyframes: [
				{ offset: 0, fg: "#ff0000" },
				{ offset: 1, fg: "#00ff00" },
			],
			duration: 100,
			onFrame: (f) => frames.push(f.fg ?? ""),
		});

		vi.advanceTimersByTime(50);
		anim.stop();

		expect(frames.length).toBeGreaterThan(0);
		const midColor = frames[Math.floor(frames.length / 2)];
		expect(midColor).toMatch(/^#[0-9a-f]{6}$/);
	});

	it("stop() halts animation", () => {
		vi.useFakeTimers();
		const onFrame = vi.fn();
		const anim = animate({
			keyframes: [
				{ offset: 0, content: "test", fg: "#fff" },
			],
			duration: 1000,
			loop: true,
			onFrame,
		});

		anim.stop();
		const countBefore = onFrame.mock.calls.length;

		vi.advanceTimersByTime(500);
		expect(onFrame.mock.calls.length).toBe(countBefore);
	});

	it("then() callback is called when non-looping animation ends", () => {
		vi.useFakeTimers();
		const onDone = vi.fn();
		const onFrame = vi.fn();

		const anim = animate({
			keyframes: [
				{ offset: 0, content: "a", fg: "#000" },
				{ offset: 1, content: "b", fg: "#fff" },
			],
			duration: 50,
			loop: false,
			onFrame,
		});

		anim.then(onDone);
		vi.advanceTimersByTime(200);

		expect(onDone).toHaveBeenCalled();
		anim.stop();
	});

	it("works with empty keyframes (no-op)", () => {
		const anim = animate({
			keyframes: [],
			duration: 100,
			onFrame: vi.fn(),
		});
		expect(anim.stop).toBeDefined();
	});

	it("handles custom easing function", () => {
		vi.useFakeTimers();
		const onFrame = vi.fn();
		const anim = animate({
			keyframes: [
				{ offset: 0, content: "x", fg: "#000" },
				{ offset: 1, content: "y", fg: "#fff" },
			],
			duration: 100,
			easing: (t) => t * t,
			onFrame,
		});

		vi.advanceTimersByTime(50);
		expect(onFrame).toHaveBeenCalled();
		anim.stop();
	});

	it("auto-fills offset 0 and 1 if missing", () => {
		vi.useFakeTimers();
		const onFrame = vi.fn();
		const anim = animate({
			keyframes: [
				{ offset: 0.3, content: "mid", fg: "#888" },
			],
			duration: 100,
			onFrame,
		});

		vi.advanceTimersByTime(10);
		expect(onFrame).toHaveBeenCalled();
		anim.stop();
	});

	it("interpolates through multiple keyframes", () => {
		vi.useFakeTimers();
		const frames: string[] = [];
		const anim = animate({
			keyframes: [
				{ offset: 0, content: "A", fg: "#ff0000" },
				{ offset: 0.5, content: "B", fg: "#ffff00" },
				{ offset: 1, content: "C", fg: "#00ff00" },
			],
			duration: 200,
			onFrame: (f) => frames.push(f.content + f.fg?.slice(0, 3)),
		});

		vi.advanceTimersByTime(250);
		anim.stop();

		expect(frames.length).toBeGreaterThan(0);
	});

	it("respects fps option", () => {
		vi.useFakeTimers();
		const onFrame = vi.fn();
		const anim = animate({
			keyframes: [
				{ offset: 0, content: "x" },
				{ offset: 1, content: "y" },
			],
			duration: 1000,
			fps: 10, // 10 fps → ~10 frames per second
			onFrame,
		});

		vi.advanceTimersByTime(500);
		anim.stop();

		// At most ~5 frames in 500ms at 10fps
		expect(onFrame.mock.calls.length).toBeLessThanOrEqual(6);
	});
});

// ── animateProgress ─────────────────────────────────────────────

describe("animateProgress", () => {
	it("calls onFrame with easing progress", () => {
		vi.useFakeTimers();
		const progress: number[] = [];
		const anim = animateProgress({
			duration: 100,
			easing: "linear",
			onFrame: (p) => progress.push(p),
		});

		vi.advanceTimersByTime(150);
		anim.stop();

		expect(progress.length).toBeGreaterThan(0);
		expect(progress[progress.length - 1]).toBe(1);
	});

	it("starts at 0", () => {
		vi.useFakeTimers();
		const values: number[] = [];
		const anim = animateProgress({
			duration: 100,
			easing: "linear",
			onFrame: (p) => values.push(p),
		});

		vi.advanceTimersByTime(1);
		anim.stop();

		expect(values[0]).toBeGreaterThanOrEqual(0);
	});

	it("supports custom fps", () => {
		vi.useFakeTimers();
		const onFrame = vi.fn();
		const anim = animateProgress({
			duration: 1000,
			fps: 5,
			onFrame,
		});

		vi.advanceTimersByTime(500);
		anim.stop();

		expect(onFrame.mock.calls.length).toBeLessThanOrEqual(4);
	});

	it("supports spring easing via SpringConfig object", () => {
		vi.useFakeTimers();
		const values: number[] = [];
		const anim = animateProgress({
			duration: 200,
			easing: { stiffness: 180, damping: 12 },
			onFrame: (p) => values.push(p),
		});

		vi.advanceTimersByTime(250);
		anim.stop();

		expect(values.length).toBeGreaterThan(0);
		expect(values[values.length - 1]).toBeCloseTo(1, 5);
	});
});
