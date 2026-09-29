import { describe, expect, it } from "vitest";
import { interpolateColor } from "../src/color";
import { gradient, gradientPresets } from "../src/gradient";

describe("gradient", () => {
	it("returns an empty array for count <= 0", () => {
		expect(gradient(0, gradientPresets.sunset)).toEqual([]);
		expect(gradient(-3, gradientPresets.sunset)).toEqual([]);
	});

	it("returns a single color for count === 1", () => {
		expect(gradient(1, gradientPresets.sunset)).toEqual(["#ff6b6b"]);
	});

	it("fills with black when no stops are given", () => {
		expect(gradient(3, [])).toEqual(["#000000", "#000000", "#000000"]);
	});

	it("clamps to the first stop below its position", () => {
		const result = gradient(3, [
			{ pos: 0.5, color: "#abcdef" },
			{ pos: 1, color: "#ffffff" },
		]);
		// t = 0 → clamp to first stop; t = 0.5 → first stop; t = 1 → last stop
		expect(result[0]).toBe("#abcdef");
		expect(result[1]).toBe("#abcdef");
		expect(result[2]).toBe("#ffffff");
	});

	it("clamps to the last stop above its position", () => {
		const result = gradient(3, [
			{ pos: 0, color: "#000000" },
			{ pos: 0.5, color: "#888888" },
		]);
		expect(result[0]).toBe("#000000");
		expect(result[1]).toBe("#888888");
		// t = 1 → clamped to the last stop
		expect(result[2]).toBe("#888888");
	});

	it("interpolates both branch colors across a two-stop ramp", () => {
		const a = "#000000";
		const b = "#ffffff";
		const result = gradient(3, [
			{ pos: 0, color: a },
			{ pos: 1, color: b },
		]);
		expect(result).toEqual(["#000000", interpolateColor(a, b, 0.5), "#ffffff"]);
		// Midpoint must be grey for black→white at 0.5
		expect(result[1]).toBe("#808080");
	});

	it("sorts stops by position regardless of input order", () => {
		const result = gradient(2, [
			{ pos: 1, color: "#ffffff" },
			{ pos: 0, color: "#000000" },
		]);
		expect(result).toEqual(["#000000", "#ffffff"]);
	});

	it("produces a smooth monotonic ramp across multiple stops", () => {
		const result = gradient(7, gradientPresets.terminal);
		expect(result).toHaveLength(7);
		expect(result[0]).toBe("#00ff00");
		expect(result[6]).toBe("#99ff99");
	});

	it("evenly spaces colors for a count smaller than stops", () => {
		const result = gradient(2, gradientPresets.rainbow);
		expect(result).toHaveLength(2);
		expect(result[0]).toBe("#ff0000");
		expect(result[1]).toBe("#8800aa");
	});
});

describe("gradientPresets", () => {
	it("exposes the documented presets", () => {
		expect(Object.keys(gradientPresets)).toEqual([
			"sunset",
			"ocean",
			"forest",
			"royal",
			"fire",
			"ice",
			"rainbow",
			"terminal",
		]);
	});

	it("each preset has well-formed stops", () => {
		for (const [name, stops] of Object.entries(gradientPresets)) {
			expect(stops.length, name).toBeGreaterThanOrEqual(2);
			expect(stops[0].pos, name).toBe(0);
			expect(stops[stops.length - 1].pos, name).toBe(1);
			for (const stop of stops) {
				expect(stop.color, name).toMatch(/^#[0-9a-f]{6}$/);
			}
		}
	});
});
