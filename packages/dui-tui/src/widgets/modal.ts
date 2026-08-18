/**
 * Modal widget — overlay dialog with backdrop and action buttons.
 *
 * Features:
 *   - Title bar
 *   - Content area (text or child widget)
 *   - Action buttons (OK, Cancel, custom)
 *   - Backdrop dimming
 *   - Focus trapping
 *
 * @example
 * ```ts
 * const modal = new Modal("confirm", {
 *   title: "Delete file?",
 *   content: "This action cannot be undone.",
 *   actions: ["Delete", "Cancel"],
 * });
 * ```
 */

import { stripAnsi, visibleLength } from "@bdocs/dui";
import { BaseWidget, type WidgetRenderOptions, type WidgetInputEvent } from "../widget";

// ── Types ──────────────────────────────────────────────────────

export interface ModalAction {
  label: string;
  value: string;
  /** Whether this is the primary (highlighted) action. */
  primary?: boolean;
}

export interface ModalData {
  title: string;
  content: string;
  actions: ModalAction[];
  selectedAction: number;
  /** Callback when an action is selected. */
  onAction?: (action: ModalAction) => void;
  /** Callback when Escape is pressed. */
  onCancel?: () => void;
}

export interface ModalOptions {
  title: string;
  content: string;
  actions?: Array<string | ModalAction>;
  onAction?: (action: ModalAction) => void;
  onCancel?: () => void;
}

// ── Widget ─────────────────────────────────────────────────────

export class Modal extends BaseWidget<ModalData> {
  constructor(id: string, opts: ModalOptions) {
    const actions: ModalAction[] = (opts.actions ?? ["OK", "Cancel"]).map(
      (a) =>
        typeof a === "string"
          ? { label: a, value: a.toLowerCase(), primary: a === "OK" }
          : a,
    );

    super(id, "modal", {
      title: opts.title,
      content: opts.content,
      actions,
      selectedAction: 0,
      onAction: opts.onAction,
      onCancel: opts.onCancel,
    });

    // Set primary action as selected.
    const primaryIdx = actions.findIndex((a) => a.primary);
    if (primaryIdx >= 0) this.data.selectedAction = primaryIdx;
  }

  render(opts: WidgetRenderOptions): string {
    if (!this.visible) return "";

    const { width, height } = opts;
    const { title, content, actions, selectedAction } = this.data;
    const isFocused = this.focused;

    // Modal dimensions (centered).
    const modalWidth = Math.min(width - 4, 60);
    const modalHeight = Math.min(height - 4, 20);
    const padding = 2;

    const lines: string[] = [];

    // Backdrop (dimmed lines above modal).
    const backdropLines = Math.max(0, Math.floor((height - modalHeight) / 2));
    for (let i = 0; i < backdropLines; i++) {
      lines.push("");
    }

    // Title.
    const titlePad = modalWidth - 4 - visibleLength(title);
    lines.push(
      `  ╔${"═".repeat(modalWidth - 4)}╗`,
    );
    lines.push(
      `  ║ ${"\x1b[1m"}${title}${"\x1b[22m"}${" ".repeat(Math.max(0, titlePad))} ║`,
    );
    lines.push(
      `  ╠${"═".repeat(modalWidth - 4)}╣`,
    );

    // Content.
    const contentLines = content.split("\n");
    const maxContentLines = modalHeight - 6; // title + actions + borders
    for (let i = 0; i < maxContentLines; i++) {
      const line = contentLines[i] ?? "";
      const visLen = visibleLength(line);
      const pad = Math.max(0, modalWidth - 4 - visLen);
      lines.push(`  ║ ${line}${" ".repeat(pad)} ║`);
    }

    // Separator.
    lines.push(`  ╠${"═".repeat(modalWidth - 4)}╣`);

    // Actions.
    const actionStr = actions
      .map((a, i) => {
        const isSelected = i === selectedAction && isFocused;
        if (isSelected) {
          return `\x1b[7m ${a.label} \x1b[27m`;
        }
        if (a.primary) {
          return `\x1b[1m${a.label}\x1b[22m`;
        }
        return ` ${a.label} `;
      })
      .join("  ");

    const actionPad = Math.max(0, modalWidth - 4 - visibleLength(stripAnsi(actionStr)));
    lines.push(
      `  ║ ${actionStr}${" ".repeat(actionPad)} ║`,
    );

    // Bottom border.
    lines.push(`  ╚${"═".repeat(modalWidth - 4)}╝`);

    // Backdrop lines below.
    for (let i = 0; i < backdropLines; i++) {
      lines.push("");
    }

    return lines.join("\n");
  }

  handleInput(event: WidgetInputEvent): boolean {
    if (!this.focused) return false;

    const { key } = event;
    const { actions } = this.data;

    switch (key) {
      case "ArrowLeft":
        this.data.selectedAction =
          (this.data.selectedAction - 1 + actions.length) % actions.length;
        return true;

      case "ArrowRight":
        this.data.selectedAction =
          (this.data.selectedAction + 1) % actions.length;
        return true;

      case "Enter": {
        const action = actions[this.data.selectedAction];
        if (action) this.data.onAction?.(action);
        return true;
      }

      case "Escape":
        this.data.onCancel?.();
        return true;

      case "Tab":
        this.data.selectedAction =
          (this.data.selectedAction + 1) % actions.length;
        return true;
    }

    return false;
  }
}
