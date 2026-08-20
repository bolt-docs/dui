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
import { truncateAnsi } from "../utils";

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

    if (width <= 0) return "";

    // Left segment: styled sections first, then the left text.
    const leftSeg = (
      sections
        .map((sec) => {
          const style = STYLE_MAP[sec.style ?? "default"];
          return `${style.bg}${style.fg} ${sec.text} ${reset}`;
        })
        .join("") + (left ? `${bg}\x1b[1m ${left} ${reset}` : "")
    );
    const centerSeg = center ? `${bg}\x1b[2m ${center} ${reset}` : "";
    const rightSeg = right ? `${bg} ${right} ${reset}` : "";

    const lw = visibleLength(stripAnsi(leftSeg));
    const cw = visibleLength(stripAnsi(centerSeg));
    const rw = visibleLength(stripAnsi(rightSeg));

    let bar: string;
    if (lw + cw + rw <= width) {
      // Left flush, center roughly centered, right flush.
      const rightStart = width - rw;
      const centerStart = Math.min(
        Math.max(lw, Math.floor((width - cw) / 2)),
        rightStart - cw,
      );
      const gapLeft = " ".repeat(Math.max(0, centerStart - lw));
      const gapCenter = " ".repeat(
        Math.max(0, rightStart - (centerStart + cw)),
      );
      bar = `${leftSeg}${gapLeft}${centerSeg}${gapCenter}${rightSeg}`;
    } else {
      // Not enough room — just concatenate and let truncation cut the tail.
      bar = `${leftSeg}${centerSeg}${rightSeg}`;
    }

    // Cap at the exact width without splitting ANSI escapes.
    bar = truncateAnsi(bar, width);
    const used = visibleLength(stripAnsi(bar));
    if (used < width) bar += " ".repeat(width - used);

    return `${bg}${" ".repeat(width)}${reset}\r${bar}`;
  }

  handleInput(): boolean {
    return false; // Status bar doesn't handle input.
  }
}
