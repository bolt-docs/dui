import { describe, expect, it } from "vitest";
import { TextInput } from "../../src/widgets/text-input";

describe("TextInput", () => {
  it("renders with placeholder when empty", () => {
    const input = new TextInput("name", { placeholder: "Enter name..." });
    const result = input.render({ width: 30, height: 3, focused: false });
    expect(result).toContain("Enter name...");
    expect(result).toContain("┌");
    expect(result).toContain("┘");
  });

  it("renders value when set", () => {
    const input = new TextInput("name");
    input.setValue("hello");
    const result = input.render({ width: 30, height: 3, focused: false });
    expect(result).toContain("hello");
  });

  it("shows cursor when focused", () => {
    const input = new TextInput("name");
    input.setValue("hi");
    input.setFocused(true);
    const result = input.render({ width: 30, height: 3, focused: true });
    // Cursor is rendered with inverse (\x1b[7m)
    expect(result).toContain("\x1b[7m");
  });

  it("handles character input", () => {
    const input = new TextInput("name");
    input.setFocused(true);
    const consumed = input.handleInput({ key: "a", char: "a" });
    expect(consumed).toBe(true);
    expect(input.getValue()).toBe("a");
  });

  it("handles backspace", () => {
    const input = new TextInput("name");
    input.setValue("abc");
    input.setFocused(true);
    input.handleInput({ key: "Backspace" });
    expect(input.getValue()).toBe("ab");
  });

  it("handles arrow keys", () => {
    const input = new TextInput("name");
    input.setValue("abc");
    input.setFocused(true);
    input.handleInput({ key: "ArrowLeft" }); // cursor at 2
    input.handleInput({ key: "ArrowLeft" }); // cursor at 1
    input.handleInput({ key: "x", char: "x" }); // insert at 1
    expect(input.getValue()).toBe("axbc");
  });

  it("respects maxLength", () => {
    const input = new TextInput("name", { maxLength: 3 });
    input.setValue("abcdef");
    expect(input.getValue()).toBe("abc");
  });

  it("does not accept input when readOnly", () => {
    const input = new TextInput("name", { readOnly: true });
    input.setFocused(true);
    const consumed = input.handleInput({ key: "a", char: "a" });
    expect(consumed).toBe(false);
    expect(input.getValue()).toBe("");
  });

  it("masks value for password fields", () => {
    const input = new TextInput("pass", { mask: "•" });
    input.setValue("secret");
    const result = input.render({ width: 30, height: 3, focused: false });
    expect(result).toContain("••••••");
    expect(result).not.toContain("secret");
  });

  it("calls onSubmit on Enter", () => {
    let submitted = "";
    const input = new TextInput("name", {
      onSubmit: (v) => { submitted = v; },
    });
    input.setValue("test");
    input.setFocused(true);
    input.handleInput({ key: "Enter" });
    expect(submitted).toBe("test");
  });

  it("calls onChange on value change", () => {
    let changed = "";
    const input = new TextInput("name", {
      onChange: (v) => { changed = v; },
    });
    input.setFocused(true);
    input.handleInput({ key: "a", char: "a" });
    expect(changed).toBe("a");
  });

  it("handles Ctrl+U to clear", () => {
    const input = new TextInput("name");
    input.setValue("hello");
    input.setFocused(true);
    input.handleInput({ key: "u", ctrl: true });
    expect(input.getValue()).toBe("");
  });

  it("does not render when not visible", () => {
    const input = new TextInput("name");
    input.setVisible(false);
    expect(input.render({ width: 30, height: 3, focused: false })).toBe("");
  });
});
