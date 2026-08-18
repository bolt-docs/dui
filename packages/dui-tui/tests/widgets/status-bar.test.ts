import { describe, expect, it } from "vitest";
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
});
