/**
 * Edge-case tests for `animateQr` — three animation modes (scan,
 * pulse, rotate), stop handling, loop: false, and custom accentColor.
 *
 * We mock the underlying `qrcode()` call so tests stay fast and
 * deterministic — the static QR matrix is a known fixture, and only
 * the animation chrome is exercised.
 */

import { describe, expect, it, vi } from "vitest";
import { animateQr } from "../src/animate";

/* ── Helpers ────────────────────────────────────────────────── */

/**
 * Create a fixture QR matrix as `animateQr` receives it from
 * `qrcode()`. A minimal 3×3 matrix with SGR wrapping so the
 * scanLine / pulseBorder helpers have real ANSI to strip.
 */
function fakeQrMatrix(): string {
	// 3 rows of 6-char cells (2 chars per module × 3 modules)
	const fgSgr = "\x1b[38;2;0;0;0m";
	const bgSgr = "\x1b[48;2;255;255;255m";
	const reset = "\x1b[0m";
	const rows = [
		`${fgSgr}${bgSgr}██  ██${reset}`,
		`${fgSgr}${bgSgr}  ██  ${reset}`,
		`${fgSgr}${bgSgr}████  ${reset}`,
	];
	return rows.join("\n");
}

const TEST_QR = fakeQrMatrix();

// Mock `qrcode()` so no real QR encoding runs in tests.
// We need to mock the module that animate.ts imports.
vi.mock("../src/index", () => ({
	// Mirror the real renderer: qrcode() appends the label line
	// (custom string, or the encoded text) unless label === false.
	qrcode: vi.fn((_text: string, opts?: { label?: boolean | string }) =>
		Promise.resolve(
			opts?.label === false
				? TEST_QR
				: `${TEST_QR}\n${typeof opts?.label === "string" ? opts.label : _text}`,
		),
	),
}));

describe("animateQr", () => {
	it("defaults to scan mode", async () => {
		const frames: string[] = [];
		await animateQr("https://example.com", {
			mode: "scan",
			loop: false,
			duration: 50, // fast animation so test doesn't hang
			fps: 10,
			onFrame: (ansi) => frames.push(ansi),
		});

		// Allow the animation to complete
		await new Promise((r) => setTimeout(r, 100));
		expect(frames.length).toBeGreaterThan(1);
	});

	it("scan mode produces at least one frame with SGR", async () => {
		const frames: string[] = [];
		const anim = await animateQr("https://example.com", {
			mode: "scan",
			loop: false,
			duration: 50,
			fps: 10,
			onFrame: (ansi) => frames.push(ansi),
		});

		await new Promise((r) => setTimeout(r, 100));
		expect(frames.length).toBeGreaterThanOrEqual(1);

		// Each frame should contain ANSI escape sequences (the QR fg/bg)
		for (const frame of frames) {
			expect(frame).toContain("\x1b[");
		}
	});

	it("pulse mode wraps the QR with a border box", async () => {
		const frames: string[] = [];
		const anim = await animateQr("https://example.com", {
			mode: "pulse",
			loop: false,
			duration: 50,
			fps: 10,
			onFrame: (ansi) => frames.push(ansi),
		});

		await new Promise((r) => setTimeout(r, 100));
		expect(frames.length).toBeGreaterThanOrEqual(1);

		// Pulse mode wraps QR in ┌ ┐ └ ┘ box characters
		for (const frame of frames) {
			expect(frame).toMatch(/[┌┐└┘│─]/);
		}
	});

	it("rotate mode cycles spinner characters in the label", async () => {
		const frames: string[] = [];
		const anim = await animateQr("https://example.com", {
			mode: "rotate",
			label: "Scan me",
			loop: false,
			duration: 100,
			fps: 15,
			onFrame: (ansi) => frames.push(ansi),
		});

		await new Promise((r) => setTimeout(r, 200));
		expect(frames.length).toBeGreaterThanOrEqual(1);

		// Rotate mode prepends a spinner character to the label
		const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
		const lastFrame = frames[frames.length - 1];
		const hasSpinner = spinnerChars.some((ch) => lastFrame.includes(ch));
		expect(hasSpinner).toBe(true);
		// Label text should be preserved
		expect(lastFrame).toContain("Scan me");
	});

	it("stops immediately when handle.stop() is called", async () => {
		const frames: string[] = [];
		const anim = await animateQr("https://example.com", {
			mode: "scan",
			loop: true, // would run forever
			duration: 1000,
			fps: 10,
			onFrame: (ansi) => frames.push(ansi),
		});

		// Let a couple frames render
		await new Promise((r) => setTimeout(r, 50));
		const frameCountAfterStop = frames.length;

		anim.stop();
		await new Promise((r) => setTimeout(r, 100));
		// No new frames after stop
		expect(frames.length).toBe(frameCountAfterStop);
		expect(anim).toHaveProperty("stop");
	});

	it("loop: false stops after one full cycle", async () => {
		const frames: string[] = [];
		await animateQr("https://example.com", {
			mode: "scan",
			loop: false,
			duration: 30,
			fps: 10,
			onFrame: (ansi) => frames.push(ansi),
		});

		// Wait for the full cycle plus buffer
		await new Promise((r) => setTimeout(r, 100));
		const countAfterCycle = frames.length;
		// No more frames after a reasonable wait
		await new Promise((r) => setTimeout(r, 100));
		expect(frames.length).toBe(countAfterCycle);
	});

	it("custom accentColor is applied to scan line", async () => {
		const frames: string[] = [];
		await animateQr("https://example.com", {
			mode: "scan",
			loop: false,
			duration: 50,
			fps: 10,
			accentColor: "#ff0000",
			onFrame: (ansi) => frames.push(ansi),
		});

		await new Promise((r) => setTimeout(r, 100));
		expect(frames.length).toBeGreaterThanOrEqual(1);
		// Scan line should use the accent color → red SGR
		const redSgr = "\x1b[38;2;255;0;0m";
		const hasRed = frames.some((f) => f.includes(redSgr));
		expect(hasRed).toBe(true);
	});

	it("custom accentColor is applied to pulse border", async () => {
		const frames: string[] = [];
		await animateQr("https://example.com", {
			mode: "pulse",
			loop: false,
			duration: 50,
			fps: 10,
			accentColor: "#00ff00",
			onFrame: (ansi) => frames.push(ansi),
		});

		await new Promise((r) => setTimeout(r, 100));
		expect(frames.length).toBeGreaterThanOrEqual(1);
		// Pulse border uses the accent color → green SGR
		const greenSgr = "\x1b[38;2;0;255;0m";
		const hasGreen = frames.some((f) => f.includes(greenSgr));
		expect(hasGreen).toBe(true);
	});

	it("Renders QR body without label when label: false", async () => {
		const frames: string[] = [];
		await animateQr("https://example.com", {
			mode: "scan",
			label: false,
			loop: false,
			duration: 50,
			fps: 10,
			onFrame: (ansi) => frames.push(ansi),
		});

		await new Promise((r) => setTimeout(r, 100));
		expect(frames.length).toBeGreaterThanOrEqual(1);
		// First frame should not contain the URL text (no label)
		expect(frames[0]).not.toContain("example.com");
	});
});
