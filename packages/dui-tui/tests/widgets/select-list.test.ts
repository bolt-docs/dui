import { describe, expect, it } from "vitest";
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
});
