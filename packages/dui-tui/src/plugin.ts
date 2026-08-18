/**
 * @dui-toolkit/plugin-tui — DuiPlugin definition.
 */

import { readFileSync } from "node:fs";
import type { DuiPlugin } from "@bdocs/dui";

const pkgVersion: string = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;

const DEFAULTS: Record<string, string> = {
  "tui.focusRing": "#58a6ff",
  "tui.border": "#646478",
  "tui.borderFocused": "#58a6ff",
  "tui.placeholder": "#8b949e",
  "tui.selected": "#58a6ff",
  "tui.selectedBg": "#1a1a2e",
  "tui.disabled": "#484848",
  "tui.modalBackdrop": "#000000",
  "tui.statusBarBg": "#282830",
  "tui.statusBarFg": "#e0e0e0",
};

export const tuiPlugin: DuiPlugin = {
  name: "@dui-toolkit/plugin-tui",
  version: pkgVersion,
  description:
    "TUI widget toolkit — text inputs, select lists, modals, status bars for @bdocs/dui.",
  tags: ["tui", "widget", "input", "modal"],
  homepage: "https://github.com/bdocs/dui/tree/main/packages/dui-tui",
  author: "DUI Toolkit",
  peerDependencies: { dui: "^0.6.0" },
  setup(api) {
    for (const [slot, defaultColor] of Object.entries(DEFAULTS)) {
      api.registerThemeSlot(slot, defaultColor);
    }
    api.shared.set("renderer", "tui");
    return () => {};
  },
};
