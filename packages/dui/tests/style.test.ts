import { beforeEach, describe, expect, it } from "vitest";
import {
	applyClass,
	builtinClasses,
	defineClass,
	getClass,
	removeClass,
	resetClasses,
} from "../src/index";

describe("style", () => {
	beforeEach(() => {
		resetClasses();
	});

	describe("builtin classes", () => {
		it("registers default classes on init", () => {
			expect(builtinClasses).toContain("hover");
			expect(builtinClasses).toContain("active");
			expect(builtinClasses).toContain("selected");
			expect(builtinClasses).toContain("disabled");
			expect(builtinClasses).toContain("pointer");
		});

		it("hover class applies background color", () => {
			const result = applyClass("hover", "hello");
			expect(result).toContain("\x1b[48");
			expect(result).toContain("hello");
		});

		it("active class applies green foreground and bold", () => {
			const result = applyClass("active", "hello");
			expect(result).toContain("\x1b[38");
			expect(result).toContain("\x1b[1m");
			expect(result).toContain("hello");
		});

		it("selected class applies green foreground", () => {
			const result = applyClass("selected", "hello");
			expect(result).toContain("\x1b[38");
			expect(result).toContain("hello");
		});

		it("disabled class applies dim", () => {
			const result = applyClass("disabled", "hello");
			expect(result).toContain("\x1b[2m");
			expect(result).toContain("hello");
		});

		it("pointer class applies green foreground", () => {
			const result = applyClass("pointer", ">");
			expect(result).toContain("\x1b[38");
		});
	});

	describe("defineClass / getClass", () => {
		it("defines and retrieves a custom class", () => {
			defineClass("my-class", { fg: "#ff0000", bold: true });
			const style = getClass("my-class");
			expect(style).toBeDefined();
			expect(style!.fg).toBe("#ff0000");
			expect(style!.bold).toBe(true);
		});

		it("overrides an existing class", () => {
			defineClass("hover", { fg: "#00ff00" });
			const style = getClass("hover");
			expect(style!.fg).toBe("#00ff00");
			expect(style!.bg).toBeUndefined();
		});

		it("returns undefined for unknown class", () => {
			expect(getClass("nonexistent")).toBeUndefined();
		});
	});

	describe("removeClass", () => {
		it("removes a class from the registry", () => {
			removeClass("hover");
			const result = applyClass("hover", "hello");
			expect(result).toBe("hello");
		});
	});

	describe("resetClasses", () => {
		it("restores default classes after custom definitions", () => {
			defineClass("custom", { fg: "#ff0000" });
			removeClass("hover");
			resetClasses();
			expect(getClass("custom")).toBeUndefined();
			expect(getClass("hover")).toBeDefined();
			expect(builtinClasses).toContain("hover");
		});
	});

	describe("applyClass", () => {
		it("passes through text when class does not exist", () => {
			expect(applyClass("unknown", "hello")).toBe("hello");
		});

		it("applies multiple style properties", () => {
			defineClass("fancy", {
				fg: "#ff0000",
				bg: "#0000ff",
				bold: true,
				italic: true,
				underline: true,
			});
			const result = applyClass("fancy", "text");
			expect(result).toContain("\x1b[38"); // fg
			expect(result).toContain("\x1b[48"); // bg
			expect(result).toContain("\x1b[1m"); // bold
			expect(result).toContain("\x1b[3m"); // italic
			expect(result).toContain("\x1b[4m"); // underline
			expect(result).toContain("text");
		});

		it("dim and bold both reset with \\x1b[22m", () => {
			const result = applyClass("disabled", "x");
			expect(result).toContain("\x1b[2m");
			expect(result).toContain("\x1b[22m");
		});
	});
});
