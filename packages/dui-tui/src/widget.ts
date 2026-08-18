/**
 * Base widget interface — every widget implements this.
 *
 * Widgets are pure renderers: they receive state and return an ANSI string.
 * No side effects, no mutation. The engine handles focus, input routing,
 * and re-rendering.
 */

// ── Types ──────────────────────────────────────────────────────

export type WidgetType =
  | "text-input"
  | "select-list"
  | "modal"
  | "status-bar"
  | "custom";

export interface WidgetState {
  /** Widget unique id. */
  id: string;
  /** Widget type. */
  type: WidgetType;
  /** Whether this widget can receive focus. */
  focusable: boolean;
  /** Whether this widget is currently focused. */
  focused: boolean;
  /** Whether this widget is visible. */
  visible: boolean;
  /** Widget-specific state. */
  data: Record<string, unknown>;
}

export interface WidgetRenderOptions {
  /** Available width in columns. */
  width: number;
  /** Available height in rows. */
  height: number;
  /** Whether the widget is focused. */
  focused: boolean;
  /** Theme overrides. */
  theme?: Record<string, string>;
}

export interface WidgetInputEvent {
  /** Key name (e.g. "a", "Enter", "ArrowUp", "Tab"). */
  key: string;
  /** Raw character (for printable keys). */
  char?: string;
  /** Modifier flags. */
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export interface Widget<TData = Record<string, unknown>> {
  /** Widget unique id. */
  id: string;
  /** Widget type. */
  type: WidgetType;
  /** Whether this widget can receive focus. */
  focusable: boolean;
  /** Whether this widget is visible. */
  visible: boolean;
  /** Get current state. */
  getState(): WidgetState;
  /** Render to ANSI string. */
  render(opts: WidgetRenderOptions): string;
  /** Handle input event. Returns true if the event was consumed. */
  handleInput(event: WidgetInputEvent): boolean;
  /** Update widget data. */
  setData(data: Partial<TData>): void;
  /** Get widget data. */
  getData(): TData;
  /** Set focused state. */
  setFocused(focused: boolean): void;
  /** Set visible state. */
  setVisible(visible: boolean): void;
}

// ── Base widget class ──────────────────────────────────────────

export abstract class BaseWidget<TData = Record<string, unknown>>
  implements Widget<TData>
{
  id: string;
  type: WidgetType;
  focusable: boolean;
  visible: boolean;
  protected focused = false;
  protected data: TData;

  constructor(
    id: string,
    type: WidgetType,
    data: TData,
    focusable = true,
  ) {
    this.id = id;
    this.type = type;
    this.focusable = focusable;
    this.visible = true;
    this.data = data;
  }

  getState(): WidgetState {
    return {
      id: this.id,
      type: this.type,
      focusable: this.focusable,
      focused: this.focused,
      visible: this.visible,
      data: this.data as Record<string, unknown>,
    };
  }

  abstract render(opts: WidgetRenderOptions): string;
  abstract handleInput(event: WidgetInputEvent): boolean;

  setData(data: Partial<TData>): void {
    Object.assign(this.data, data);
  }

  getData(): TData {
    return this.data;
  }

  setFocused(focused: boolean): void {
    this.focused = focused;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
  }
}
