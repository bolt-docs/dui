import { type DuiPlugin } from "@bdocs/dui";

export const markdownPlugin: DuiPlugin = {
	name: "markdown",
	setup(api) {
		api.on("configure", (_config) => {
			// future: read markdown theme slots
		});
	},
};

export { md, mdRender } from "./renderer";
export { mdSyntax, hexToAnsi } from "./syntax";
export { tokenize } from "./tokenizer";
export { createLanguage, getLanguage, getLanguages } from "./language";
export type { LanguageDef } from "./language";
