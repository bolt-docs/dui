/**
 * Clipboard integration via the OSC 52 terminal sequence.
 *
 * OSC 52 lets a terminal application write to the system clipboard
 * (`\u001b]52;c;<base64>\u0007`). It works on kitty, iTerm2,
 * WezTerm, Windows Terminal, and modern xterm derivatives; terminals
 * that don't support it simply ignore the sequence, so the write is
 * always safe to emit on a TTY. On non-TTY output (pipes, CI) the
 * call is a no-op that returns `false` so callers can branch on it.
 *
 * @example
 * ```ts
 * import { copyToClipboard } from "@bdocs/dui"
 *
 * if (copyToClipboard("pnpm add @bdocs/dui")) {
 *   console.log("Copied!")
 * } else {
 *   console.log("Clipboard unavailable (non-TTY or unsupported)")
 * }
 * ```
 */

const OSC52 = "\u001b]52;c;";
const ST = "\u0007"; // BEL-terminated OSC (broadest compatibility)

/**
 * Write `text` to the system clipboard through OSC 52.
 *
 * Returns `true` when the sequence was actually written to a TTY
 * stream, `false` otherwise (non-TTY output, or no stream available).
 * Terminals that don't support OSC 52 silently ignore the sequence,
 * so `true` does not guarantee the clipboard changed — it only means
 * the write was attempted.
 */
export function copyToClipboard(
	text: string,
	options?: { stream?: NodeJS.WriteStream },
): boolean {
	const stream = options?.stream ?? (typeof process !== "undefined" ? process.stdout : undefined);
	if (!stream || !stream.isTTY) return false;
	if (text.length === 0) return false;

	const base64 =
		typeof Buffer !== "undefined"
			? Buffer.from(text, "utf8").toString("base64")
			: btoa(unescape(encodeURIComponent(text)));

	stream.write(`${OSC52}${base64}${ST}`);
	return true;
}

/**
 * Whether a clipboard write can even be attempted: requires a TTY
 * stdout. OSC 52 support itself isn't probed — unsupported terminals
 * ignore the sequence harmlessly.
 */
export function clipboardSupported(): boolean {
	const stream = typeof process !== "undefined" ? process.stdout : undefined;
	return !!stream?.isTTY;
}

/** Alias of {@link copyToClipboard} for ergonomic call sites. */
export function copy(text: string, options?: { stream?: NodeJS.WriteStream }): boolean {
	return copyToClipboard(text, options);
}
