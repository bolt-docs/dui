/**
 * @dui-toolkit/plugin-tui
 *
 * TUI widget toolkit for @bdocs/dui.
 */

// Widget base
export { BaseWidget } from "./widget";
export type {
  Widget,
  WidgetType,
  WidgetState,
  WidgetRenderOptions,
  WidgetInputEvent,
} from "./widget";

// Widgets
export { TextInput } from "./widgets/text-input";
export type { TextInputData, TextInputOptions } from "./widgets/text-input";

export { SelectList } from "./widgets/select-list";
export type { SelectItem, SelectListData, SelectListOptions } from "./widgets/select-list";

export { Modal } from "./widgets/modal";
export type { ModalAction, ModalData, ModalOptions } from "./widgets/modal";

export { StatusBar } from "./widgets/status-bar";
export type { StatusBarSection, StatusBarStyle, StatusBarData, StatusBarOptions } from "./widgets/status-bar";

// Plugin
export { tuiPlugin } from "./plugin";
