/** Shared color utilities for terminal demo previews. */

export function parseHex(hex: string) {
	const n = parseInt(hex.replace("#", ""), 16);
	return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function interpolate(c1: string, c2: string, t: number) {
	const a = parseHex(c1),
		b = parseHex(c2);
	return `rgb(${Math.round(a.r + (b.r - a.r) * t)},${Math.round(a.g + (b.g - a.g) * t)},${Math.round(a.b + (b.b - a.b) * t)})`;
}
