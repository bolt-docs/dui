/**
 * Detect color support from env vars and TTY state.
 */
function detectColorSupport(): boolean {
	// RFC NO_COLOR: only a non-empty value means "off". Empty string means
	// "no preference" — treat as unset. This matches the `accessibility.ts`
	// heuristic in `readEnv()` so the two colour-detection paths are
	// consistent across the library (empty string is falsy in JS, so
	// the `&&` short-circuits before the `!== ""` check).
	if (process.env.NO_COLOR) return false;
	if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== "0") return true;
	return process.stdout?.isTTY ?? false;
}

export let isColorSupported: boolean = detectColorSupport();

export function setColorSupported(value: boolean): void {
	isColorSupported = value;
}

/**
 * Re-evaluate color support from env vars (`NO_COLOR`, `FORCE_COLOR`,
 * `process.stdout.isTTY`). Useful for tests, scripts, or anywhere
 * the initial detection may have happened against stale env state.
 */
export function refreshColorSupport(): void {
	isColorSupported = detectColorSupport();
}

export type ColorInput = string;
export type PaintTarget = "fg" | "bg";

function ansi(params: number[]): string {
	return `\x1b[${params.join(";")}m`;
}

/**
 * Resolve a named-color string to its SGR palette index.
 *
 * `NAMED_FG` keys are the plain names (`"cyan"`) while `NAMED_BG` keys
 * are the `"bg"`-prefixed chainable-API names (`"bgCyan"`). When a
 * caller passes `"cyan"` as a bg color, we transparently alias it to
 * `"bgCyan"` so the chainable `colors.bgCyan("x")` API and the
 * `colorize("x", "cyan", "bg")` API produce identical SGR.
 *
 * Returns `undefined` for non-named strings — callers fall through to
 * `parseColor` for hex / OkLCh / rgb strings.
 */
function resolveNamedBgSgr(name: string): number | undefined {
	if (typeof name !== "string" || name.length === 0) return undefined;
	const direct = NAMED_BG[name as BgName];
	if (direct !== undefined) return direct;
	// Alias lookup: "cyan" → "bgCyan" (capitalize first letter + prefix).
	const aliased = `bg${name[0]?.toUpperCase()}${name.slice(1)}`;
	return NAMED_BG[aliased as BgName];
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

// Color/style name catalogs

const NAMED_FG_NAMES = [
	"black",
	"red",
	"green",
	"yellow",
	"blue",
	"magenta",
	"cyan",
	"white",
	"gray",
	"bright-red",
	"bright-green",
	"bright-yellow",
	"bright-blue",
	"bright-magenta",
	"bright-cyan",
	"bright-white",
] as const;

const NAMED_BG_NAMES = [
	"bgBlack",
	"bgRed",
	"bgGreen",
	"bgYellow",
	"bgBlue",
	"bgMagenta",
	"bgCyan",
	"bgWhite",
	"bgGray",
	"bgBright-red",
	"bgBright-green",
	"bgBright-yellow",
	"bgBright-blue",
	"bgBright-magenta",
	"bgBright-cyan",
	"bgBright-white",
] as const;

const STYLE_NAMES = [
	"bold",
	"dim",
	"italic",
	"underline",
	"inverse",
	"hidden",
	"strikethrough",
] as const;

type FgName = (typeof NAMED_FG_NAMES)[number];
type BgName = (typeof NAMED_BG_NAMES)[number];
type StyleName = (typeof STYLE_NAMES)[number];

/**
 * Every autocomplete-able key on the `colors` chainable object.
 * Use this to type CLI wrappers or theme plugins that need to dispatch on
 * a color name.
 */
export type ColorName = FgName | BgName | StyleName | "grey";

// SGR code dictionaries

const NAMED_FG: Record<FgName, number> = {
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

const NAMED_BG: Record<BgName, number> = {
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

const STYLE_CODES: Record<StyleName, number> = {
	bold: 1,
	dim: 2,
	italic: 3,
	underline: 4,
	inverse: 7,
	hidden: 8,
	strikethrough: 9,
};

// Build ALL_STYLES dictionary

const ALL_STYLES: Record<string, StyleDef> = {};
for (const name of NAMED_FG_NAMES) {
	ALL_STYLES[name] = { open: [NAMED_FG[name]], close: [CLOSE_FG] };
}
for (const name of NAMED_BG_NAMES) {
	ALL_STYLES[name] = { open: [NAMED_BG[name]], close: [CLOSE_BG] };
}
for (const name of STYLE_NAMES) {
	ALL_STYLES[name] = { open: [STYLE_CODES[name]], close: [CLOSE_STYLE[name]] };
}

// Chainable colors API

type NestedColors = {
	readonly [K in ColorName]: NestedColors;
} & {
	/** Format and style the given text fragments (variadic — joined with a space). */
	(...args: string[]): string;
};

function createNestedColors(styles: StyleDef[] = []): NestedColors {
	const impl = (...args: string[]): string => {
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
	};

	// Type system + runtime meet here: TS cannot statically verify that every
	// `ColorName` property was added via `Object.defineProperty`, but the
	// construction below is exhaustive (we iterate `Object.keys(ALL_STYLES)`
	// which contains exactly the `ColorName` keys plus "grey").
	const fn = impl as unknown as NestedColors;

	for (const name of Object.keys(ALL_STYLES)) {
		Object.defineProperty(fn, name, {
			get() {
				return createNestedColors([...styles, ALL_STYLES[name]]);
			},
			enumerable: true,
			configurable: true,
		});
	}

	// Long-established `grey` alias for `gray`.
	Object.defineProperty(fn, "grey", {
		get() {
			return fn.gray;
		},
		enumerable: true,
		configurable: true,
	});

	return fn;
}

/** Chainable color object with type-safe autocomplete. */
export const colors: NestedColors = createNestedColors();

// Legacy flat lookup for dynamic keys
export const colorMap: Record<string, (s: string) => string> = {};
for (const name of Object.keys(ALL_STYLES)) {
	const def = ALL_STYLES[name];
	colorMap[name] = (s: string) => ansi(def.open) + s + ansi(def.close);
}
colorMap.grey = colorMap.gray;

// Color parsing utilities

export interface ParsedColor {
	r: number;
	g: number;
	b: number;
	a?: number;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/* ── CSS Color 4 helpers ─────────────────────────────────────── */

/**
 * True when a channel token is the CSS Color 4 `none` keyword
 * (case-insensitive) — i.e. a *missing* component.
 */
function isNone(raw: string | undefined): boolean {
	return raw !== undefined && raw.toLowerCase() === "none";
}

/**
 * Convert a channel token to a number. `none` (missing component)
 * behaves as 0 per CSS Color 4 §12; `undefined` (group absent) stays
 * undefined so callers can distinguish "not provided" from "zero".
 */
function channelValue(raw: string | undefined): number | undefined {
	if (raw === undefined) return undefined;
	if (isNone(raw)) return 0;
	return Number(raw);
}

/**
 * Resolve a hue token to degrees. Accepts `deg` (default), `turn`
 * (×360), and `rad` (×180/π); negative values wrap into 0..360;
 * `none` (missing hue) behaves as 0°.
 */
function hueToDegrees(raw: string | undefined, unit: string | undefined): number {
	if (raw === undefined || isNone(raw)) return 0;
	let h = Number(raw);
	if (unit === "turn") h *= 360;
	else if (unit === "rad") h *= 180 / Math.PI;
	return ((h % 360) + 360) % 360;
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
	// Accepts both comma syntax (`rgb(100, 200, 50)`) and the modern
	// CSS Color 4 space syntax (`rgb(100 200 50)`, with optional
	// slash alpha `rgb(100 200 50 / 0.5)`). The comma form is the
	// legacy / most-portable spelling; the space form is what editors
	// and AI tools emit today, so accepting both keeps `colorize()`
	// non-surprising for pasted CSS. Any channel (including alpha)
	// may be the `none` keyword (missing component → 0, alpha → 1).
	const rgbMatch = input.match(
		/^rgb\(\s*(none|\d+)\s*(?:,\s*(none|\d+)\s*,\s*(none|\d+)|\s+(none|\d+)\s+(none|\d+))\s*(?:\/\s*(none|[\d.]+)(%?)\s*)?\)$/i,
	);
	if (rgbMatch) {
		const result: ParsedColor = {
			r: clamp(channelValue(rgbMatch[1]) ?? 0, 0, 255),
			g: clamp(channelValue(rgbMatch[2] ?? rgbMatch[4]) ?? 0, 0, 255),
			b: clamp(channelValue(rgbMatch[3] ?? rgbMatch[5]) ?? 0, 0, 255),
		};
		if (rgbMatch[6] !== undefined) {
			// Alpha accepts `0..1` or `%` (divide by 100), like hsl/oklch.
			result.a = isNone(rgbMatch[6])
				? 1
				: clamp(Number(rgbMatch[6]) / (rgbMatch[7] === "%" ? 100 : 1), 0, 1);
		}
		return result;
	}
	const rgbaMatch = input.match(
		/^rgba\(\s*(none|\d+)\s*(?:,\s*(none|\d+)\s*,\s*(none|\d+)\s*,\s*(none|[\d.]+)(%?)|\s+(none|\d+)\s+(none|\d+)\s*(?:\/\s*(none|[\d.]+)(%?))?)\s*\)$/i,
	);
	if (rgbaMatch) {
		const r = channelValue(rgbaMatch[1]) ?? 0;
		const g = channelValue(rgbaMatch[2] ?? rgbaMatch[6]) ?? 0;
		const b = channelValue(rgbaMatch[3] ?? rgbaMatch[7]) ?? 0;
		// `rgba(255 0 0)` (space form, no alpha) is opaque — only the
		// comma form requires the 4th arg, so default missing alpha to 1
		// instead of NaN. `none` alpha (missing) is also opaque.
		const aRaw = rgbaMatch[4] ?? rgbaMatch[8];
		const aIsPct = (rgbaMatch[5] ?? rgbaMatch[9]) === "%";
		const a = isNone(aRaw)
			? 1
			: clamp(Number(aRaw ?? 1) / (aIsPct ? 100 : 1), 0, 1);
		return {
			r: clamp(r, 0, 255),
			g: clamp(g, 0, 255),
			b: clamp(b, 0, 255),
			a: clamp(a, 0, 1),
		};
	}
	return null;
}

function linearSrgbToSrgb(c: number): number {
	const abs = Math.abs(c);
	if (abs <= 0.0031308) {
		return c * 12.92;
	}
	return (c < 0 ? -1 : 1) * (1.055 * abs ** (1 / 2.4) - 0.055);
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

function parseHslString(input: string): ParsedColor | null {
	// CSS Color 4 hsl()/hsla() accepts BOTH legacy comma syntax
	// (`hsl(120, 50%, 50%)`, `hsla(120, 50%, 50%, 0.5)`) and the modern
	// space syntax (`hsl(120 50% 50% / 0.5)`). Hue supports units:
	// `deg` (default), `turn`, `rad`, and negative values. Saturation
	// and lightness carry `%`; alpha may be a unitless 0..1 or a `%`.
	// Any channel (including hue) may be the `none` keyword (missing
	// component → 0, alpha → 1).
	const match = input.match(
		/^hsla?\(\s*(none|-?[\d.]+)(deg|turn|rad)?\s*(?:,\s*(none|[\d.]+)%?\s*,\s*(none|[\d.]+)%?\s*(?:,\s*(none|[\d.]+)(%?))?|\s+(none|[\d.]+)%?\s+(none|[\d.]+)%?\s*(?:\/\s*(none|[\d.]+)(%?))?)\s*\)$/i,
	);
	if (!match) return null;

	const h = hueToDegrees(match[1], match[2]);

	// Comma form → groups 3,4,5,6; space form → groups 7,8,9,10.
	// The `%?` capture next to alpha lets us distinguish `0.5` (0..1)
	// from `50%` (divide by 100) — a bare `%` consumed by the literal
	// would clamp `50%` to 1 instead of 0.5.
	const sRaw = match[3] ?? match[7];
	const lRaw = match[4] ?? match[8];
	const aRaw = match[5] ?? match[9];
	const aIsPct = (match[6] ?? match[10]) === "%";
	const s = clamp(channelValue(sRaw) ?? 0, 0, 100) / 100;
	const l = clamp(channelValue(lRaw) ?? 0, 0, 100) / 100;
	const a = isNone(aRaw)
		? 1
		: aRaw !== undefined
			? clamp(Number(aRaw) / (aIsPct ? 100 : 1), 0, 1)
			: undefined;

	// Convert HSL → RGB
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l - c / 2;
	let r1 = 0, g1 = 0, b1 = 0;
	if (h < 60) { r1 = c; g1 = x; }
	else if (h < 120) { r1 = x; g1 = c; }
	else if (h < 180) { g1 = c; b1 = x; }
	else if (h < 240) { g1 = x; b1 = c; }
	else if (h < 300) { r1 = x; b1 = c; }
	else { r1 = c; b1 = x; }
	const result: ParsedColor = {
		r: Math.round((r1 + m) * 255),
		g: Math.round((g1 + m) * 255),
		b: Math.round((b1 + m) * 255),
	};
	if (a !== undefined) result.a = a;
	return result;
}

function parseOklchString(input: string): ParsedColor | null {
	// Accepts the CSS Color 4 space form (`oklch(60% 0.15 250)`,
	// optional `/ alpha`) AND the legacy comma form
	// (`oklch(60%, 0.15, 250, 0.8)`) so pasted values from either
	// era resolve. Lightness accepts `%` (0..100) or unitless (0..1);
	// chroma is unitless; hue supports `deg` (default) / `turn` / `rad`
	// units and negative values; alpha is 0..1 or `%`. Any channel
	// may be the `none` keyword (missing component → 0, alpha → 1).
	const match = input.match(
		/^oklch\(\s*(?<L>none|-?[\d.]+)(?<Lpct>%?)\s*(?:,\s*(?<C1>none|-?[\d.]+)\s*,\s*(?<H1>none|-?[\d.]+)(?<H1u>deg|turn|rad)?\s*(?:,\s*(?<A1>none|[\d.]+)(?<A1pct>%?))?|\s+(?<C2>none|-?[\d.]+)\s+(?<H2>none|-?[\d.]+)(?<H2u>deg|turn|rad)?\s*(?:\/\s*(?<A2>none|[\d.]+)(?<A2pct>%?))?)\s*\)$/i,
	);
	if (!match || !match.groups) return null;
	const g = match.groups;

	let L = channelValue(g.L) ?? 0;
	if (g.Lpct === "%") L = L / 100;
	// Comma form → C1/H1/A1; space form → C2/H2/A2.
	const C = channelValue(g.C1 ?? g.C2) ?? 0;
	const H = hueToDegrees(g.H1 ?? g.H2, g.H1u ?? g.H2u);
	const aRaw = g.A1 ?? g.A2;
	const aIsPct = (g.A1pct ?? g.A2pct) === "%";
	const a = isNone(aRaw)
		? 1
		: aRaw !== undefined
			? clamp(Number(aRaw) / (aIsPct ? 100 : 1), 0, 1)
			: undefined;

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

	// Format dispatch is case-insensitive (`RGB(...)` / `Hsl(...)`)
	// because the per-format regexes below are all `/i` — keeping the
	// router lowercase-only would reject perfectly valid pasted CSS.
	const lower = trimmed.toLowerCase();
	if (lower.startsWith("#")) {
		result = hexToRgb(trimmed);
	} else if (lower.startsWith("oklch")) {
		result = parseOklchString(trimmed);
	} else if (lower.startsWith("hsl")) {
		result = parseHslString(trimmed);
	} else if (lower.startsWith("rgb")) {
		result = parseRgbString(trimmed);
	}

	if (result) {
		colorCache.set(trimmed, result);
		return result;
	}

	throw new Error(
		`Unsupported color format: "${input}". Use hex, rgb(), rgba(), hsl(), hsla(), or oklch().`,
	);
}

export function toAnsiFg(color: ColorInput): string {
	// Named colors (e.g. "cyan", "bold-italic" companions) short-circuit
	// to the corresponding SGR palette index so theme overrides can use
	// the same vocabulary as the chainable `colors.cyan(...)` API.
	// Falls back to 24-bit hex/OkLCh/rgb parsing for everything else.
	if (typeof color === "string" && NAMED_FG[color as FgName] !== undefined) {
		return ansi([NAMED_FG[color as FgName]]);
	}
	const { r, g, b } = parseColor(color);
	return ansi([38, 2, r, g, b]);
}

export function toAnsiBg(color: ColorInput): string {
	const named = resolveNamedBgSgr(color);
	if (named !== undefined) return ansi([named]);
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
	// Short-circuit to the named-color palette BEFORE parseColor so
	// `colors.cyan("x")` and `colorize("x", "cyan")` produce identical
	// SGR. `parseColor` only handles hex / oklch / rgb.
	if (target === "bg") {
		const named = resolveNamedBgSgr(color);
		if (named !== undefined) {
			return `${ansi([named])}${text}${ansi([CLOSE_BG])}`;
		}
		return `${toAnsiBg(color)}${text}${ansi([CLOSE_BG])}`;
	}
	if (typeof color === "string" && NAMED_FG[color as FgName] !== undefined) {
		return `${ansi([NAMED_FG[color as FgName]])}${text}${ansi([CLOSE_FG])}`;
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
			// Tolerate unknown style names at runtime
			const code = STYLE_CODES[style as StyleName];
			if (code !== undefined) {
				openParts.push(code);
				closeParts.push(CLOSE_STYLE[style]);
			}
		}
	}

	if (color) {
		if (NAMED_FG[color as FgName] !== undefined) {
			openParts.push(NAMED_FG[color as FgName]);
			closeParts.push(CLOSE_FG);
		} else {
			const { r, g, b } = parseColor(color);
			openParts.push(38, 2, r, g, b);
			closeParts.push(CLOSE_FG);
		}
	}

	if (bg) {
		const bgNamed = resolveNamedBgSgr(bg);
		if (bgNamed !== undefined) {
			openParts.push(bgNamed);
			closeParts.push(CLOSE_BG);
		} else {
			const { r, g, b } = parseColor(bg);
			openParts.push(48, 2, r, g, b);
			closeParts.push(CLOSE_BG);
		}
	}

	if (openParts.length === 0) return text;
	return `${ansi(openParts)}${text}${ansi(closeParts)}`;
}
