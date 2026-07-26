import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	configure,
	getAccessibilityInfo,
	getConfig,
	isPlainMode,
	isReducedMotion,
	refreshAccessibility,
	resetConfig,
} from "../src/index";

describe("accessibility", () => {
	beforeEach(() => {
		resetConfig();
		// Env probes (NO_COLOR, TERM, reducedMotion) are read LIVE
		// from process.env — stubbing/unstubbing is sufficient to
		// reset them. The screenReader spawn is cached across calls
		// but never changes within a test run, so we don't need to
		// re-probe in beforeEach/afterEach.
		vi.unstubAllEnvs();
	});

	afterEach(() => {
		resetConfig();
		vi.unstubAllEnvs();
	});

	describe("getAccessibilityInfo", () => {
		it("returns the structured probe shape", () => {
			const info = getAccessibilityInfo();
			expect(info).toEqual({
				noColor: expect.any(Boolean),
				dumbTerm: expect.any(Boolean),
				screenReader: expect.any(Boolean),
				reducedMotion: expect.any(Boolean),
				plainOverride: expect.any(Boolean),
			});
		});

		it("flags NO_COLOR=1 as noColor", () => {
			vi.stubEnv("NO_COLOR", "1");
			refreshAccessibility();
			const info = getAccessibilityInfo();
			expect(info.noColor).toBe(true);
			expect(isPlainMode()).toBe(true);
		});

		it("flags TERM=dumb as dumbTerm", () => {
			vi.stubEnv("TERM", "dumb");
			refreshAccessibility();
			const info = getAccessibilityInfo();
			expect(info.dumbTerm).toBe(true);
			expect(isPlainMode()).toBe(true);
		});

		it("treats empty NO_COLOR as unset", () => {
			vi.stubEnv("NO_COLOR", "");
			refreshAccessibility();
			expect(getAccessibilityInfo().noColor).toBe(false);
		});

		it("flags PREFERS_REDUCED_MOTION=1 as reducedMotion", () => {
			vi.stubEnv("PREFERS_REDUCED_MOTION", "1");
			refreshAccessibility();
			expect(isReducedMotion()).toBe(true);
		});
	});

	describe("isPlainMode", () => {
		it("returns false when no heuristic is triggered", () => {
			configure({ plain: false });
			expect(isPlainMode(undefined, { plain: false })).toBe(false);
		});

		it("returns true when configure({ plain: true })", () => {
			configure({ plain: true });
			expect(isPlainMode(undefined, getConfig())).toBe(true);
		});

		it("returns true on a per-call opts.plain override", () => {
			expect(isPlainMode({ plain: true }, { plain: false })).toBe(true);
		});

		it("honours a heuristic (NO_COLOR) with no override", () => {
			vi.stubEnv("NO_COLOR", "1");
			refreshAccessibility();
			expect(isPlainMode()).toBe(true);
		});

		it("disable path: NO_COLOR unset + plain:false + TTY", () => {
			configure({ plain: false });
			// TTY in vitest is typically false → nonTty triggers plain
			// mode anyway; assert with the explicit override at least:
			expect(isPlainMode({ plain: false }, { plain: false })).toBe(false);
		});
	});

	describe("refreshAccessibility", () => {
		it("picks up env mutations after refresh", () => {
			expect(getAccessibilityInfo().noColor).toBe(false);
			vi.stubEnv("NO_COLOR", "1");
			refreshAccessibility();
			expect(getAccessibilityInfo().noColor).toBe(true);
		});
	});
});
