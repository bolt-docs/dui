export let isColorSupported =
	!("NO_COLOR" in process.env) && (process.stdout?.isTTY ?? false);

export function setColorSupported(value: boolean): void {
	isColorSupported = value;
}

export type ColorInput = string;
export type PaintTarget = "fg" | "bg";

function ansi(params: number[]): string {
	return `\x1b[${params.join(";")}m`;
}

// Individual SGR close codes (instead of blanket \x1b[0m)
const CLOSE_FG = 39;
const CLOSE_BG = 49;
const CLOSE_STYLE: Record<string, number> = {
	bold: 22,
	dim: 22,
	italic: 23,
	underline: 24,
	inverse: 27,
	hidden: 28,
	strikethrough: 29,
};

interface StyleDef {
	open: number[];
	close: number[];
}

const NAMED_FG: Record<string, number> = {
	black: 30,
	red: 31,
	green: 32,
	yellow: 33,
	blue: 34,
	magenta: 35,
	cyan: 36,
	white: 37,
	gray: 90,
	"bright-red": 91,
	"bright-green": 92,
	"bright-yellow": 93,
	"bright-blue": 94,
	"bright-magenta": 95,
	"bright-cyan": 96,
	"bright-white": 97,
};

const NAMED_BG: Record<string, number> = {
	bgBlack: 40,
	bgRed: 41,
	bgGreen: 42,
	bgYellow: 43,
	bgBlue: 44,
	bgMagenta: 45,
	bgCyan: 46,
	bgWhite: 47,
	bgGray: 100,
	"bgBright-red": 101,
	"bgBright-green": 102,
	"bgBright-yellow": 103,
	"bgBright-blue": 104,
	"bgBright-magenta": 105,
	"bgBright-cyan": 106,
	"bgBright-white": 107,
};

const STYLE_CODES: Record<string, number> = {
	bold: 1,
	dim: 2,
	italic: 3,
	underline: 4,
	inverse: 7,
	hidden: 8,
	strikethrough: 9,
};

const ALL_STYLES: Record<string, StyleDef> = {};

for (const [name, code] of Object.entries(NAMED_FG)) {
	ALL_STYLES[name] = { open: [code], close: [CLOSE_FG] };
}
for (const [name, code] of Object.entries(NAMED_BG)) {
	ALL_STYLES[name] = { open: [code], close: [CLOSE_BG] };
}
for (const [name, code] of Object.entries(STYLE_CODES)) {
	ALL_STYLES[name] = { open: [code], close: [CLOSE_STYLE[name]] };
}

// --- Chalk-like chainable API ---

type NestedColors = {
	(...args: string[]): string;
	[method: string]: NestedColors;
};

function createNestedColors(styles: StyleDef[] = []): NestedColors {
	const fn = function (...args: string[]): string {
		if (!isColorSupported || styles.length === 0) {
			return args.join(" ");
		}

		const openParts = styles.flatMap((s) => s.open);
		const openSeq = ansi(openParts);

		const closeSeqs = styles.flatMap((s) => s.close.map((c) => ansi([c])));
		const fullClose = closeSeqs.join("");

		let text = args.join(" ");

		for (const closeSeq of closeSeqs) {
			if (text.includes(closeSeq)) {
				text = text.replaceAll(closeSeq, closeSeq + openSeq);
			}
		}

		return `${openSeq}${text}${fullClose}`;
	} as NestedColors;

	for (const name of Object.keys(ALL_STYLES)) {
		Object.defineProperty(fn, name, {
			get() {
				return createNestedColors([...styles, ALL_STYLES[name]]);
			},
			enumerable: true,
			configurable: true,
		});
	}

	return fn;
}

export const colors = createNestedColors();

Object.defineProperty(colors, "grey", {
	get() {
		return colors.gray;
	},
	enumerable: true,
	configurable: true,
});

export const colorMap: Record<string, (s: string) => string> = {};
for (const name of Object.keys(ALL_STYLES)) {
	const def = ALL_STYLES[name];
	colorMap[name] = (s: string) => ansi(def.open) + s + ansi(def.close);
}
colorMap.grey = colorMap.gray;

export interface ParsedColor {
	r: number;
	g: number;
	b: number;
	a?: number;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): ParsedColor {
	let h = hex.replace(/^#/, "");
	if (!/^[0-9a-fA-F]+$/.test(h)) {
		throw new Error(
			`Invalid hex color: "${hex}". Use 3, 6, or 8 digit hex format.`,
		);
	}
	if (h.length === 3) {
		h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
	}
	if (h.length === 4) {
		h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
	}
	if (h.length === 8) {
		return {
			r: parseInt(h.slice(0, 2), 16),
			g: parseInt(h.slice(2, 4), 16),
			b: parseInt(h.slice(4, 6), 16),
			a: Math.round((parseInt(h.slice(6, 8), 16) / 255) * 100) / 100,
		};
	}
	return {
		r: parseInt(h.slice(0, 2), 16),
		g: parseInt(h.slice(2, 4), 16),
		b: parseInt(h.slice(4, 6), 16),
	};
}

function parseRgbString(input: string): ParsedColor | null {
	const rgbMatch = input.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
	if (rgbMatch) {
		return {
			r: clamp(Number(rgbMatch[1]), 0, 255),
			g: clamp(Number(rgbMatch[2]), 0, 255),
			b: clamp(Number(rgbMatch[3]), 0, 255),
		};
	}
	const rgbaMatch = input.match(
		/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/,
	);
	if (rgbaMatch) {
		return {
			r: clamp(Number(rgbaMatch[1]), 0, 255),
			g: clamp(Number(rgbaMatch[2]), 0, 255),
			b: clamp(Number(rgbaMatch[3]), 0, 255),
			a: clamp(Number(rgbaMatch[4]), 0, 1),
		};
	}
	return null;
}

function linearSrgbToSrgb(c: number): number {
	const abs = Math.abs(c);
	if (abs <= 0.0031308) {
		return c * 12.92;
	}
	return (c < 0 ? -1 : 1) * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
}

function oklabToLinearSrgb(
	L: number,
	a: number,
	b: number,
): [number, number, number] {
	const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = L - 0.0894841775 * a - 1.291485548 * b;

	const l = l_ * l_ * l_;
	const m = m_ * m_ * m_;
	const s = s_ * s_ * s_;

	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	];
}

function parseOklchString(input: string): ParsedColor | null {
	const match = input.match(
		/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\s*\)$/,
	);
	if (!match) return null;

	let L = Number(match[1]);
	if (match[2] === "%") L = L / 100;
	const C = Number(match[3]);
	const H = Number(match[4]);
	const a = match[5] !== undefined ? clamp(Number(match[5]), 0, 1) : undefined;

	const hRad = (H * Math.PI) / 180;
	const labA = C * Math.cos(hRad);
	const labB = C * Math.sin(hRad);

	const [linR, linG, linB] = oklabToLinearSrgb(L, labA, labB);

	const result: ParsedColor = {
		r: clamp(Math.round(linearSrgbToSrgb(linR) * 255), 0, 255),
		g: clamp(Math.round(linearSrgbToSrgb(linG) * 255), 0, 255),
		b: clamp(Math.round(linearSrgbToSrgb(linB) * 255), 0, 255),
	};
	if (a !== undefined) result.a = a;
	return result;
}

const colorCache = new Map<string, ParsedColor>();

export function parseColor(input: ColorInput): ParsedColor {
	if (typeof input !== "string") {
		throw new TypeError(`Expected a string, got ${typeof input}`);
	}

	const trimmed = input.trim();
	const cached = colorCache.get(trimmed);
	if (cached) return cached;

	let result: ParsedColor | null = null;

	if (trimmed.startsWith("#")) {
		result = hexToRgb(trimmed);
	} else if (trimmed.startsWith("oklch")) {
		result = parseOklchString(trimmed);
	} else if (trimmed.startsWith("rgb")) {
		result = parseRgbString(trimmed);
	}

	if (result) {
		colorCache.set(trimmed, result);
		return result;
	}

	throw new Error(
		`Unsupported color format: "${input}". Use hex, rgb(), rgba(), or oklch().`,
	);
}

export function toAnsiFg(color: ColorInput): string {
	const { r, g, b } = parseColor(color);
	return ansi([38, 2, r, g, b]);
}

export function toAnsiBg(color: ColorInput): string {
	const { r, g, b } = parseColor(color);
	return ansi([48, 2, r, g, b]);
}

export function toAnsiFgBg(fg: ColorInput, bg: ColorInput): string {
	const f = parseColor(fg);
	const b = parseColor(bg);
	return ansi([38, 2, f.r, f.g, f.b, 48, 2, b.r, b.g, b.b]);
}

export function colorize(
	text: string,
	color: ColorInput,
	target: PaintTarget = "fg",
): string {
	if (target === "bg") {
		return `${toAnsiBg(color)}${text}${ansi([CLOSE_BG])}`;
	}
	return `${toAnsiFg(color)}${text}${ansi([CLOSE_FG])}`;
}

export function interpolateColor(
	a: ColorInput,
	b: ColorInput,
	t: number,
): string {
	const ca = parseColor(a);
	const cb = parseColor(b);
	const r = clamp(Math.round(ca.r + (cb.r - ca.r) * t), 0, 255);
	const g = clamp(Math.round(ca.g + (cb.g - ca.g) * t), 0, 255);
	const b_ = clamp(Math.round(ca.b + (cb.b - ca.b) * t), 0, 255);
	return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b_.toString(16).padStart(2, "0")}`;
}

export function applyStyle(
	text: string,
	color?: ColorInput,
	bg?: ColorInput,
	styles?: string[],
): string {
	const openParts: number[] = [];
	const closeParts: number[] = [];

	if (styles) {
		for (const style of styles) {
			const code = STYLE_CODES[style];
			if (code !== undefined) {
				openParts.push(code);
				closeParts.push(CLOSE_STYLE[style]);
			}
		}
	}

	if (color) {
		const { r, g, b } = parseColor(color);
		openParts.push(38, 2, r, g, b);
		closeParts.push(CLOSE_FG);
	}

	if (bg) {
		const { r, g, b } = parseColor(bg);
		openParts.push(48, 2, r, g, b);
		closeParts.push(CLOSE_BG);
	}

	if (openParts.length === 0) return text;
	return `${ansi(openParts)}${text}${ansi(closeParts)}`;
}
