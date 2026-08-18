import { describe, expect, it } from "vitest";
import { Modal } from "../../src/widgets/modal";

describe("Modal", () => {
  it("renders title and content", () => {
    const modal = new Modal("confirm", {
      title: "Delete file?",
      content: "This action cannot be undone.",
    });
    const result = modal.render({ width: 60, height: 20, focused: true });
    expect(result).toContain("Delete file?");
    expect(result).toContain("This action cannot be undone.");
  });

  it("renders default actions", () => {
    const modal = new Modal("confirm", {
      title: "Confirm",
      content: "Are you sure?",
    });
    const result = modal.render({ width: 60, height: 20, focused: true });
    expect(result).toContain("OK");
    expect(result).toContain("Cancel");
  });

  it("renders custom actions", () => {
    const modal = new Modal("confirm", {
      title: "Confirm",
      content: "Proceed?",
      actions: ["Yes", "No", "Maybe"],
    });
    const result = modal.render({ width: 60, height: 20, focused: true });
    expect(result).toContain("Yes");
    expect(result).toContain("No");
    expect(result).toContain("Maybe");
  });

  it("navigates actions with arrow keys", () => {
    const modal = new Modal("confirm", {
      title: "Confirm",
      content: "Proceed?",
      actions: ["Yes", "No"],
    });
    modal.setFocused(true);
    modal.handleInput({ key: "ArrowRight" });
    const result = modal.render({ width: 60, height: 20, focused: true });
    // "No" should be selected (inverse)
    expect(result).toContain("\x1b[7m");
  });

  it("calls onAction on Enter", () => {
    let action: string | undefined;
    const modal = new Modal("confirm", {
      title: "Confirm",
      content: "Proceed?",
      actions: ["Yes", "No"],
      onAction: (a) => { action = a.value; },
    });
    modal.setFocused(true);
    modal.handleInput({ key: "ArrowRight" });
    modal.handleInput({ key: "Enter" });
    expect(action).toBe("no");
  });

  it("calls onCancel on Escape", () => {
    let cancelled = false;
    const modal = new Modal("confirm", {
      title: "Confirm",
      content: "Proceed?",
      onCancel: () => { cancelled = true; },
    });
    modal.setFocused(true);
    modal.handleInput({ key: "Escape" });
    expect(cancelled).toBe(true);
  });

  it("does not render when not visible", () => {
    const modal = new Modal("confirm", {
      title: "Confirm",
      content: "Proceed?",
    });
    modal.setVisible(false);
    expect(modal.render({ width: 60, height: 20, focused: true })).toBe("");
  });
});
