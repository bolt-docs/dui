import type { ColorInput } from "./color";
import { colorize, colorMap } from "./color";

export type ColorStyle = ColorInput | { fg?: ColorInput; bg?: ColorInput };

function _isColorStyle(
	obj: unknown,
): obj is { fg?: ColorInput; bg?: ColorInput } {
	return (
		typeof obj === "object" && obj !== null && !("startsWith" in (obj as object))
	);
}

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
}

type ColorFn = (s: string) => string;

function resolveColorStyle(
	style: ColorStyle | undefined,
	defaultFn: ColorFn,
): { apply: ColorFn; bg?: ColorFn } {
	if (!style) return { apply: defaultFn };

	if (typeof style === "string") {
		return { apply: (s: string) => colorize(s, style, "fg") };
	}

	const { fg, bg } = style;
	const apply: ColorFn = fg ? (s: string) => colorize(s, fg, "fg") : defaultFn;
	const bgFn: ColorFn | undefined = bg
		? (s: string) => colorize(s, bg, "bg")
		: undefined;

	return { apply, bg: bgFn };
}

function getDefaultFn(slot: string): ColorFn {
	const map: Record<string, string> = {
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
	};

	const name = map[slot];
	// `name` is statically known to be a ColorName (the map only references the
	// canonical foreground/style names). We expose the dynamic-looking lookup
	// through the loose `colorMap` escape hatch so callers retain the option to
	// pass arbitrary strings to `applyStyle()` elsewhere.
	if (name) {
		const fn = colorMap[name];
		if (fn) return fn;
	}
	return (s: string) => s;
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

	const defaultFn = getDefaultFn(slot);
	return resolveColorStyle(custom, defaultFn);
}

export function resolveColorSimple(
	color: ColorInput,
	defaultFn: ColorFn,
): ColorFn {
	if (!color) return defaultFn;
	return (s: string) => colorize(s, color, "fg");
}
