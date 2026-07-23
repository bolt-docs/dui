import type { DuiPlugin } from "@bdocs/dui";
import { md } from "./renderer";

const DEFAULTS: Record<string, string | { fg: string; bg: string }> = {
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

export const markdownPlugin: DuiPlugin = {
	name: "@dui-toolkit/plugin-markdown",
	version: "0.5.0",
	description:
		"Inline markdown renderer with themable headings, code blocks, lists, quotes and tables for DUI's terminal output.",
	tags: ["renderer", "markdown", "text", "content"],
	homepage: "https://github.com/bdocs/dui/tree/main/packages/dui-markdown",
	author: "DUI Toolkit",
	peerDependencies: { dui: "^0.5.0" },
	setup(api) {
		// Theme palette — registered up front so users can override any
		// `markdown.*` slot via `configure({ theme: { markdown: … } })`
		// without re-registering the plugin.
		for (const [slot, defaultColor] of Object.entries(DEFAULTS)) {
			api.registerThemeSlot(slot, defaultColor);
		}

		// Standalone renderer — usable through `renderWith("md", text)` or
		// `api.getRenderer("md")` so other plugins can compose markdown
		// output without re-implementing the pipeline.
		api.registerRenderer("md", async (input) => {
			return md(input);
		});

		// Render-time hook — feeds the markdown channel so any host UI can
		// pass user content through `runRenderHookAsync("md", text)` and
		// receive styled output. Hooks for the same channel chain in
		// priority order; with only one hook here, this is the seed.
		api.registerRenderHook(
			"md",
			async (input) => {
				return md(input);
			},
			{ priority: "first" },
		);

		// Surface whether the highlighter has been touched this session so
		// other plugins (e.g. a status dashboard) can tell `markdown` has
		// been used at least once. Pure side-info; consumers opt in via
		// `api.shared.set` themselves.
		api.shared.set("renderer", "md");

		return () => {
			// Markdown has no native cleanup — highlighter handles its own
			// GC. Keep the function so `unregisterPlugin` runs it.
		};
	},
};
