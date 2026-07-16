/**
 * Plugin integration for `@dui-toolkit/plugin-markdown`.
 *
 * Registers the markdown renderer with DUI's plugin lifecycle. After
 * calling `usePlugin(markdownPlugin)` (typically once at app boot),
 * `configure({ theme: { markdown: … } })` is reflected automatically on
 * the next `md()` / `mdRender()` call — every renderer reads
 * `getConfig().theme` at render time via `resolveColor`, so theme
 * changes never require re-registering this plugin.
 *
 * Example:
 *
 *   import { configure, usePlugin } from "@bdocs/dui";
 *   import { markdownPlugin, md } from "@dui-toolkit/plugin-markdown";
 *
 *   usePlugin(markdownPlugin);
 *   configure({
 *     theme: {
 *       markdown: {
 *         heading1: "#ff5252",
 *         linkText: { fg: "#58a6ff", bg: "#0d1117" },
 *         codeInline: "#a5d6ff",
 *       },
 *     },
 *   });
 *
 *   console.log(await md("# Hello"));
 */

import type { DuiPlugin } from "@bdocs/dui";

export const markdownPlugin: DuiPlugin = {
	name: "markdown",
	setup(api) {
		// Theme changes are picked up dynamically by the renderer via
		// `resolveColor(slot, getConfig().theme)`; no hot-reload needed.
		// Hook retained to mirror `DuiPlugin` lifecycle semantics — remove
		// if a future requirement makes it actively useful.
		api.on("configure", () => {});
	},
};

export { md, mdRender } from "./renderer";
export { mdSyntax, hexToAnsi } from "./syntax";
export { tokenize } from "./tokenizer";
export { createLanguage, getLanguage, getLanguages } from "./language";
export type { LanguageDef } from "./language";
