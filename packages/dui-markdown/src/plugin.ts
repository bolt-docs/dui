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
	peerDependencies: { dui: "^0.5.0" },
	setup(api) {
		for (const [slot, defaultColor] of Object.entries(DEFAULTS)) {
			api.registerThemeSlot(slot, defaultColor);
		}

		api.registerRenderer("md", async (input) => {
			const output = await md(input);
			return output;
		});

		api.registerRenderHook("md", async (input, ctx) => {
			const output = await md(input);
			return output;
		});

		return () => {};
	},
};
