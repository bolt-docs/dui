import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { badge, configure, refreshAccessibility, resetConfig, stripAnsi } from "../src/index";

// Make this file hermetic against the screen-reader probe in
// accessibility.ts. `probeScreenReader()` spawns `pgrep -f brltty` on
// Linux and a status-0 + non-empty-stdout match forces plain mode
// (breaking every ANSI assertion below). In parallel vitest runs the
// probe can false-positive on transient processes whose command line
// contains "brltty" (including the shell that spawned the probe — a
// classic `pgrep -f` self-match). Stubbing spawnSync to always report
// "no match" keeps badge tests deterministic regardless of the host.
vi.mock("node:child_process", () => ({
	spawnSync: () => ({
		status: 1,
		stdout: "",
		stderr: "",
	}),
}));

beforeAll(() => {
	// Force-clean env before any test in this file runs. Vitest reuses
	// worker processes across test files, so env mutations from
	// accessibility.test.ts (TERM=dumb, NO_COLOR=1) can persist.
	process.env.NO_COLOR = "";
	process.env.TERM = "xterm-256color";
	process.env.PREFERS_REDUCED_MOTION = "";
	refreshAccessibility();
});

describe("badge", () => {
	afterEach(() => {
		resetConfig();
	});

	it("renders each status with the default compound fg/bg pair", () => {
		expect(badge({ label: "ok", status: "success" })).toContain("ok");
		expect(badge({ label: "info", status: "info" })).toContain("info");
		expect(badge({ label: "warn", status: "warning" })).toContain("warn");
		expect(badge({ label: "err", status: "error" })).toContain("err");
		expect(badge({ label: "draft", status: "neutral" })).toContain("draft");
	});

	it("uses neutral as the default status", () => {
		const out = badge({ label: "hi" });
		expect(out).toContain("hi");
	});

	it("applies bg color when status = success (green bg)", () => {
		const out = badge({ label: "OK", status: "success" });
		// ANSI bg-escape opens with \x1b[42m (green bg) somewhere in the output.
		expect(out).toContain("\u001b[37;42m");
	});

	it("applies fg color override via opts.colors.text", () => {
		const out = badge({ label: "X", colors: { text: "#ff0000" } });
		expect(out).toContain("\u001b[38;2;255;0;0;100m");
	});

	it("applies bg override via opts.colors.bg", () => {
		const out = badge({ label: "X", colors: { bg: "#0000ff" } });
		expect(out).toContain("\u001b[37;48;2;0;0;255m");
	});

	it("honors global theme override via configure({ theme: { badge: ... } })", () => {
		configure({
			theme: {
				badge: {
					error: { fg: "black", bg: "#ff00ff" },
				},
			},
		});
		const out = badge({ label: "BOOM", status: "error" });
		expect(out).toContain("\u001b[30;48;2;255;0;255m"); // black fg + magenta bg compound
	});

	it("normalizes case-insensitive statuses (SUCCESS → success)", () => {
		// @ts-expect-error JS consumers can pass loose strings
		const out = badge({ label: "OK", status: "SUCCESS" });
		expect(out).toContain("\u001b[37;42m"); // same SGR as success
	});

	it("falls back to neutral for unknown statuses instead of crashing", () => {
		// @ts-expect-error JS consumers can pass loose strings
		const out = badge({ label: "X", status: "mystery" });
		expect(out).toContain("\u001b[37;100m"); // neutral = white on gray
	});

	it("strips ANSI escape sequences from the label", () => {
		const out = badge({ label: "\u001b[31mOK\u001b[0m", status: "success" });
		expect(out).toContain("OK");
		expect(out).not.toContain("\u001b[31m");
	});

	it("strips OSC window-title escapes from the label", () => {
		const out = badge({ label: "\u001b]0;evil title\u0007OK" });
		expect(out).toContain("OK");
		expect(out).not.toContain("\u001b]");
	});

	it("collapses newlines so the chip stays single-line", () => {
		const out = badge({ label: "line1\nline2" });
		expect(out).toContain("line1 line2");
		expect(out).not.toContain("\n");
	});

	it("returns an empty string for blank labels", () => {
		expect(badge({ label: "" })).toBe("");
		expect(badge({ label: "   " })).toBe("");
	});

	it("truncates long labels with an ellipsis via maxWidth", () => {
		const out = badge({ label: "deploy-to-production", maxWidth: 8 });
		expect(out).toContain("…");
		expect(stripAnsi(out)).toHaveLength(10); // 8 cells + 2 padding spaces
	});

	it("keeps short labels untouched when maxWidth fits", () => {
		const out = badge({ label: "ok", maxWidth: 8 });
		expect(out).toContain("ok");
		expect(out).not.toContain("…");
	});

	it("degrades gracefully (unstyled + warning) on invalid color strings", () => {
		const warn = vi.spyOn(process, "emitWarning").mockImplementation(() => {});
		try {
			const out = badge({ label: "X", colors: { text: "not-a-color" } });
			expect(out).toBe(" X "); // unstyled fallback
			expect(warn).toHaveBeenCalled();
		} finally {
			warn.mockRestore();
		}
	});

	it("truncates before plain-mode rendering too", () => {
		configure({ plain: true });
		const out = badge({ label: "deploy-to-production", maxWidth: 8 });
		expect(out).toBe("badge: [ deploy-… ]");
	});
});
