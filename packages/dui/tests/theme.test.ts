import { describe, it, expect, beforeAll } from "vitest";
import { resolveColor } from "../src/theme";
import { setColorSupported } from "../src/color";
import type { DuiTheme } from "../src/theme";

beforeAll(() => {
	setColorSupported(true);
});

describe("resolveColor", () => {
	it("returns default function when no theme or override", () => {
		const { apply } = resolveColor("logger.success", undefined);
		const result = apply("OK");
		expect(result).toMatch(/\x1b\[32m/);
		expect(result).toContain("OK");
	});

	it("uses theme color when provided as string", () => {
		const theme: DuiTheme = { logger: { success: "#ff00ff" } };
		const { apply } = resolveColor("logger.success", theme);
		const result = apply("OK");
		expect(result).toMatch(/\x1b\[38;2;255;0;255m/);
	});

	it("uses theme color with fg/bg object", () => {
		const theme: DuiTheme = {
			logger: { error: { fg: "#ffffff", bg: "#ff0000" } },
		};
		const { apply, bg } = resolveColor("logger.error", theme);
		expect(apply("text")).toMatch(/\x1b\[38;2;255;255;255m/);
		expect(bg!("text")).toMatch(/\x1b\[48;2;255;0;0m/);
	});

	it("per-call override takes precedence over theme", () => {
		const theme: DuiTheme = { logger: { success: "#ff00ff" } };
		const { apply } = resolveColor("logger.success", theme, "#00ff00");
		const result = apply("OK");
		expect(result).toMatch(/\x1b\[38;2;0;255;0m/);
	});

	it("unknown slot returns identity function", () => {
		const { apply } = resolveColor("nonexistent.slot", undefined);
		expect(apply("text")).toBe("text");
	});

	it("global theme slots work (success, error etc)", () => {
		const theme: DuiTheme = { success: "#ff6600" };
		const { apply } = resolveColor("logger.success", theme);
		const result = apply("OK");
		expect(result).toMatch(/\x1b\[38;2;255;102;0m/);
	});

	it("falls back to default when theme has undefined value", () => {
		const theme: DuiTheme = { logger: { success: undefined } };
		const { apply } = resolveColor("logger.success", theme);
		const result = apply("OK");
		expect(result).toMatch(/\x1b\[32m/);
	});
});
