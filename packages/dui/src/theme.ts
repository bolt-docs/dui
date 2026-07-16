import type { ColorInput } from "./color";
import { colorize, colorMap } from "./color";

export type ColorStyle = ColorInput | { fg?: ColorInput; bg?: ColorInput };

export interface LoggerTheme {
	info?: ColorStyle;
	warn?: ColorStyle;
	error?: ColorStyle;
	success?: ColorStyle;
	debug?: ColorStyle;
}

export interface BoxTheme {
	border?: ColorStyle;
	title?: ColorStyle;
	arrow?: ColorStyle;
	url?: ColorStyle;
	hint?: ColorStyle;
	label?: ColorStyle;
	value?: ColorStyle;
}

export interface SpinnerTheme {
	frame?: ColorStyle;
	success?: ColorStyle;
	fail?: ColorStyle;
	warn?: ColorStyle;
	info?: ColorStyle;
}

export interface ListTheme {
	bullet?: ColorStyle;
	number?: ColorStyle;
	check?: ColorStyle;
	cross?: ColorStyle;
}

export interface StepsTheme {
	success?: ColorStyle;
	error?: ColorStyle;
	running?: ColorStyle;
	pending?: ColorStyle;
	detail?: ColorStyle;
	connector?: ColorStyle;
}

export interface DividerTheme {
	line?: ColorStyle;
}

export interface PromptTheme {
	message?: ColorStyle;
	suffix?: ColorStyle;
}

export interface InputTheme {
	message?: ColorStyle;
	value?: ColorStyle;
	placeholder?: ColorStyle;
	error?: ColorStyle;
}

export interface SelectTheme {
	pointer?: ColorStyle;
	selected?: ColorStyle;
	label?: ColorStyle;
	message?: ColorStyle;
}

export interface MultiselectTheme {
	pointer?: ColorStyle;
	selected?: ColorStyle;
	checked?: ColorStyle;
	label?: ColorStyle;
	message?: ColorStyle;
}

export interface TreeTheme {
	pointer?: ColorStyle;
	selected?: ColorStyle;
	label?: ColorStyle;
	message?: ColorStyle;
	branch?: ColorStyle;
}

export interface ProgressTheme {
	bar?: ColorStyle;
}

export interface TableTheme {
	header?: ColorStyle;
	border?: ColorStyle;
}

export interface MarkdownTheme {
	heading1?: ColorStyle;
	heading2?: ColorStyle;
	heading3?: ColorStyle;
	heading4?: ColorStyle;
	heading5?: ColorStyle;
	heading6?: ColorStyle;
	codeBorder?: ColorStyle;
	codeLang?: ColorStyle;
	/**
	 * Color for inline-code chips.
	 *
	 * Default ships as `{ fg, bg }` so the chip sidebar reads visually
	 * consistent with the rest of the markdown palette. Pass a plain
	 * string for fg-only styling (no background). Pass `{ fg: "..."}`
	 * to keep the bg from the default while overriding the foreground.
	 */
	codeInline?: ColorStyle;
	linkText?: ColorStyle;
	linkUrl?: ColorStyle;
	imageText?: ColorStyle;
	quoteBar?: ColorStyle;
	quoteText?: ColorStyle;
	listBullet?: ColorStyle;
	listNumber?: ColorStyle;
	listCheck?: ColorStyle;
	listCross?: ColorStyle;
	thematic?: ColorStyle;
}

export interface DuiTheme {
	success?: ColorStyle;
	error?: ColorStyle;
	warning?: ColorStyle;
	info?: ColorStyle;
	muted?: ColorStyle;
	accent?: ColorStyle;
	logger?: LoggerTheme;
	box?: BoxTheme;
	spinner?: SpinnerTheme;
	list?: ListTheme;
	steps?: StepsTheme;
	divider?: DividerTheme;
	prompt?: PromptTheme;
	input?: InputTheme;
	select?: SelectTheme;
	multiselect?: MultiselectTheme;
	tree?: TreeTheme;
	progress?: ProgressTheme;
	table?: TableTheme;
	markdown?: MarkdownTheme;
}

type ColorFn = (s: string) => string;

// Pair-shaped spec returned by `getDefaultFn` so that compound
// `{fg, bg}` defaults (e.g. the `markdown.codeInline` chip) expose
// the background as a separate painter — same shape as
// `resolveColor`'s public output.
type DefaultSpec = { apply: ColorFn; bg?: ColorFn };

// String for fg-only defaults; explicit object for compound
// `{fg, bg}` defaults so both layers can be themed independently.
type DefaultValue = string | { fg: string; bg: string };

function resolveColorStyle(
	style: ColorStyle | undefined,
	defaultSpec: DefaultSpec,
): { apply: ColorFn; bg?: ColorFn } {
	// No user/theme override → hand back the default spec verbatim so
	// compound defaults keep their bg available to consumers of
	// `resolveColor`.
	if (!style) return defaultSpec;

	if (typeof style === "string") {
		return { apply: (s: string) => colorize(s, style, "fg") };
	}

	const { fg, bg } = style;
	const apply: ColorFn = fg ? (s: string) => colorize(s, fg, "fg") : defaultSpec.apply;
	// Falsy `bg` (absent key, undefined, or empty string) falls through
	// to the default's bg, so passing `{ fg: "..." }` keeps the chip
	// background that ships with markdown defaults. Pass a string
	// `codeInline` (no object) to opt out of any background.
	const bgFn: ColorFn | undefined = bg
		? (s: string) => colorize(s, bg, "bg")
		: defaultSpec.bg;

	return { apply, bg: bgFn };
}

function getDefaultFn(slot: string): DefaultSpec {
	const map: Record<string, DefaultValue> = {
		"logger.warn": "yellow",
		"logger.error": "red",
		"logger.success": "green",
		"logger.debug": "gray",
		"logger.info": "gray",
		"box.arrow": "green",
		"box.url": "cyan",
		"box.hint": "gray",
		"spinner.frame": "cyan",
		"spinner.success": "green",
		"spinner.fail": "red",
		"spinner.warn": "yellow",
		"spinner.info": "blue",
		"list.bullet": "gray",
		"list.number": "gray",
		"list.check": "green",
		"list.cross": "red",
		"steps.success": "green",
		"steps.error": "red",
		"steps.running": "cyan",
		"steps.pending": "gray",
		"steps.detail": "gray",
		"steps.connector": "gray",
		"divider.line": "gray",
		"prompt.message": "yellow",
		"prompt.suffix": "gray",
		"input.message": "yellow",
		"input.value": "white",
		"input.placeholder": "gray",
		"input.error": "red",
		"select.pointer": "cyan",
		"select.selected": "cyan",
		"select.label": "white",
		"select.message": "yellow",
		"multiselect.pointer": "cyan",
		"multiselect.selected": "cyan",
		"multiselect.checked": "green",
		"multiselect.label": "white",
		"multiselect.message": "yellow",
		"tree.pointer": "cyan",
		"tree.selected": "cyan",
		"tree.label": "white",
		"tree.message": "yellow",
		"tree.branch": "gray",
		"progress.bar": "cyan",
		"table.header": "bold",
		"box.title": "bold",
		// Markdown defaults — hex colors map directly through `colorize`
		// (which handles 24-bit ANSI itself) so each heading level keeps
		// its distinctive palette without needing raw SGR literals.
		// `codeInline` is a compound `{fg, bg}` default so the chip
		// background matches the rest of the palette out of the box;
		// consumers can still pass a plain string for fg-only chips.
		"markdown.heading1": "#ff6e6e",
		"markdown.heading2": "#ffb450",
		"markdown.heading3": "#ffdc50",
		"markdown.heading4": "#82dc82",
		"markdown.heading5": "#64c8ff",
		"markdown.heading6": "#b48cff",
		"markdown.codeBorder": "#646478",
		"markdown.codeLang": "#888888",
		"markdown.codeInline": { fg: "#96c8ff", bg: "#282c34" },
		"markdown.linkText": "#58a6ff",
		"markdown.linkUrl": "#888888",
		"markdown.imageText": "#888888",
		"markdown.quoteBar": "#64788c",
		"markdown.quoteText": "#a0aab4",
		"markdown.listBullet": "#888888",
		"markdown.listNumber": "#888888",
		"markdown.listCheck": "#50c878",
		"markdown.listCross": "#b4b4b4",
		"markdown.thematic": "#888888",
	};

	const value = map[slot];
	// Hex defaults (markdown.*) round-trip through `colorize` so we keep
	// typed `ColorName` lookups for named colors and one consistent color
	// path everywhere else. Compound `{fg, bg}` defaults expose fg and
	// bg as separate `ColorFn` so callers (and the renderer's bg
	// fallback branch) can compose them like user-supplied overrides.
	if (value !== undefined) {
		if (typeof value === "string") {
			if (value.startsWith("#")) {
				const hex = value;
				return { apply: (s: string) => colorize(s, hex, "fg") };
			}
			const fn = colorMap[value];
			if (fn) return { apply: fn };
		} else {
			return {
				apply: (s: string) => colorize(s, value.fg, "fg"),
				bg: (s: string) => colorize(s, value.bg, "bg"),
			};
		}
	}
	return { apply: (s: string) => s };
}

function getFromTheme(
	theme: DuiTheme | undefined,
	path: string,
): ColorStyle | undefined {
	if (!theme) return undefined;

	const parts = path.split(".");
	let current: Record<string, unknown> = theme as Record<string, unknown>;
	for (const part of parts) {
		const value = current[part];
		if (value == null || typeof value !== "object") {
			return value as ColorStyle | undefined;
		}
		current = value as Record<string, unknown>;
	}
	return current as ColorStyle | undefined;
}

export function resolveColor(
	slot: string,
	theme?: DuiTheme,
	override?: ColorStyle,
): { apply: ColorFn; bg?: ColorFn } {
	let custom = override ?? getFromTheme(theme, slot);

	// Fallback: if component-specific slot is not set, try the global slot
	// e.g. "logger.success" falls back to "success"
	if (!custom && slot.includes(".")) {
		const parts = slot.split(".");
		const globalSlot = parts[parts.length - 1];
		custom = getFromTheme(theme, globalSlot);
	}

	const defaultSpec = getDefaultFn(slot);
	return resolveColorStyle(custom, defaultSpec);
}

export function resolveColorSimple(
	color: ColorInput,
	defaultFn: ColorFn,
): ColorFn {
	if (!color) return defaultFn;
	return (s: string) => colorize(s, color, "fg");
}
