/**
 * Select List widget — scrollable list with single selection.
 *
 * Features:
 *   - Arrow key navigation
 *   - Scroll when list exceeds viewport
 *   - Selection highlighting
 *   - Search/filter mode
 *   - Disabled items
 *
 * @example
 * ```ts
 * const list = new SelectList("files", {
 *   items: [
 *     { label: "index.ts", value: "src/index.ts" },
 *     { label: "app.ts", value: "src/app.ts" },
 *   ],
 * });
 * ```
 */

import { stripAnsi, truncateByCells, visibleLength } from "@bdocs/dui";
import { BaseWidget, type WidgetRenderOptions, type WidgetInputEvent } from "../widget";

// ── Types ──────────────────────────────────────────────────────

export interface SelectItem {
  label: string;
  value: string;
  disabled?: boolean;
  /** Optional description shown dimmed. */
  description?: string;
}

export interface SelectListData {
  items: SelectItem[];
  selectedIndex: number;
  scrollOffset: number;
  /** Filter query (empty = no filter). */
  filter: string;
  /** Whether filter mode is active. */
  filterActive: boolean;
  /** Callback when selection changes. */
  onSelect?: (item: SelectItem, index: number) => void;
  /** Callback when Enter is pressed. */
  onSubmit?: (item: SelectItem, index: number) => void;
}

export interface SelectListOptions {
  items: SelectItem[];
  onSelect?: (item: SelectItem, index: number) => void;
  onSubmit?: (item: SelectItem, index: number) => void;
}

// ── Widget ─────────────────────────────────────────────────────

export class SelectList extends BaseWidget<SelectListData> {
  /** Height of the last render — lets handleInput scroll in the same viewport the user actually sees. */
  private viewportHeight = 10;

  constructor(id: string, opts: SelectListOptions) {
    super(id, "select-list", {
      items: opts.items,
      selectedIndex: 0,
      scrollOffset: 0,
      filter: "",
      filterActive: false,
      onSelect: opts.onSelect,
      onSubmit: opts.onSubmit,
    });
  }

  /** Get the currently selected item. */
  getSelected(): SelectItem | undefined {
    const filtered = this.getFilteredItems();
    return filtered[this.data.selectedIndex];
  }

  /** Get all items matching the current filter. */
  private getFilteredItems(): SelectItem[] {
    if (!this.data.filter) return this.data.items;
    const q = this.data.filter.toLowerCase();
    return this.data.items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.value.toLowerCase().includes(q),
    );
  }

  /** Set items programmatically. */
  setItems(items: SelectItem[]): void {
    this.data.items = items;
    this.data.selectedIndex = 0;
    this.data.scrollOffset = 0;
    this.data.filter = "";
    this.data.filterActive = false;
  }

  render(opts: WidgetRenderOptions): string {
    if (!this.visible) return "";

    const { width, height } = opts;
    this.viewportHeight = height;
    const items = this.getFilteredItems();
    const isFocused = this.focused;
    const showFilter = this.data.filterActive;
    const maxVisible = height - (showFilter ? 2 : 0) - 2; // borders

    const lines: string[] = [];

    // Header.
    const header = this.data.filterActive
      ? ` 🔍 ${this.data.filter}█`
      : ` 📋 ${items.length} item(s)`;
    lines.push(truncateByCells(header, width));

    // Items.
    const start = this.data.scrollOffset;
    for (let i = 0; i < maxVisible; i++) {
      const idx = start + i;
      if (idx >= items.length) {
        lines.push(`  ${" ".repeat(width - 4)}`);
        continue;
      }

      const item = items[idx];
      const isSelected = idx === this.data.selectedIndex;
      const isDisabled = item.disabled;

      let prefix: string;
      if (isSelected) prefix = " ▸ ";
      else prefix = "   ";

      // Truncate the plain label first, then wrap it in styling so the
      // ANSI codes are always balanced (never sliced in two).
      const maxLabelWidth = Math.max(0, width - 4 - visibleLength(prefix));
      const labelText = truncateByCells(item.label, maxLabelWidth);
      let label: string;
      if (isSelected && isFocused) {
        label = `\x1b[7m ${labelText} \x1b[27m`;
      } else if (isSelected) {
        label = ` ${labelText} `;
      } else if (isDisabled) {
        label = `\x1b[2m${labelText}\x1b[22m`;
      } else {
        label = ` ${labelText}`;
      }

      lines.push(`${prefix}${label}`);
    }

    // Scroll indicator.
    if (items.length > maxVisible) {
      const scrollPercent = Math.round(
        ((start + maxVisible) / items.length) * 100,
      );
      lines.push(`  ── ${scrollPercent}% ──`);
    }

    return lines.join("\n");
  }

  handleInput(event: WidgetInputEvent): boolean {
    if (!this.focused) return false;

    const { key, char, ctrl } = event;
    const items = this.getFilteredItems();
    // Viewport must match the last render so scrolling keeps the selection on screen.
    const maxVisible = Math.max(1, this.viewportHeight - (this.data.filterActive ? 4 : 2));

    // Filter mode.
    if (this.data.filterActive) {
      if (key === "Escape") {
        this.data.filterActive = false;
        this.data.filter = "";
        return true;
      }
      if (key === "Enter") {
        this.data.filterActive = false;
        return true;
      }
      if (key === "Backspace") {
        this.data.filter = this.data.filter.slice(0, -1);
        this.data.selectedIndex = 0;
        this.data.scrollOffset = 0;
        return true;
      }
      if (char && char.length === 1) {
        this.data.filter += char;
        this.data.selectedIndex = 0;
        this.data.scrollOffset = 0;
        return true;
      }
      return false;
    }

    switch (key) {
      case "ArrowUp":
        if (items.length > 0 && this.data.selectedIndex > 0) {
          this.data.selectedIndex--;
          if (this.data.selectedIndex < this.data.scrollOffset) {
            this.data.scrollOffset = this.data.selectedIndex;
          }
        }
        if (items[this.data.selectedIndex]) {
          this.data.onSelect?.(items[this.data.selectedIndex], this.data.selectedIndex);
        }
        return true;

      case "ArrowDown":
        if (items.length > 0 && this.data.selectedIndex < items.length - 1) {
          this.data.selectedIndex++;
          if (this.data.selectedIndex >= this.data.scrollOffset + maxVisible) {
            this.data.scrollOffset = this.data.selectedIndex - maxVisible + 1;
          }
        }
        if (items[this.data.selectedIndex]) {
          this.data.onSelect?.(items[this.data.selectedIndex], this.data.selectedIndex);
        }
        return true;

      case "Home":
        this.data.selectedIndex = 0;
        this.data.scrollOffset = 0;
        if (items[0]) {
          this.data.onSelect?.(items[0], 0);
        }
        return true;

      case "End":
        if (items.length > 0) {
          this.data.selectedIndex = items.length - 1;
          if (items.length > maxVisible) {
            this.data.scrollOffset = items.length - maxVisible;
          }
          this.data.onSelect?.(
            items[this.data.selectedIndex],
            this.data.selectedIndex,
          );
        }
        return true;

      case "Enter": {
        const sel = items[this.data.selectedIndex];
        if (sel && !sel.disabled) {
          this.data.onSubmit?.(sel, this.data.selectedIndex);
        }
        return true;
      }

      case "/":
        // Start filter mode.
        this.data.filterActive = true;
        this.data.filter = "";
        return true;

      case "j":
        if (ctrl) {
          // Page down.
          this.data.selectedIndex = Math.min(
            items.length - 1,
            this.data.selectedIndex + maxVisible,
          );
          if (this.data.selectedIndex >= this.data.scrollOffset + maxVisible) {
            this.data.scrollOffset = this.data.selectedIndex - maxVisible + 1;
          }
          return true;
        }
        break;

      case "k":
        if (ctrl) {
          // Page up.
          this.data.selectedIndex = Math.max(
            0,
            this.data.selectedIndex - maxVisible,
          );
          if (this.data.selectedIndex < this.data.scrollOffset) {
            this.data.scrollOffset = this.data.selectedIndex;
          }
          return true;
        }
        break;
    }

    return false;
  }
}
