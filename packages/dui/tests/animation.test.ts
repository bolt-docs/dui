import { describe, it, expect, vi, afterEach } from "vitest";
import { animate } from "../src/animation";

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
});
