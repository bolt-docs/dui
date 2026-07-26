import { describe, expect, it } from "vitest";
import { kbd } from "../src/index";

describe("kbd", () => {
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
});
