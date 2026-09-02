/**
 * Text Input widget — editable single-line text field.
 *
 * Features:
 *   - Cursor navigation (left/right, home/end)
 *   - Insert/delete (backspace, delete)
 *   - Placeholder text when empty
 *   - Focus ring
 *   - Value change callback
 *
 * @example
 * ```ts
 * const input = new TextInput("name", { placeholder: "Enter name..." });
 * input.render({ width: 40, height: 3, focused: true });
 * ```
 */

import { splitGraphemes, stripAnsi, visibleLength } from "@bdocs/dui";
import { BaseWidget, type WidgetRenderOptions, type WidgetInputEvent } from "../widget";

// ── Types ──────────────────────────────────────────────────────

export interface TextInputData {
  /** Current text value. */
  value: string;
  /** Placeholder when empty. */
  placeholder: string;
  /** Maximum length (0 = unlimited). */
  maxLength: number;
  /** Whether the input is read-only. */
  readOnly: boolean;
  /** Mask character for password fields (null = plain text). */
  mask: string | null;
  /** Callback when value changes. */
  onChange?: (value: string) => void;
  /** Callback when Enter is pressed. */
  onSubmit?: (value: string) => void;
}

export interface TextInputOptions {
  placeholder?: string;
  maxLength?: number;
  readOnly?: boolean;
  mask?: string | null;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

// ── Widget ─────────────────────────────────────────────────────

export class TextInput extends BaseWidget<TextInputData> {
  private cursorPos = 0;

  constructor(id: string, opts: TextInputOptions = {}) {
    super(id, "text-input", {
      value: "",
      placeholder: opts.placeholder ?? "",
      maxLength: opts.maxLength ?? 0,
      readOnly: opts.readOnly ?? false,
      mask: opts.mask ?? null,
      onChange: opts.onChange,
      onSubmit: opts.onSubmit,
    });
  }

  /** Set the text value programmatically. */
  setValue(value: string): void {
    const max = this.data.maxLength;
    if (max > 0) {
      const g = splitGraphemes(value);
      this.data.value = g.slice(0, max).join("");
    } else {
      this.data.value = value;
    }
    this.cursorPos = splitGraphemes(this.data.value).length;
    this.data.onChange?.(this.data.value);
  }

  /** Get the current text value. */
  getValue(): string {
    return this.data.value;
  }

  render(opts: WidgetRenderOptions): string {
    if (!this.visible) return "";

    const { width } = opts;
    const value = this.data.mask
      ? this.data.mask.repeat(this.data.value.length)
      : this.data.value;
    const display = value || this.data.placeholder;
    const isEmpty = !value;

    // Build the display string with cursor using grapheme-aware slicing
    // so ZWJ emoji and combining marks don't split mid-grapheme.
    const graphemes = splitGraphemes(display);
    const cursorInDisplay = Math.min(this.cursorPos, graphemes.length);
    let before = graphemes.slice(0, cursorInDisplay).join("");
    let cursor = graphemes[cursorInDisplay] || " ";
    let after = graphemes.slice(cursorInDisplay + 1).join("");
    const afterGraphemes = graphemes.slice(cursorInDisplay + 1);

    // Truncate if wider than available space.
    const maxVisible = width - 4; // borders
    if (visibleLength(display) > maxVisible) {
      const start = Math.max(0, cursorInDisplay - Math.floor(maxVisible / 2));
      before = graphemes.slice(start, cursorInDisplay).join("");
      cursor = graphemes[cursorInDisplay] || " ";
      after = graphemes.slice(cursorInDisplay + 1, start + maxVisible).join("");
    }

    // Render.
    const lines: string[] = [];

    // Top border.
    lines.push(`┌${"─".repeat(width - 2)}┐`);

    // Content line.
    const isFocused = this.focused;
    const placeholder = this.data.placeholder;

    let content: string;
    if (isEmpty && !isFocused) {
      // Show placeholder dimmed.
      content = ` ${placeholder}`.padEnd(width - 2).slice(0, width - 2);
      content = `\x1b[2m${content}\x1b[22m`;
    } else if (isEmpty && isFocused) {
      // Show cursor on empty.
      content = ` \x1b[7m \x1b[27m`.padEnd(width - 2).slice(0, width - 2);
    } else {
      // Show value with cursor.
      const left = before;
      const right = after;
      const cursorChar = isFocused
        ? `\x1b[7m${cursor}\x1b[27m`
        : cursor;
      // Pad via visible width (never slice the cursor's ANSI escape codes).
      const visLen =
        visibleLength(left) + visibleLength(cursorChar) + visibleLength(right);
      const pad = Math.max(0, width - 2 - 1 - visLen);
      content = ` ${left}${cursorChar}${right}${" ".repeat(pad)}`;
    }

    const border = isFocused ? "\x1b[36m" : "\x1b[2m";
    const reset = "\x1b[0m";

    lines.push(`${border}│${reset}${content}${border}│${reset}`);

    // Bottom border.
    lines.push(`${border}└${"─".repeat(width - 2)}┘${reset}`);

    return lines.join("\n");
  }

  handleInput(event: WidgetInputEvent): boolean {
    if (!this.focused || this.data.readOnly) return false;

    const { key, char, ctrl } = event;

    switch (key) {
      case "ArrowLeft":
        if (this.cursorPos > 0) this.cursorPos--;
        return true;

      case "ArrowRight":
        if (this.cursorPos < this.data.value.length) this.cursorPos++;
        return true;

      case "Home":
        this.cursorPos = 0;
        return true;

      case "End":
        this.cursorPos = this.data.value.length;
        return true;

      case "Backspace":
        if (this.cursorPos > 0) {
          const g = splitGraphemes(this.data.value);
          const pos = Math.min(this.cursorPos, g.length);
          this.data.value =
            g.slice(0, pos - 1).join("") +
            g.slice(pos).join("");
          this.cursorPos = pos - 1;
          this.data.onChange?.(this.data.value);
        }
        return true;

      case "Delete":
        if (this.cursorPos < this.data.value.length) {
          const g = splitGraphemes(this.data.value);
          const pos = Math.min(this.cursorPos, g.length);
          this.data.value =
            g.slice(0, pos).join("") +
            g.slice(pos + 1).join("");
          this.data.onChange?.(this.data.value);
        }
        return true;

      case "Enter":
        this.data.onSubmit?.(this.data.value);
        return true;

      case "a":
        if (ctrl) {
          this.cursorPos = 0;
          return true;
        }
        break;

      case "e":
        if (ctrl) {
          this.cursorPos = this.data.value.length;
          return true;
        }
        break;

      case "u":
        if (ctrl) {
          this.data.value = "";
          this.cursorPos = 0;
          this.data.onChange?.(this.data.value);
          return true;
        }
        break;
    }

    // Printable character.
    if (char && char.length === 1 && char >= " ") {
      const max = this.data.maxLength;
      if (max > 0) {
        const gLen = splitGraphemes(this.data.value).length;
        if (gLen >= max) return true;
      }

      const g = splitGraphemes(this.data.value);
      const pos = Math.min(this.cursorPos, g.length);
      this.data.value =
        g.slice(0, pos).join("") +
        char +
        g.slice(pos).join("");
      this.cursorPos = pos + 1;
      this.data.onChange?.(this.data.value);
      return true;
    }

    return false;
  }
}
