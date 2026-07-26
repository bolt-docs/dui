/**
 * Terminal capability detection for DUI.
 *
 * Probes the terminal emulator at runtime for supported features:
 * true color, hyperlinks, Kitty graphics, Sixel, iTerm2 protocol,
 * Unicode width, SGR mouse, cursor shapes, and color depth.
 *
 * Results are cached after the first call. Use `refreshCapabilities()`
 * to force re-detection (e.g. after a terminal resize or protocol
 * change).
 *
 * @example
 * ```ts
 * import { getCapabilities, refreshCapabilities } from "@bdocs/dui"
 *
 * const caps = getCapabilities()
 * if (caps.truecolor) {
 *   console.log("24-bit color supported 🎨")
 * }
 * if (caps.hyperlinks) {
 *   console.log("Clickable links supported 🔗")
 * }
 * ```
 */

/* ── Public types ────────────────────────────────────────────── */

export interface TerminalCapabilities {
	/** Whether 24-bit true color is supported (COLORTERM=truecolor/24bit). */
	truecolor: boolean;
	/**
	 * Whether the terminal supports OSC 8 hyperlinks
	 * (\x1b]8;;URL\x07text\x1b]8;;\x07).
	 */
	hyperlinks: boolean;
	/** Whether Kitty graphics protocol is supported (TERM=kitty*). */
	kitty: boolean;
	/** Whether Sixel graphics protocol is supported. */
	sixel: boolean;
	/** Whether iTerm2 inline images protocol is supported. */
	iterm2: boolean;
	/** Whether SGR mouse tracking (1006) is supported. */
	sgrMouse: boolean;
	/**
	 * Maximum supported color depth.
	 * - `1`  = monochrome (NO_COLOR or no TTY)
	 * - `16` = 4-bit ANSI colors
	 * - `256` = 8-bit 256-color palette
	 * - `16777216` = 24-bit true color
	 */
	colorDepth: 1 | 16 | 256 | 16777216;
	/**
	 * Whether the terminal emulator is known to support variable-width
	 * Unicode (East Asian Width). When `false`, CJK characters may not
	 * render correctly.
	 */
	eastAsianWidth: boolean;
	/**
	 * Terminal width in columns. Falls back to 80.
	 */
	columns: number;
	/**
	 * Terminal height in rows. Falls back to 24.
	 */
	rows: number;
	/**
	 * Best available image format for the current terminal.
	 * Falls back to `"ansi"` when no native protocol is detected.
	 */
	bestImageFormat: "kitty" | "sixel" | "iterm2" | "ansi";
	/**
	 * Terminal emulator identifier (e.g. "kitty", "iterm2", "xterm-256color").
	 * Raw value from `TERM_PROGRAM` or `TERM` env var.
	 */
	terminal: string;
	/**
	 * Whether the terminal supports cursor shape escape sequences
	 * (\x1b[0 q through \x1b[6 q for blinking/normal block/bar/underline).
	 * Should be true for most modern terminals; false for `screen`/`tmux`
	 * in some configurations.
	 */
	cursorShape: boolean;
	/**
	 * Whether the terminal supports bracketed paste mode
	 * (\x1b[?2004h / \x1b[?2004l).
	 */
	bracketedPaste: boolean;
	/**
	 * Whether the terminal is running inside `tmux`.
	 * Detected via `$TERM` containing `"tmux"` or `$TMUX` being set.
	 */
	tmux: boolean;
	/**
	 * Whether the terminal is running inside GNU `screen`.
	 * Detected via `$TERM` containing `"screen"`.
	 */
	screen: boolean;
}

/* ── Cached state ────────────────────────────────────────────── */

let cached: TerminalCapabilities | null = null;

/* ─── Helpers ─────────────────────────────────────────────────── */

/**
 * Safely read an environment variable, returning `undefined` when
 * the Node.js `process.env` is unavailable (edge runtimes, etc.).
 */
function env(name: string): string | undefined {
	if (typeof process === "undefined" || typeof process.env === "undefined") {
		return undefined;
	}
	return process.env[name];
}

/**
 * Read `TERM_PROGRAM`, then `TERM`, lowercased and trimmed.
 */
function termProgram(): string {
	return (env("TERM_PROGRAM") ?? env("TERM") ?? "").toLowerCase().trim();
}

/**
 * Best-effort probe for OSC 8 hyperlink support.
 *
 * We check three things:
 * 1. The `TERM_PROGRAM` is a known hyperlink-capable emulator.
 * 2. `KONSOLE_VERSION` is set (Konsole ≥ 5.23 supports hyperlinks).
 * 3. The user hasn't opted out via `DUI_NO_HYPERLINKS`.
 *
 * A proper runtime probe would write `\x1b]8;;\x07\x1b]8;;\x07` and
 * check if the cursor advanced (terminals that don't support OSC 8
 * typically print garbage and advance), but that's invasive. We use
 * the env-based heuristic instead.
 */
function probeHyperlinks(): boolean {
	if (env("DUI_NO_HYPERLINKS") !== undefined) return false;

	const term = termProgram();
	const knownGood: string[] = [
		"kitty",
		"iterm",
		"iterm2",
		"wezterm",
		"hyper",
		"alacritty",
		"foot",
		"ghostty",
		"rio",
		"contour",
		"warp",
	];
	if (knownGood.some((name) => term.includes(name))) return true;

	// Konsole ≥ 5.23
	const konsoleVer = env("KONSOLE_VERSION");
	if (konsoleVer && Number.parseInt(konsoleVer, 10) >= 52300) return true;

	// Windows Terminal always supports hyperlinks
	if (term.includes("windows terminal") || term.includes("wt")) return true;

	return false;
}

/**
 * Detect whether the terminal supports SGR mouse (1006) vs the older
 * X10 / UTF-8 / SGR protocols. Modern terminals all support 1006;
 * we assume true unless we can identify a legacy environment.
 */
function probeSGRMouse(): boolean {
	const term = termProgram();
	if (term.includes("linux") || term.includes("vt100") || term.includes("xterm-16color")) {
		return false;
	}
	return true;
}

/**
 * Probe the color depth from the environment:
 * 1. `NO_COLOR` → depth 1 (monochrome)
 * 2. `COLORTERM=truecolor` / `24bit` → 24-bit
 * 3. `TERM=xterm-256color` or similar → 256
 * 4. Otherwise defaults to 16 (safe baseline)
 */
function probeColorDepth(): TerminalCapabilities["colorDepth"] {
	if (env("NO_COLOR") !== undefined) return 1;

	const ct = (env("COLORTERM") ?? "").toLowerCase();
	if (ct === "truecolor" || ct === "24bit") return 16777216;

	const term = env("TERM") ?? "";
	if (term.includes("256color") || term.includes("256")) return 256;
	if (term.includes("color") || term.includes("xterm") || term.includes("rxvt")) return 16;

	// Modern terminals that default to true color
	const tp = termProgram();
	const trueColorTerms = ["kitty", "alacritty", "foot", "ghostty", "wezterm", "contour"];
	if (trueColorTerms.some((t) => tp.includes(t))) return 16777216;

	return 16;
}

/**
 * East Asian Width detection via `LC_CTYPE` / `LANG` env vars.
 */
function probeEastAsianWidth(): boolean {
	const locale = env("LC_CTYPE") ?? env("LANG") ?? "";
	return locale.includes("zh") || locale.includes("ja") || locale.includes("ko");
}

/**
 * Best-image-format detection.
 */
function probeBestImageFormat(
	term: string,
	kitty: boolean,
	sixel: boolean,
	iterm2: boolean,
): TerminalCapabilities["bestImageFormat"] {
	if (kitty) return "kitty";
	if (sixel) return "sixel";
	if (iterm2) return "iterm2";
	return "ansi";
}

/* ── Public API ──────────────────────────────────────────────── */

/**
 * Detect and return terminal capabilities.
 *
 * Results are cached after the first call. Call `refreshCapabilities()`
 * to force re-detection.
 */
export function getCapabilities(): TerminalCapabilities {
	if (cached !== null) return cached;

	const term = termProgram();
	const columns = (typeof process !== "undefined" && process.stdout?.columns) || 80;
	const rows = (typeof process !== "undefined" && process.stdout?.rows) || 24;

	const truecolor = probeColorDepth() === 16777216;
	const kitty = term.includes("kitty");
	const iterm2 = term.includes("iterm");
	const sixel =
		(env("TERM_PROGRAM_VERSION") !== undefined && term.includes("wezterm")) ||
		term.includes("sixel") ||
		term.includes("mlterm");

	cached = {
		truecolor,
		hyperlinks: probeHyperlinks(),
		kitty,
		sixel,
		iterm2,
		sgrMouse: probeSGRMouse(),
		colorDepth: probeColorDepth(),
		eastAsianWidth: probeEastAsianWidth(),
		columns,
		rows,
		bestImageFormat: probeBestImageFormat(term, kitty, sixel, iterm2),
		terminal: term,
		cursorShape: true,
		bracketedPaste: true,
		tmux: (env("TERM") ?? "").includes("tmux") || env("TMUX") !== undefined,
		screen: (env("TERM") ?? "").includes("screen"),
	};

	return cached;
}

/**
 * Force re-detection of terminal capabilities on the next
 * `getCapabilities()` call.
 *
 * Useful after a terminal resize event or when the user toggles
 * `NO_COLOR` mid-session.
 */
export function refreshCapabilities(): void {
	cached = null;
}

/**
 * Override terminal capabilities (useful for testing).
 *
 * Pass a partial `TerminalCapabilities` object — only the provided
 * fields are overwritten; the rest retain their detected values.
 *
 * @example
 * ```ts
 * setCapabilities({ truecolor: false, colorDepth: 16 })
 * ```
 */
export function setCapabilities(
	overrides: Partial<TerminalCapabilities>,
): TerminalCapabilities {
	const base = cached ?? getCapabilities();
	cached = { ...base, ...overrides };
	return cached;
}

/**
 * Convenience predicate: returns `true` when the terminal supports
 * 24-bit true color.
 *
 * ```ts
 * if (hasTrueColor()) { /* use #ff6600 * / }
 * ```
 */
export function hasTrueColor(): boolean {
	return getCapabilities().truecolor;
}

/**
 * Convenience predicate: returns `true` when the terminal supports
 * OSC 8 hyperlinks.
 */
export function hasHyperlinks(): boolean {
	return getCapabilities().hyperlinks;
}

/**
 * Convenience predicate: returns `true` when the terminal supports
 * Kitty graphics protocol.
 */
export function hasKitty(): boolean {
	return getCapabilities().kitty;
}

/**
 * Return the terminal's maximum color depth as a human-readable string.
 *
 * @example
 * ```ts
 * console.log(colorDepthLabel()) // "24-bit" | "256-color" | "16-color" | "monochrome"
 * ```
 */
export function colorDepthLabel(): string {
	const d = getCapabilities().colorDepth;
	if (d === 16777216) return "24-bit";
	if (d === 256) return "256-color";
	if (d === 16) return "16-color";
	return "monochrome";
}
