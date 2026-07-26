import type { BundledLanguage } from "shiki";
import type { LanguageDef } from "./index";

export const elixirDef: LanguageDef = {
	id: "elixir",
	aliases: ["ex", "exs"],
	shikiLang: "elixir" as BundledLanguage,
};
