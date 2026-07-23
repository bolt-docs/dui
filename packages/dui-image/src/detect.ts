/**
 * Terminal capability detection for image rendering.
 */

export interface TerminalCapabilities {
	/** Whether truecolor (24-bit) is supported */
	truecolor: boolean;
	/** Whether Sixel graphics protocol is supported */
	sixel: boolean;
	/** Whether Kitty graphics protocol is supported */
	kitty: boolean;
	/** Whether iTerm2 graphics protocol is supported */
	iterm2: boolean;
	/** Terminal width in columns */
	columns: number;
	/** Terminal height in rows */
	rows: number;
	/** Best available image format */
	bestFormat: "sixel" | "kitty" | "iterm2" | "ansi";
}

let cachedCaps: TerminalCapabilities | null = null;

function hasEnvFlag(name: string): boolean {
	return (
		typeof process !== "undefined" &&
		typeof process.env !== "undefined" &&
		process.env[name] !== undefined &&
		process.env[name] !== ""
	);
}

function getTermProgram(): string {
	if (typeof process === "undefined" || typeof process.env === "undefined") {
		return "";
	}
	return (
		process.env.TERM_PROGRAM ||
		process.env.TERM ||
		process.env.COLORTERM ||
		""
	).toLowerCase();
}

/**
 * Detect terminal capabilities.
 * Caches the result after first call.
 */
export function detectTerminal(): TerminalCapabilities {
	if (cachedCaps) return cachedCaps;

	const term = getTermProgram();
	const columns =
		(typeof process !== "undefined" && process.stdout?.columns) || 80;
	const rows = (typeof process !== "undefined" && process.stdout?.rows) || 24;

	const colorterm = process.env.COLORTERM?.toLowerCase() ?? "";
	const truecolor = colorterm === "truecolor" || colorterm === "24bit";

	// Sixel detection: WezTerm sets TERM_PROGRAM=WezTerm + TERM_PROGRAM_VERSION
	const sixel = hasEnvFlag("TERM_PROGRAM_VERSION") && term.includes("wezterm");
	const kitty = term.includes("kitty");
	const iterm2 = term.includes("iterm");

	let bestFormat: TerminalCapabilities["bestFormat"] = "ansi";
	if (kitty) bestFormat = "kitty";
	else if (sixel) bestFormat = "sixel";
	else if (iterm2) bestFormat = "iterm2";

	cachedCaps = { truecolor, sixel, kitty, iterm2, columns, rows, bestFormat };
	return cachedCaps;
}

/**
 * Reset the cached terminal capabilities (useful for testing).
 */
export function resetTerminalDetection(): void {
	cachedCaps = null;
}

/**
 * Override terminal capabilities (useful for testing).
 */
export function setTerminalCaps(caps: Partial<TerminalCapabilities>): void {
	cachedCaps = { ...detectTerminal(), ...caps };
}
