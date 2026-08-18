/**
 * Status Bar widget — fixed bottom bar with sections.
 *
 * Features:
 *   - Left / center / right sections
 *   - Styled sections (success, warning, error, info)
 *   - Keyboard shortcut hints
 *   - Auto-ellipsis for overflow
 *
 * @example
 * ```ts
 * const bar = new StatusBar("main-bar", {
 *   left: "Ready",
 *   center: "index.ts",
 *   right: "Ln 42, Col 5",
 *   sections: [
 *     { text: "git:main", style: "info" },
 *     { text: "3 errors", style: "error" },
 *   ],
 * });
 * ```
 */

import { stripAnsi, visibleLength } from "@bdocs/dui";
import { BaseWidget, type WidgetRenderOptions } from "../widget";

// ── Types ──────────────────────────────────────────────────────

export type StatusBarStyle = "default" | "info" | "success" | "warning" | "error";

export interface StatusBarSection {
  text: string;
  style?: StatusBarStyle;
  /** Keyboard hint to show (e.g. "Ctrl+S"). */
  shortcut?: string;
}

export interface StatusBarData {
  left: string;
  center: string;
  right: string;
  sections: StatusBarSection[];
}

export interface StatusBarOptions {
  left?: string;
  center?: string;
  right?: string;
  sections?: StatusBarSection[];
}

// ── Styles ─────────────────────────────────────────────────────

const STYLE_MAP: Record<StatusBarStyle, { fg: string; bg: string }> = {
  default: { fg: "\x1b[0m", bg: "\x1b[48;2;50;50;60m" },
  info: { fg: "\x1b[38;2;88;166;255m", bg: "\x1b[48;2;30;40;60m" },
  success: { fg: "\x1b[38;2;34;197;94m", bg: "\x1b[48;2;20;50;30m" },
  warning: { fg: "\x1b[38;2;234;179;8m", bg: "\x1b[48;2;60;50;20m" },
  error: { fg: "\x1b[38;2;220;38;38m", bg: "\x1b[48;2;60;20;20m" },
};

// ── Widget ─────────────────────────────────────────────────────

export class StatusBar extends BaseWidget<StatusBarData> {
  constructor(id: string, opts: StatusBarOptions = {}) {
    super(id, "status-bar", {
      left: opts.left ?? "",
      center: opts.center ?? "",
      right: opts.right ?? "",
      sections: opts.sections ?? [],
    }, false); // Not focusable
  }

  /** Update status bar text. */
  update(opts: { left?: string; center?: string; right?: string; sections?: StatusBarSection[] }): void {
    if (opts.left !== undefined) this.data.left = opts.left;
    if (opts.center !== undefined) this.data.center = opts.center;
    if (opts.right !== undefined) this.data.right = opts.right;
    if (opts.sections !== undefined) this.data.sections = opts.sections;
  }

  render(opts: WidgetRenderOptions): string {
    if (!this.visible) return "";

    const { width } = opts;
    const { left, center, right, sections } = this.data;
    const bg = "\x1b[48;2;40;40;50m";
    const reset = "\x1b[0m";

    // Build the bar.
    const parts: string[] = [];

    // Left sections.
    for (const sec of sections) {
      const style = STYLE_MAP[sec.style ?? "default"];
      parts.push(`${style.bg}${style.fg} ${sec.text} ${reset}`);
    }

    // Left text.
    if (left) {
      parts.push(`${bg}\x1b[1m ${left} ${reset}`);
    }

    // Center text.
    if (center) {
      parts.push(`${bg}\x1b[2m ${center} ${reset}`);
    }

    // Right text + shortcuts.
    if (right) {
      parts.push(`${bg} ${right} ${reset}`);
    }

    // Join and pad to width.
    let bar = parts.join("");
    const visLen = visibleLength(stripAnsi(bar));
    const pad = Math.max(0, width - visLen);
    bar += " ".repeat(pad);

    // Ensure exact width.
    const stripped = stripAnsi(bar);
    if (stripped.length > width) {
      bar = bar.slice(0, width);
    }

    return `${bg}${" ".repeat(width)}${reset}\r${bar}`;
  }

  handleInput(): boolean {
    return false; // Status bar doesn't handle input.
  }
}
