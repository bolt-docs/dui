import { beforeAll, describe, expect, it } from "vitest";
import { setColorSupported } from "../src/color";
import type { DuiTheme } from "../src/theme";
import { resolveColor } from "../src/theme";

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

	describe("markdown theme slots", () => {
		it("applies default heading1 color (#ff6e6e)", () => {
			const { apply } = resolveColor("markdown.heading1", undefined);
			const result = apply("H1");
			expect(result).toMatch(/\x1b\[38;2;255;110;110m/);
		});

		it("applies default heading6 color (#b48cff)", () => {
			const { apply } = resolveColor("markdown.heading6", undefined);
			const result = apply("H6");
			expect(result).toMatch(/\x1b\[38;2;180;140;255m/);
		});

		it("applies default codeInline color (#96c8ff)", () => {
			const { apply } = resolveColor("markdown.codeInline", undefined);
			const result = apply("chip");
			expect(result).toMatch(/\x1b\[38;2;150;200;255m/);
		});

		it("applies default quoteBar color (#64788c)", () => {
			const { apply } = resolveColor("markdown.quoteBar", undefined);
			const result = apply("│");
			expect(result).toMatch(/\x1b\[38;2;100;120;140m/);
		});

		it("applies default listCheck color (#50c878)", () => {
			const { apply } = resolveColor("markdown.listCheck", undefined);
			const result = apply("✔");
			expect(result).toMatch(/\x1b\[38;2;80;200;120m/);
		});

		it("respects theme override for markdown slots", () => {
			const theme: DuiTheme = { markdown: { heading2: "#abcdef" } };
			const { apply } = resolveColor("markdown.heading2", theme);
			const result = apply("H2");
			expect(result).toMatch(/\x1b\[38;2;171;205;239m/);
		});

		it("supports fg/bg ColorStyle for inline code slot", () => {
			const theme: DuiTheme = {
				markdown: { codeInline: { fg: "#ffffff", bg: "#000000" } },
			};
			const { apply, bg } = resolveColor("markdown.codeInline", theme);
			expect(apply("x")).toMatch(/\x1b\[38;2;255;255;255m/);
			expect(bg!("x")).toMatch(/\x1b\[48;2;0;0;0m/);
		});
	});
});
