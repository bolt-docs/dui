import type { BundledLanguage } from "shiki"
import { typescriptDef, javascriptDef } from "./typescript"
import { pythonDef } from "./python"
import { bashDef } from "./bash"
import { cssDef } from "./css"
import { yamlDef } from "./yaml"
import { jsonDef } from "./json"
import { htmlDef } from "./html"

export interface LanguageDef {
  id: string
  aliases: string[]
  shikiLang: BundledLanguage
}

const registry = new Map<string, LanguageDef>()
const langList: LanguageDef[] = []

export function createLanguage(def: LanguageDef): void {
  for (const alias of [def.id, ...def.aliases]) {
    registry.set(alias.toLowerCase(), def)
  }
  langList.push(def)
}

export function getLanguage(lang?: string): LanguageDef | undefined {
  if (!lang) return undefined
  return registry.get(lang.toLowerCase())
}

export function getLanguages(): LanguageDef[] {
  return langList
}

const builtins = [
  typescriptDef, javascriptDef, pythonDef, bashDef,
  cssDef, yamlDef, jsonDef, htmlDef,
]

for (const def of builtins) {
  createLanguage(def)
}
