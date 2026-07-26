/**
 * Curated theme palettes — drop-in replacements for the default theme
 * passable to `configure({ theme: presets.dracula })` so every widget
 * in the @bdocs/dui catalogue (badge, modal, tabs, box, section,
 * spinner, progress, markdown, kbd) shifts to the palette with one flag.
 *
 * Each preset is a `Partial<DuiTheme>`. Slots that the preset doesn't
 * set fall back to the built-in defaults — the palettes therefore stay
 * compact by focusing on the high-impact surfaces rather than spelling
 * out every leaf.
 *
 * Adding a palette is a one-file change in this module: extend
 * `PresetName`, declare the palette constant, and add it to the
 * `presets` export. The `tests/presets.test.ts` suite then exercises
 * the cascade automatically.
 *
 * @example
 * import { configure, presets } from "@bdocs/dui";
 *
 * configure({ theme: presets.dracula });
 * // every `badge(...)`, `box(...)`, `spinner(...)`, etc. now reads
 * // from the Dracula palette.
 */
import type { DuiTheme } from "./theme";

/** Catalog of curated palette identifiers. */
export type PresetName =
	| "dracula"
	| "nord"
	| "solarized"
	| "catppuccin"
	| "gruvbox";

/**
 * A preset is `Partial<DuiTheme>` — every property is optional so
 * palettes only override the slots they care about, while default
 * theming fills the rest.
 */
export type DuiThemePreset = Partial<DuiTheme>;

// ---------------------------------------------------------------------------
// Dracula — https://draculatheme.com (background #282a36, fg #f8f8f2,
// accent #bd93f9). The official palette: comment #6272a4, cyan #8be9fd,
// green #50fa7b, orange #ffb86c, pink #ff79c6, purple #bd93f9,
// red #ff5555, yellow #f1fa8c.
// ---------------------------------------------------------------------------
const dracula: DuiThemePreset = {
	success: "#50fa7b",
	error: "#ff5555",
	warning: "#f1fa8c",
	info: "#8be9fd",
	muted: "#6272a4",
	accent: "#bd93f9",

	box: {
		border: "#6272a4",
		title: "bold",
		arrow: "#50fa7b",
		url: "#8be9fd",
		hint: "#6272a4",
		label: "#f8f8f2",
		value: "#bd93f9",
	},

	spinner: {
		frame: "#bd93f9",
		success: "#50fa7b",
		fail: "#ff5555",
		warn: "#f1fa8c",
		info: "#8be9fd",
	},

	progress: { bar: "#bd93f9" },

	modal: {
		border: "#bd93f9",
		title: "bold",
		buttonPrimary: { fg: "#f8f8f2", bg: "#bd93f9" },
		buttonSecondary: "#6272a4",
	},

	tabs: {
		active: { fg: "#bd93f9", bg: "#282a36" },
		inactive: "#6272a4",
		border: "#6272a4",
	},

	badge: {
		info: { fg: "#282a36", bg: "#8be9fd" },
		success: { fg: "#282a36", bg: "#50fa7b" },
		warning: { fg: "#282a36", bg: "#f1fa8c" },
		error: { fg: "#f8f8f2", bg: "#ff5555" },
		neutral: { fg: "#f8f8f2", bg: "#6272a4" },
	},

	kbd: { text: "#f8f8f2", border: "#6272a4" },

	section: { title: "bold", line: "#6272a4" },

	markdown: {
		heading1: "#ff79c6",
		heading2: "#bd93f9",
		heading3: "#8be9fd",
		heading4: "#50fa7b",
		heading5: "#f1fa8c",
		heading6: "#ffb86c",
		codeBorder: "#44475a",
		codeLang: "#6272a4",
		codeInline: { fg: "#50fa7b", bg: "#44475a" },
		linkText: "#8be9fd",
		linkUrl: "#6272a4",
		quoteBar: "#bd93f9",
		quoteText: "#6272a4",
	},
};

// ---------------------------------------------------------------------------
// Nord — https://www.nordtheme.com (polar night #2e3440, snow storm
// #d8dee9, frost #5e81ac/#81a1c1/#88c0d0, aurora #bf616a/#d08770/
// #ebcb8b/#a3be8c/#b48ead).
// ---------------------------------------------------------------------------
const nord: DuiThemePreset = {
	success: "#a3be8c",
	error: "#bf616a",
	warning: "#ebcb8b",
	info: "#88c0d0",
	muted: "#4c566a",
	accent: "#5e81ac",

	box: {
		border: "#4c566a",
		title: "bold",
		arrow: "#a3be8c",
		url: "#88c0d0",
		hint: "#4c566a",
		label: "#d8dee9",
		value: "#88c0d0",
	},

	spinner: {
		frame: "#88c0d0",
		success: "#a3be8c",
		fail: "#bf616a",
		warn: "#ebcb8b",
		info: "#5e81ac",
	},

	progress: { bar: "#88c0d0" },

	modal: {
		border: "#5e81ac",
		title: "bold",
		buttonPrimary: { fg: "#2e3440", bg: "#88c0d0" },
		buttonSecondary: "#4c566a",
	},

	tabs: {
		active: { fg: "#88c0d0", bg: "#2e3440" },
		inactive: "#4c566a",
		border: "#4c566a",
	},

	badge: {
		info: { fg: "#2e3440", bg: "#88c0d0" },
		success: { fg: "#2e3440", bg: "#a3be8c" },
		warning: { fg: "#2e3440", bg: "#ebcb8b" },
		error: { fg: "#d8dee9", bg: "#bf616a" },
		neutral: { fg: "#d8dee9", bg: "#4c566a" },
	},

	kbd: { text: "#d8dee9", border: "#4c566a" },

	section: { title: "bold", line: "#4c566a" },

	markdown: {
		heading1: "#bf616a",
		heading2: "#d08770",
		heading3: "#ebcb8b",
		heading4: "#a3be8c",
		heading5: "#88c0d0",
		heading6: "#b48ead",
		codeBorder: "#4c566a",
		codeLang: "#616e88",
		codeInline: { fg: "#a3be8c", bg: "#3b4252" },
		linkText: "#88c0d0",
		linkUrl: "#616e88",
		quoteBar: "#88c0d0",
		quoteText: "#616e88",
	},
};

// ---------------------------------------------------------------------------
// Solarized (dark) — Ethan Schoonover
// (http://ethanschoonover.com/solarized). Base: bg #002b36, fg #839496,
// stack grays #073642/#586e75/#657b83/#93a1a1/#eee8d5. Accents: yellow
// #b58900, orange #cb4b16, red #dc322f, magenta #d33682, violet #6c71c6,
// blue #268bd2, cyan #2aa198, green #859900.
// ---------------------------------------------------------------------------
const solarized: DuiThemePreset = {
	success: "#859900",
	error: "#dc322f",
	warning: "#b58900",
	info: "#268bd2",
	muted: "#586e75",
	accent: "#6c71c6",

	box: {
		border: "#586e75",
		title: "bold",
		arrow: "#859900",
		url: "#268bd2",
		hint: "#586e75",
		label: "#93a1a1",
		value: "#6c71c6",
	},

	spinner: {
		frame: "#6c71c6",
		success: "#859900",
		fail: "#dc322f",
		warn: "#b58900",
		info: "#268bd2",
	},

	progress: { bar: "#268bd2" },

	modal: {
		border: "#6c71c6",
		title: "bold",
		buttonPrimary: { fg: "#fdf6e3", bg: "#268bd2" },
		buttonSecondary: "#586e75",
	},

	tabs: {
		active: { fg: "#268bd2", bg: "#002b36" },
		inactive: "#586e75",
		border: "#586e75",
	},

	badge: {
		info: { fg: "#fdf6e3", bg: "#268bd2" },
		success: { fg: "#fdf6e3", bg: "#859900" },
		warning: { fg: "#002b36", bg: "#b58900" },
		error: { fg: "#fdf6e3", bg: "#dc322f" },
		neutral: { fg: "#fdf6e3", bg: "#586e75" },
	},

	section: { title: "bold", line: "#586e75" },

	markdown: {
		heading1: "#dc322f",
		heading2: "#cb4b16",
		heading3: "#b58900",
		heading4: "#859900",
		heading5: "#268bd2",
		heading6: "#6c71c4",
		codeBorder: "#586e75",
		codeLang: "#93a1a1",
		codeInline: { fg: "#2aa198", bg: "#073642" },
		linkText: "#268bd2",
		linkUrl: "#586e75",
		quoteBar: "#6c71c6",
		quoteText: "#93a1a1",
	},
};

// ---------------------------------------------------------------------------
// Catppuccin Mocha — https://github.com/catppuccin/catppuccin. Base
// #1e1e2e, mantle #181825, crust #11111b, text #cdd6f4, subtext1
// #bac2de, red #f38ba8, green #a6e3a1, yellow #f9e2af, blue #89b4fa,
// peach #fab387, mauve #cba6f7, teal #94e2d5.
// ---------------------------------------------------------------------------
const catppuccin: DuiThemePreset = {
	success: "#a6e3a1",
	error: "#f38ba8",
	warning: "#f9e2af",
	info: "#89b4fa",
	muted: "#6c7280",
	accent: "#cba6f7",

	box: {
		border: "#6c7280",
		title: "bold",
		arrow: "#a6e3a1",
		url: "#89b4fa",
		hint: "#6c7280",
		label: "#cdd6f4",
		value: "#cba6f7",
	},

	spinner: {
		frame: "#cba6f7",
		success: "#a6e3a1",
		fail: "#f38ba8",
		warn: "#f9e2af",
		info: "#89b4fa",
	},

	progress: { bar: "#cba6f7" },

	modal: {
		border: "#cba6f7",
		title: "bold",
		buttonPrimary: { fg: "#1e1e2e", bg: "#cba6f7" },
		buttonSecondary: "#6c7280",
	},

	tabs: {
		active: { fg: "#cba6f7", bg: "#1e1e2e" },
		inactive: "#6c7280",
		border: "#6c7280",
	},

	badge: {
		info: { fg: "#1e1e2e", bg: "#89b4fa" },
		success: { fg: "#1e1e2e", bg: "#a6e3a1" },
		warning: { fg: "#1e1e2e", bg: "#f9e2af" },
		error: { fg: "#1e1e2e", bg: "#f38ba8" },
		neutral: { fg: "#cdd6f4", bg: "#6c7280" },
	},

	section: { title: "bold", line: "#6c7280" },

	markdown: {
		heading1: "#f38ba8",
		heading2: "#fab387",
		heading3: "#f9e2af",
		heading4: "#a6e3a1",
		heading5: "#89b4fa",
		heading6: "#cba6f7",
		codeBorder: "#585b70",
		codeLang: "#7f849c",
		codeInline: { fg: "#a6e3a1", bg: "#313244" },
		linkText: "#89b4fa",
		linkUrl: "#7f849c",
		quoteBar: "#cba6f7",
		quoteText: "#7f849c",
	},
};

// ---------------------------------------------------------------------------
// Gruvbox dark — https://github.com/morhetz/gruvbox. Background grays
// #1d2021/#282828/#3c3836, foreground #ebdbb2, gray #928374. Bright
// accents: red #cc241d, green #98971a, yellow #d79921, blue #458588,
// purple #b16286, aqua #689d6a, orange #d65d0e.
// ---------------------------------------------------------------------------
const gruvbox: DuiThemePreset = {
	success: "#98971a",
	error: "#cc241d",
	warning: "#d79921",
	info: "#458588",
	muted: "#928374",
	accent: "#b16286",

	box: {
		border: "#928374",
		title: "bold",
		arrow: "#98971a",
		url: "#458588",
		hint: "#928374",
		label: "#ebdbb2",
		value: "#b16286",
	},

	spinner: {
		frame: "#d79921",
		success: "#98971a",
		fail: "#cc241d",
		warn: "#d79921",
		info: "#458588",
	},

	progress: { bar: "#d79921" },

	modal: {
		border: "#d79921",
		title: "bold",
		buttonPrimary: { fg: "#282828", bg: "#d79921" },
		buttonSecondary: "#928374",
	},

	tabs: {
		active: { fg: "#d79921", bg: "#282828" },
		inactive: "#928374",
		border: "#928374",
	},

	badge: {
		info: { fg: "#282828", bg: "#458588" },
		success: { fg: "#282828", bg: "#98971a" },
		warning: { fg: "#282828", bg: "#d79921" },
		error: { fg: "#fbf1c7", bg: "#cc241d" },
		neutral: { fg: "#ebdbb2", bg: "#928374" },
	},

	kbd: { text: "#ebdbb2", border: "#928374" },
	section: { title: "bold", line: "#928374" },

	markdown: {
		heading1: "#cc241d",
		heading2: "#d65d0e",
		heading3: "#d79921",
		heading4: "#98971a",
		heading5: "#458588",
		heading6: "#b16286",
		codeBorder: "#7c6f64",
		codeLang: "#a89984",
		codeInline: { fg: "#98971a", bg: "#3c3836" },
		linkText: "#458588",
		linkUrl: "#a89984",
		quoteBar: "#d79921",
		quoteText: "#a89984",
	},
};

/**
 * Resolved preset registry — frozen so consumers can't accidentally
 * mutate the shared palette definitions.
 */
export const presets: Readonly<Record<PresetName, DuiThemePreset>> = Object.freeze({
	dracula,
	nord,
	solarized,
	catppuccin,
	gruvbox,
});

/**
 * Accessibility shortcut — `configure({ plain: presets.plain })` forces
 * text-only output across all widgets. Equivalent to
 * `configure({ plain: true })`.
 *
 * @example
 * import { configure, presets } from "@bdocs/dui";
 * configure({ plain: presets.plain });
 */
export const plainPreset = true as const;
