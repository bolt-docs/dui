import { describe, expect, it, vi } from "vitest";
import { banner, bannerLines } from "../src/index";

function strip(s: string): string {
	return s.replace(
		/[\u001b\u009b](?:\[[0-9;:<=>?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\-_])/g,
		"",
	);
}

describe("banner", () => {
	it("renders 5 rows for a single glyph", () => {
		const out = banner("A", { fill: "#", double: false });
		expect(out.split("\n")).toHaveLength(5);
	});

	it("renders the correct block shape", () => {
		const out = strip(banner("I", { fill: "#", double: false, gap: "" }));
		// 5x5 "I" glyph: filled top/bottom rows, single center column.
		expect(out.split("\n")[0]).toBe("#####");
		expect(out.split("\n")[1]).toBe("  #  ");
		expect(out.split("\n")[4]).toBe("#####");
	});

	it("doubles each cell by default", () => {
		const out = strip(banner("I", { fill: "#", gap: "" }));
		expect(out.split("\n")[0]).toBe("##########");
		expect(out.split("\n")[1]).toBe("    ##    ");
	});

	it("joins glyphs with the configured gap", () => {
		const out = strip(banner("HI", { fill: "#", double: false, gap: " " }));
		// H row 0 is `#   #`, I row 0 is `#####`, joined by the gap.
		expect(out.split("\n")[0]).toBe("#   # #####");
	});

	it("falls back to a space for unknown glyphs", () => {
		const out = strip(banner("~", { fill: "#", double: false, gap: "" }));
		expect(out.split("\n")[0]).toBe("     ");
	});

	it("applies color when not in plain mode", () => {
		vi.stubEnv("NO_COLOR", "");
		vi.stubEnv("TERM", "xterm-256color");
		vi.stubEnv("PREFERS_REDUCED_MOTION", "");
		const out = banner("A", { fill: "#", color: "red" });
		expect(out).toContain("\u001b[");
		vi.unstubAllEnvs();
	});

	it("bannerLines returns the rows separately", () => {
		const rows = bannerLines("A", { fill: "#", double: false });
		expect(rows).toHaveLength(5);
	});
});
