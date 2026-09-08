/**
 * Bug-hunting round 5 (dui-qrcode):
 *
 * 1. `pulseBorder` draws top/bottom borders 2 cells wider than the QR
 *    body rows — `width + 2` dashes *plus* the `┌`/`┐` corners double-
 *    counts the corner cells, so the box overhangs.
 * 2. `formatLabel` truncates by UTF-16 code units, so CJK labels are
 *    cut at half the intended cell width (40 units ≈ 20 columns).
 */

import { describe, expect, it, vi } from "vitest";
import { animateQr } from "../src/animate";
import { formatLabel, LABEL_MAX_LENGTH } from "../src/utils";

/* ── Bug 1: pulseBorder box geometry ─────────────────────────── */

vi.mock("../src/index", () => ({
	qrcode: vi.fn(() =>
		Promise.resolve(
			[
				"\x1b[38;2;0;0;0m\x1b[48;2;255;255;255m██  ██\x1b[0m",
				"\x1b[38;2;0;0;0m\x1b[48;2;255;255;255m  ██  \x1b[0m",
			].join("\n"),
		),
	),
}));

describe("animateQr pulse border geometry", () => {
	it("renders top/bottom borders exactly as wide as the body rows", async () => {
		const frames: string[] = [];
		await animateQr("https://example.com", {
			mode: "pulse",
			loop: false,
			duration: 50,
			fps: 10,
			label: false,
			onFrame: (ansi) => frames.push(ansi),
		});
		await new Promise((r) => setTimeout(r, 150));

		expect(frames.length).toBeGreaterThanOrEqual(1);
		const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
		const widths = strip(frames[0])
			.split("\n")
			.map((l) => l.length);
		expect(new Set(widths).size).toBe(1);
	});
});

/* ── Bug 2: formatLabel CJK truncation by cells ──────────────── */

describe("formatLabel truncation", () => {
	const base = {
		version: 2,
		errorCorrection: "M",
		label: true as const,
		showVersion: false,
	};

	it("truncates CJK labels by visible cells, not code units", () => {
		const cjk = "日本語".repeat(20); // 60 chars, 120 cells
		const result = formatLabel({ ...base, text: cjk });
		expect(result).not.toBeNull();
		// 40 cells ≈ 20 CJK chars + "..."
		const cells = [...(result ?? "")].reduce(
			(n, ch) => n + (ch.codePointAt(0)! > 0x2e7f ? 2 : 1),
			0,
		);
		expect(cells).toBeLessThanOrEqual(LABEL_MAX_LENGTH);
		expect(result?.endsWith("...")).toBe(true);
	});
});
