/**
 * Terminal capability detection for image rendering.
 *
 * Delegates to `getCapabilities()` from `@bdocs/dui` core so the
 * image plugin and the rest of DUI share one source of truth for
 * Kitty/Sixel/iTerm2 detection.
 *
 * Maintaining a separate file in dui-image preserves the public API
 * surface (`detectTerminal()`, `resetTerminalDetection()`,
 * `setTerminalCaps()`) that consumers already import.
 */

import {
	getCapabilities as getDuiCaps,
	hasKitty,
	refreshCapabilities,
	setCapabilities,
} from "@bdocs/dui";

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

function fromDui(): TerminalCapabilities {
	const core = getDuiCaps();
	let bestFormat: TerminalCapabilities["bestFormat"] = "ansi";
	if (core.kitty) bestFormat = "kitty";
	else if (core.sixel) bestFormat = "sixel";
	else if (core.iterm2) bestFormat = "iterm2";
	return {
		truecolor: core.truecolor,
		sixel: core.sixel,
		kitty: core.kitty,
		iterm2: core.iterm2,
		columns: core.columns,
		rows: core.rows,
		bestFormat,
	};
}

/**
 * Detect terminal capabilities.
 * Caches the result after first call.
 */
export function detectTerminal(): TerminalCapabilities {
	return fromDui();
}

/**
 * Reset the cached terminal capabilities (useful for testing).
 */
export function resetTerminalDetection(): void {
	refreshCapabilities();
}

/**
 * Override terminal capabilities (useful for testing).
 */
export function setTerminalCaps(caps: Partial<TerminalCapabilities>): void {
	setCapabilities(caps);
}
