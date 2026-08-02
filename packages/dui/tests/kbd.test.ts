import { afterEach, describe, expect, it, vi } from "vitest";
import { kbd, refreshAccessibility, resetConfig, stripAnsi } from "../src/index";

// Env vars are read LIVE from process.env by the accessibility
// heuristic. Ensure a clean slate at module load time.
process.env.NO_COLOR = "";
process.env.TERM = "xterm-256color";
process.env.PREFERS_REDUCED_MOTION = "";
refreshAccessibility();

describe("kbd", () => {
	afterEach(() => {
		resetConfig();
	});

	it("mac maps Cmd → ⌘ glyph", () => {
		const out = kbd({ keys: ["Cmd", "K"], platform: "mac" });
		expect(out).toContain("\u2318"); // ⌘
	});

	it("win maps Cmd → Ctrl text", () => {
		const out = kbd({ keys: ["Cmd", "K"], platform: "win" });
		expect(out).toContain("Ctrl");
		expect(out).not.toContain("\u2318");
	});

	it("linux maps Cmd → Ctrl and rounds-trips for Esc", () => {
		const out = kbd({ keys: ["Cmd", "K", "Esc"], platform: "linux" });
		expect(out).toContain("Ctrl");
		expect(out).toContain("Esc");
		expect(out).not.toContain("\u2318");
	});

	it("honors custom separator", () => {
		const out = kbd({
			keys: ["Cmd", "K"],
			platform: "mac",
			separator: " + ",
		});
		expect(out).toContain(" + ");
	});

	it("renders single-key shorthand", () => {
		const out = kbd({ keys: "Esc", platform: "mac" });
		expect(out).toContain("\u238B"); // ⎋
	});

	it("falls through unknown tokens verbatim", () => {
		const out = kbd({ keys: ["F12"], platform: "mac" });
		expect(out).toContain("F12");
	});

	it("strips ANSI escapes from key tokens", () => {
		const out = kbd({ keys: ["\u001b[31mCmd\u001b[0m", "K"], platform: "mac" });
		expect(out).toContain("\u2318"); // ⌘ (mapped after strip)
		expect(out).not.toContain("\u001b[31m");
	});

	it("strips OSC window-title escapes from key tokens", () => {
		const out = kbd({ keys: ["\u001b]0;evil\u0007Esc"], platform: "mac" });
		expect(out).toContain("\u238B"); // ⎋ (mapped after strip)
		expect(out).not.toContain("\u001b]");
	});

	it("collapses newlines in key tokens", () => {
		const out = kbd({ keys: ["Ctrl\nShift"], platform: "win" });
		expect(out).not.toContain("\n");
		expect(out).toContain("Ctrl Shift");
	});

	it("drops blank tokens so they leave no separator gaps", () => {
		const out = kbd({ keys: ["Cmd", "", "K"], platform: "mac" });
		expect(out).toContain("\u2318"); // ⌘
		expect(stripAnsi(out)).not.toContain("  "); // no double space
	});

	it("falls back to auto-detection for unknown platforms instead of crashing", () => {
		// @ts-expect-error JS consumers can pass loose platform strings
		const out = kbd({ keys: ["Cmd", "K"], platform: "android" });
		// linux host default → "Ctrl", mac host → "⌘"; either way it
		// must render without throwing.
		expect(stripAnsi(out).length).toBeGreaterThan(0);
	});

	it("truncates long hints with an ellipsis via maxWidth", () => {
		const out = kbd({
			keys: ["Ctrl", "Shift", "P"],
			platform: "win",
			maxWidth: 8,
		});
		expect(out).toContain("…");
		expect(stripAnsi(out)).toHaveLength(8);
	});

	it("keeps short hints untouched when maxWidth fits", () => {
		const out = kbd({ keys: ["Esc"], platform: "mac", maxWidth: 8 });
		expect(out).toContain("\u238B"); // ⎋
		expect(out).not.toContain("…");
	});

	it("returns an empty string when all keys are blank", () => {
		expect(kbd({ keys: ["", "  "], platform: "mac" })).toBe("");
	});

	it("degrades gracefully (unstyled + warning) on invalid color strings", () => {
		const warn = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
		try {
			const out = kbd({
				keys: ["Esc"],
				platform: "mac",
				colors: { text: "not-a-color" },
			});
			expect(stripAnsi(out)).toBe("\u238B"); // ⎋ unstyled fallback
			expect(warn).toHaveBeenCalled();
		} finally {
			warn.mockRestore();
		}
	});
});
