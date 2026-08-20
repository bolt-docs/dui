import { describe, expect, it } from "vitest";
import { stripAnsi, visibleLength } from "@bdocs/dui";
import { StatusBar } from "../../src/widgets/status-bar";

describe("StatusBar", () => {
  it("renders left, center, right", () => {
    const bar = new StatusBar("bar", {
      left: "Ready",
      center: "index.ts",
      right: "Ln 42",
    });
    const result = bar.render({ width: 60, height: 1, focused: false });
    expect(result).toContain("Ready");
    expect(result).toContain("index.ts");
    expect(result).toContain("Ln 42");
  });

  it("renders sections", () => {
    const bar = new StatusBar("bar", {
      sections: [
        { text: "git:main", style: "info" },
        { text: "3 errors", style: "error" },
      ],
    });
    const result = bar.render({ width: 60, height: 1, focused: false });
    expect(result).toContain("git:main");
    expect(result).toContain("3 errors");
  });

  it("is not focusable", () => {
    const bar = new StatusBar("bar", { left: "test" });
    expect(bar.focusable).toBe(false);
  });

  it("does not handle input", () => {
    const bar = new StatusBar("bar", { left: "test" });
    const consumed = bar.handleInput({ key: "a" });
    expect(consumed).toBe(false);
  });

  it("update() changes text", () => {
    const bar = new StatusBar("bar", { left: "before" });
    bar.update({ left: "after" });
    const result = bar.render({ width: 60, height: 1, focused: false });
    expect(result).toContain("after");
    expect(result).not.toContain("before");
  });

  it("does not render when not visible", () => {
    const bar = new StatusBar("bar", { left: "test" });
    bar.setVisible(false);
    expect(bar.render({ width: 60, height: 1, focused: false })).toBe("");
  });

  it("truncates overflowing content to the bar width without breaking ANSI", () => {
    const bar = new StatusBar("bar", {
      left: "L".repeat(30),
      right: "R".repeat(30),
      sections: [{ text: "SEC".repeat(20), style: "error" }],
    });
    const result = bar.render({ width: 20, height: 1, focused: false });
    const barContent = result.split("\r").at(-1) ?? "";
    // The visible bar content must never exceed the requested width.
    expect(visibleLength(stripAnsi(barContent))).toBeLessThanOrEqual(20);
  });

  it("positions the right segment against the right edge", () => {
    const bar = new StatusBar("bar", { left: "left", right: "RGT" });
    const result = bar.render({ width: 40, height: 1, focused: false });
    const barContent = result.split("\r").at(-1) ?? "";
    // After stripping styling, the RGT text is the rightmost content.
    const plain = stripAnsi(barContent);
    // The RGT text is right-aligned: ignoring the trailing padding spaces,
    // it is the last visible content in the bar.
    expect(plain.trimEnd().endsWith("RGT")).toBe(true);
  });
});
