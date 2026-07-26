import type { BundledLanguage } from "shiki";
import type { LanguageDef } from "./index";

export const rubyDef: LanguageDef = {
	id: "ruby",
	aliases: ["rb"],
	shikiLang: "ruby" as BundledLanguage,
};
