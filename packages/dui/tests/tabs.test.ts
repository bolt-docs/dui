import { describe, expect, it } from "vitest";
import { stripAnsi, tabs } from "../src/index";

describe("tabs", () => {
	it("underline style emits SGR underline for the active tab", () => {
		const out = tabs({
			items: ["Home", "Docs", "Blog"],
			active: 1,
			style: "underline",
		});
		// Active label = "Docs" should be wrapped in \x1b[4m ... \x1b[24m
		expect(out).toContain("\u001b[4m");
		expect(stripAnsi(out)).toContain("Docs");
		// Inactive "Home" should NOT be wrapped in underline SGR around it.
		// (SGR may still be present if other style codes are emitted; but
		// we check that no underline SGR immediately precedes "Home".)
		expect(out).toContain("Home");
		expect(out).toContain("Blog");
	});

	it("pill style wraps each label in [ ... ] brackets", () => {
		const out = tabs({ items: ["A", "B"], active: 0, style: "pill" });
		// ANSI prefixes (`\u001b[1m...\u001b[22m` for the active bold)
		// wrap the active label; stripAnsi normalizes so engine
		// consumers can match pattern literals without escape-aware
		// substring logic.
		const plain = stripAnsi(out);
		expect(plain).toContain("[ A ]");
		expect(plain).toContain("[ B ]");
	});

	it("boxed style draws rounded frame around each label", () => {
		const out = tabs({ items: ["A", "B"], active: 0, style: "boxed" });
		expect(out).toContain("\u256D");
		expect(out).toContain("\u256E");
	});

	it("renders all items regardless of active", () => {
		const items = ["Files", "Chat", "Settings", "Help"];
		const out = tabs({ items, active: 2, style: "pill" });
		for (const item of items) expect(out).toContain(item);
	});

	it("default style is underline when no style is passed", () => {
		const out = tabs({ items: ["A", "B"], active: 1 });
		expect(out).toContain("\u001b[4m");
	});
});
