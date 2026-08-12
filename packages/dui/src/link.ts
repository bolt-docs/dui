/**
 * OSC 8 hyperlink emission.
 *
 * `@bdocs/dui` already probes terminal hyperlink support (see
 * `capabilities.ts` — `getCapabilities().hyperlinks`). This module is
 * the emission side: it wraps text in the OSC 8 sequence and falls
 * back to a readable `text (url)` form on terminals that don't
 * support clickable links, so callers never ship raw escape codes to
 * dumb terminals, log scrapers, or non-TTY output.
 *
 * @example
 * ```ts
 * import { link, linkify } from "@bdocs/dui"
 *
 * console.log(link("https://example.com", "Example"))
 * // → "\u001b]8;;https://example.com\u0007Example\u001b]8;;\u0007"   (when supported)
 * // → "Example (https://example.com)"                               (fallback)
 *
 * console.log(linkify("Visit https://example.com today"))
 * // → "Visit \u001b]8;;https://example.com\u0007https://example.com\u001b]8;;\u0007 today"
 * ```
 */

import { getCapabilities } from "./capabilities";

export interface LinkOptions {
	/**
	 * What to render when the terminal does NOT support OSC 8
	 * hyperlinks:
	 * - `"url"`  — render the URL instead of the text
	 * - `"both"` — render `text (url)`
	 * - `"text"` — render only the text (no URL at all)
	 *
	 * Defaults to `"both"`.
	 */
	fallback?: "url" | "both" | "text";
}

const OSC8 = "\u001b]8;;";
const OSC8_END = "\u001b]8;;\u0007";

/**
 * Wrap `text` in an OSC 8 hyperlink pointing at `url`.
 *
 * When the terminal reports hyperlink support, emits
 * `\u001b]8;;URL\u0007text\u001b]8;;\u0007`. Otherwise falls back
 * per `options.fallback` (default `"both"`: `text (url)`).
 *
 * @example
 * ```ts
 * console.log(link("https://example.com", "Example docs"))
 * ```
 */
export function link(url: string, text?: string, options?: LinkOptions): string {
	const label = text ?? url;
	if (!url) return label;

	const fallback = options?.fallback ?? "both";
	if (getCapabilities().hyperlinks) {
		return `${OSC8}${url}\u0007${label}${OSC8_END}`;
	}
	if (fallback === "url") return url;
	if (fallback === "both") return `${label} (${url})`;
	return label;
}

/** Alias of {@link link} with a more explicit name. */
export function hyperlink(url: string, text?: string, options?: LinkOptions): string {
	return link(url, text, options);
}

const URL_RE =
	/(https?:\/\/[^\s<>"']+)/g;

/**
 * Wrap every `http(s)://…` URL found in `text` in an OSC 8 link.
 *
 * The URL itself is used as both the target and the visible label,
 * so no text is lost when the terminal doesn't support hyperlinks.
 *
 * @example
 * ```ts
 * console.log(linkify("See https://example.com for details"))
 * ```
 */
export function linkify(text: string, options?: LinkOptions): string {
	const fallback = options?.fallback ?? "both";
	if (!getCapabilities().hyperlinks) {
		if (fallback === "text") return text;
		return text; // URL stays visible as plain text either way
	}
	return text.replace(URL_RE, (url) => `${OSC8}${url}\u0007${url}${OSC8_END}`);
}

/**
 * Convenience predicate: `true` when the terminal supports OSC 8
 * hyperlinks (delegates to `getCapabilities().hyperlinks`).
 */
export function supportsHyperlinks(): boolean {
	return getCapabilities().hyperlinks;
}
