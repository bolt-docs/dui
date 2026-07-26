import type { BundledLanguage } from "shiki";
import type { LanguageDef } from "./index";

export const rustDef: LanguageDef = {
	id: "rust",
	aliases: ["rs"],
	shikiLang: "rust" as BundledLanguage,
};
