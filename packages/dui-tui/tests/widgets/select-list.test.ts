import { describe, expect, it } from "vitest";
import { stripAnsi, visibleLength } from "@bdocs/dui";
import { SelectList } from "../../src/widgets/select-list";

const items = [
  { label: "Alpha", value: "a" },
  { label: "Beta", value: "b" },
  { label: "Gamma", value: "c" },
  { label: "Delta", value: "d" },
  { label: "Epsilon", value: "e" },
];

describe("SelectList", () => {
  it("renders items", () => {
    const list = new SelectList("list", { items });
    const result = list.render({ width: 30, height: 10, focused: false });
    expect(result).toContain("Alpha");
    expect(result).toContain("Beta");
    expect(result).toContain("Gamma");
  });

  it("shows selection indicator", () => {
    const list = new SelectList("list", { items });
    list.setFocused(true);
    const result = list.render({ width: 30, height: 10, focused: true });
    expect(result).toContain("▸");
  });

  it("navigates with arrow keys", () => {
    const list = new SelectList("list", { items });
    list.setFocused(true);
    list.handleInput({ key: "ArrowDown" });
    list.handleInput({ key: "ArrowDown" });
    const selected = list.getSelected();
    expect(selected?.label).toBe("Gamma");
  });

  it("navigates up", () => {
    const list = new SelectList("list", { items });
    list.setFocused(true);
    list.handleInput({ key: "ArrowDown" });
    list.handleInput({ key: "ArrowDown" });
    list.handleInput({ key: "ArrowUp" });
    expect(list.getSelected()?.label).toBe("Beta");
  });

  it("calls onSubmit on Enter", () => {
    let submitted: string | undefined;
    const list = new SelectList("list", {
      items,
      onSubmit: (item) => { submitted = item.value; },
    });
    list.setFocused(true);
    list.handleInput({ key: "ArrowDown" });
    list.handleInput({ key: "Enter" });
    expect(submitted).toBe("b");
  });

  it("calls onSelect on navigation", () => {
    let selected: string | undefined;
    const list = new SelectList("list", {
      items,
      onSelect: (item) => { selected = item.value; },
    });
    list.setFocused(true);
    list.handleInput({ key: "ArrowDown" });
    expect(selected).toBe("b");
  });

  it("jumps to Home", () => {
    const list = new SelectList("list", { items });
    list.setFocused(true);
    list.handleInput({ key: "ArrowDown" });
    list.handleInput({ key: "ArrowDown" });
    list.handleInput({ key: "Home" });
    expect(list.getSelected()?.label).toBe("Alpha");
  });

  it("jumps to End", () => {
    const list = new SelectList("list", { items });
    list.setFocused(true);
    list.handleInput({ key: "End" });
    expect(list.getSelected()?.label).toBe("Epsilon");
  });

  it("filters with /", () => {
    const list = new SelectList("list", { items });
    list.setFocused(true);
    list.handleInput({ key: "/" });
    list.handleInput({ key: "a", char: "a" });
    const result = list.render({ width: 30, height: 10, focused: true });
    // Should show items matching "a": Alpha, Gamma, Delta, Epsilon
    expect(result).toContain("Alpha");
    expect(result).toContain("🔍");
  });

  it("does not render when not visible", () => {
    const list = new SelectList("list", { items });
    list.setVisible(false);
    expect(list.render({ width: 30, height: 10, focused: false })).toBe("");
  });

  it("truncates a long selected label without breaking ANSI", () => {
    const long = new SelectList("list", {
      items: [{ label: "x".repeat(60), value: "a" }],
    });
    long.setFocused(true);
    const result = long.render({ width: 20, height: 10, focused: true });
    // Selected label uses an inverse-video escape — it must stay balanced.
    expect(result).toContain("\x1b[7m");
    expect(result).toContain("\x1b[27m");
    // The truncated label should be visually bounded by the width provided.
    for (const line of result.split("\n")) {
      if (!line.trim()) continue;
      expect(visibleLength(stripAnsi(line))).toBeLessThanOrEqual(20);
    }
  });

  it("scrolling keeps the selection visible within the rendered viewport", () => {
    const long = Array.from({ length: 40 }, (_, i) => ({
      label: `Item number ${i}`,
      value: String(i),
    }));
    const list = new SelectList("list", { items: long });
    list.setFocused(true);
    // First render fixes the viewport height, then navigate far past the screen.
    list.render({ width: 30, height: 6, focused: true });
    for (let i = 0; i < 40; i++) list.handleInput({ key: "ArrowDown" });
    const result = list.render({ width: 30, height: 6, focused: true });
    // The last item must be selected and visible on screen.
    expect(list.getSelected()?.label).toBe("Item number 39");
    expect(result).toContain("Item number 39");
    for (const line of result.split("\n")) {
      expect(visibleLength(stripAnsi(line))).toBeLessThanOrEqual(30);
    }
  });
});
