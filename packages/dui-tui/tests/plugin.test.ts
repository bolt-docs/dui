import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tuiPlugin } from "../src/plugin";

const pkgVersion: string = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;

describe("tuiPlugin", () => {
  it("exposes plugin version matching package.json", () => {
    const pluginMajor = Number(
      (tuiPlugin.version ?? "0.0.0").split(".")[0],
    );
    const pkgMajor = Number(pkgVersion.split(".")[0]);
    expect(tuiPlugin.version).toBe(pkgVersion);
    expect(pluginMajor).toBe(pkgMajor);
  });

  it("has correct name and tags", () => {
    expect(tuiPlugin.name).toBe("@dui-toolkit/plugin-tui");
    expect(tuiPlugin.tags).toContain("tui");
    expect(tuiPlugin.tags).toContain("widget");
  });

  it("registers theme slots", () => {
    const slots: string[] = [];
    const api = {
      registerThemeSlot: (slot: string) => slots.push(slot),
      shared: { set: () => {} },
    };
    tuiPlugin.setup(api as never);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots).toContain("tui.focusRing");
  });
});
