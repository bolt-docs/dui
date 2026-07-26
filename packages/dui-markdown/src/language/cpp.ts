import type { BundledLanguage } from "shiki";
import type { LanguageDef } from "./index";

export const cppDef: LanguageDef = {
	id: "cpp",
	aliases: ["c++", "cxx", "cc"],
	shikiLang: "cpp" as BundledLanguage,
};
