import type { BundledLanguage } from "shiki";
import type { LanguageDef } from "./index";

export const goDef: LanguageDef = {
	id: "go",
	aliases: ["golang"],
	shikiLang: "go" as BundledLanguage,
};
