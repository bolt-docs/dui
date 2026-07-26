import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { badge, configure, refreshAccessibility, resetConfig } from "../src/index";

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
});
