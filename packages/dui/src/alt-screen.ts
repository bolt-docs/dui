/**
 * Alternate screen buffer management.
 *
 * Full-screen TUIs (editors, pickers, pagers) swap into the terminal's
 * alternate screen (`\u001b[?1049h`), paint over it, and swap back on
 * exit (`\u001b[?1049l`) so the user's scrollback and shell prompt are
 * preserved. This module provides the raw sequences plus a
 * `withAltScreen()` helper that guarantees the swap-back and cursor
 * restore even when the body throws.
 *
 * @example
 * ```ts
 * import { withAltScreen, RenderSurface } from "@bdocs/dui"
 *
 * await withAltScreen(() => {
 *   const surface = new RenderSurface()
 *   // paint full-screen content...
 *   return new Promise((resolve) => setTimeout(resolve, 3000))
 * })
 * // terminal restored to the normal buffer
 * ```
 */

function defaultStream(): NodeJS.WriteStream | undefined {
	return typeof process !== "undefined" ? process.stdout : undefined;
}

function resolveStream(stream?: NodeJS.WriteStream): NodeJS.WriteStream | undefined {
	return stream ?? defaultStream();
}

/** Hide the terminal cursor (`\u001b[?25l`). */
export function hideCursor(stream?: NodeJS.WriteStream): void {
	const s = resolveStream(stream);
	if (s) s.write("\u001b[?25l");
}

/** Show the terminal cursor (`\u001b[?25h`). */
export function showCursor(stream?: NodeJS.WriteStream): void {
	const s = resolveStream(stream);
	if (s) s.write("\u001b[?25h");
}

/**
 * Save the cursor position (`\u001b[s`). Works on virtually every
 * terminal; prefer this over DECSC/`\u001b7` which tmux mishandles.
 */
export function saveCursor(stream?: NodeJS.WriteStream): void {
	const s = resolveStream(stream);
	if (s) s.write("\u001b[s");
}

/** Restore the cursor position (`\u001b[u`). */
export function restoreCursor(stream?: NodeJS.WriteStream): void {
	const s = resolveStream(stream);
	if (s) s.write("\u001b[u");
}

/**
 * Switch into the alternate screen buffer and hide the cursor.
 * Returns `false` (and writes nothing) when there is no TTY stdout.
 */
export function enterAltScreen(stream?: NodeJS.WriteStream): boolean {
	const s = resolveStream(stream);
	if (!s || !s.isTTY) return false;
	s.write("\u001b[?1049h\u001b[?25l");
	return true;
}

/**
 * Leave the alternate screen buffer and restore the cursor.
 */
export function exitAltScreen(stream?: NodeJS.WriteStream): boolean {
	const s = resolveStream(stream);
	if (!s || !s.isTTY) return false;
	s.write("\u001b[?25h\u001b[?1049l");
	return true;
}

/**
 * Run `fn` inside the alternate screen buffer, always swapping back
 * (and restoring the cursor) afterwards, even on error.
 *
 * @example
 * ```ts
 * const picked = await withAltScreen(async () => {
 *   // ... full-screen UI ...
 *   return result
 * })
 * ```
 */
export async function withAltScreen<T>(
	fn: () => Promise<T> | T,
	options?: { stream?: NodeJS.WriteStream },
): Promise<T> {
	const stream = options?.stream ?? defaultStream();
	const entered = stream ? enterAltScreen(stream) : false;
	try {
		return await fn();
	} finally {
		if (entered && stream) exitAltScreen(stream);
	}
}
