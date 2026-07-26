/**
 * Gradient presets and utility for generating colour ramps.
 *
 * Each preset defines a list of `GradientStop` values (position + colour)
 * that can be interpolated by `gradient(count, preset)` to produce a
 * palette of N evenly-spaced hex colours.  Combined with the existing
 * `interpolateColor` function, this powers animated colour transitions,
 * bar-chart fills, sparkline gradients, and progress-bar colour ramps.
 *
 * @example
 * ```ts
 * const sunsetPalette = gradient(6, gradientPresets.sunset)
 * // → [\"#ff6b6b\", \"#ffa94d\", \"#ffd43b\", \"#69db7c\", \"#4dabf7\", \"#9775fa\"]
 *
 * // Use with animate() for a colour sweep
 * import { animate } from \"@bdocs/dui\"
 * animate({
 *   keyframes: gradientPresets.ocean.map((c, i) => ({
 *     offset: i / (gradientPresets.ocean.length - 1),
 *     fg: c.color,
 *   })),
 *   duration: 2000,
 *   easing: \"ease-in-out\",
 *   onFrame: (f) => renderWithColor(f.fg!),
 * })
 * ```
 */
import { interpolateColor } from "./color";

export interface GradientStop {
	/** Position between 0 and 1. */
	pos: number;
	/** Hex colour string (e.g. \"#ff6b6b\"). */
	color: string;
}

/**
 * Generate an array of `count` evenly-spaced hex colours by interpolating
 * through the given gradient stops.  Useful for bar-chart palettes, sparkline
 * fills, and any widget that needs a smooth colour ramp.
 */
export function gradient(
	count: number,
	stops: GradientStop[],
): string[] {
	if (count <= 0) return [];
	if (count === 1) return [stops[0]?.color ?? "#000000"];
	if (stops.length === 0) return Array(count).fill("#000000");

	const sorted = [...stops].sort((a, b) => a.pos - b.pos);
	const result: string[] = [];

	for (let i = 0; i < count; i++) {
		const t = count > 1 ? i / (count - 1) : 1;

		// Clamp to ends
		if (t <= sorted[0].pos) {
			result.push(sorted[0].color);
			continue;
		}
		if (t >= sorted[sorted.length - 1].pos) {
			result.push(sorted[sorted.length - 1].color);
			continue;
		}

		// Find the two stops we're between
		for (let j = 0; j < sorted.length - 1; j++) {
			const a = sorted[j];
			const b = sorted[j + 1];
			if (t >= a.pos && t <= b.pos) {
				const localT =
					b.pos === a.pos ? 0 : (t - a.pos) / (b.pos - a.pos);
				result.push(interpolateColor(a.color, b.color, localT));
				break;
			}
		}
	}

	return result;
}

/**
 * Curated gradient presets — each is an array of `GradientStop` compatible
 * with the `gradient()` helper and with `animate()` keyframes.
 */
export const gradientPresets = {
	/** Warm sunset: red → orange → yellow. */
	sunset: [
		{ pos: 0, color: "#ff6b6b" },
		{ pos: 0.5, color: "#ffa94d" },
		{ pos: 1, color: "#ffd43b" },
	] as GradientStop[],

	/** Cool ocean: teal → cyan → blue. */
	ocean: [
		{ pos: 0, color: "#63e6be" },
		{ pos: 0.5, color: "#3bc9db" },
		{ pos: 1, color: "#4dabf7" },
	] as GradientStop[],

	/** Forest: green → lime → yellow-green. */
	forest: [
		{ pos: 0, color: "#2f9e44" },
		{ pos: 0.5, color: "#69db7c" },
		{ pos: 1, color: "#c0eb75" },
	] as GradientStop[],

	/** Royal: purple → magenta → pink. */
	royal: [
		{ pos: 0, color: "#6741d9" },
		{ pos: 0.5, color: "#cc5de8" },
		{ pos: 1, color: "#f06595" },
	] as GradientStop[],

	/** Fire: dark-red → red → orange. */
	fire: [
		{ pos: 0, color: "#c92a2a" },
		{ pos: 0.4, color: "#e03131" },
		{ pos: 0.7, color: "#f76707" },
		{ pos: 1, color: "#ff922b" },
	] as GradientStop[],

	/** Ice: light-blue → cyan → white. */
	ice: [
		{ pos: 0, color: "#74c0fc" },
		{ pos: 0.5, color: "#99e9f2" },
		{ pos: 1, color: "#f8f9fa" },
	] as GradientStop[],

	/** Rainbow: full spectrum ROYGBIV. */
	rainbow: [
		{ pos: 0, color: "#ff0000" },
		{ pos: 0.17, color: "#ff8800" },
		{ pos: 0.33, color: "#ffff00" },
		{ pos: 0.5, color: "#00cc00" },
		{ pos: 0.67, color: "#0088ff" },
		{ pos: 0.83, color: "#4400cc" },
		{ pos: 1, color: "#8800aa" },
	] as GradientStop[],

	/** Terminal green: classic amber-terminal green. */
	terminal: [
		{ pos: 0, color: "#00ff00" },
		{ pos: 0.5, color: "#33ff33" },
		{ pos: 1, color: "#99ff99" },
	] as GradientStop[],
} as const;

export type GradientPresetName = keyof typeof gradientPresets;
