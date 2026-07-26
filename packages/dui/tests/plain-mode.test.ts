import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	badge,
	box,
	configure,
	divider,
	getConfig,
	resetConfig,
	section,
} from "../src/index";

describe("plain-mode widget rendering", () => {
	beforeEach(() => {
		resetConfig();
	});

	afterEach(() => {
		resetConfig();
	});

	describe("box", () => {
		it("emits multi-line `box:` prefix text in plain mode", () => {
			configure({ plain: true });
			const out = box(["alpha", "beta"], { title: "Tests" });
			expect(out).toContain("box: Tests");
			expect(out).toContain("  alpha");
			expect(out).toContain("  beta");
			// No SGR sequences inside the body.
			expect(out).not.toMatch(/\x1b\[/);
			// No box-drawing chars.
			expect(out).not.toContain("╔");
		});

		it("renders the actions block as `[id] label` lines", () => {
			configure({ plain: true });
			const out = box(["failed: 3 errors"], {
				title: "CI",
				actions: [
					{ id: "open-logs", label: "Open logs" },
					{ id: "rerun", label: "Re-run CI" },
				],
			} as never);
			expect(out).toContain("actions:");
			expect(out).toContain("[open-logs] Open logs");
			expect(out).toContain("[rerun] Re-run CI");
		});
	});

	describe("badge", () => {
		it("emits `[ label ]` with status prefix", () => {
			configure({ plain: true });
			expect(badge({ label: "FAIL", status: "error" })).toBe(
				"error: [ FAIL ]",
			);
		});

		it("falls back to the literal `badge:` prefix when no status", () => {
			configure({ plain: true });
			expect(badge({ label: "draft" })).toBe("badge: [ draft ]");
		});
	});

	describe("section", () => {
		it("emits `section: -- <title> --`", () => {
			configure({ plain: true });
			expect(section({ title: "Configuration" })).toBe(
				"section: -- Configuration --",
			);
		});

		it("emits a pure dash line when title is empty", () => {
			configure({ plain: true });
			expect(section({ title: "" })).toBe(
				"section: --------------------",
			);
		});
	});

	describe("divider", () => {
		it("emits `divider: -----`", () => {
			configure({ plain: true });
			expect(divider("-", 12)).toBe("divider: ------------");
		});

		it("clamps length to >= 1", () => {
			configure({ plain: true });
			expect(divider("-", 0)).toBe("divider: -");
		});
	});

	describe("isPlainMode integrate getConfig", () => {
		it("returns true globally after configure({ plain: true })", () => {
			configure({ plain: true });
			expect(getConfig().plain).toBe(true);
		});
	});
});
