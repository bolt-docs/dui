---
title: API Reference
sidebarPosition: 1
description: Complete API reference for all DUI modules.
---

All functions are importable from `@bdocs/dui`:

```ts
import { info, box, bullet } from '@bdocs/dui'
import { usePluginAsync } from '@bdocs/dui'
```

| Module | Functions | Types |
|--------|-----------|-------|
| [Config](./config) | `configure`, `getConfig`, `resetConfig` | `DuiConfig` |
| [Logger](./logger) | `info`, `warn`, `error`, `success`, `debug`, `createLogger` | `LoggerInstance` |
| [Box](./box) | `box`, `double`, `single`, `round` | `BoxOptions`, `BoxBorderStyle` |
| [List](./list) | `bullet`, `ordered`, `tasks` | `TaskItem` |
| [Divider](./divider) | `divider`, `dividerLog` | |
| [Theme](./theme) | `resolveColor`, `resolveColorSimple`, `mergeTheme` | `DuiTheme` |
| [Presets](./presets) | `presets` | `PresetName`, `DuiThemePreset` |
| [Accessibility](../overview/accessibility) | `isPlainMode`, `isReducedMotion`, `getAccessibilityInfo`, `refreshAccessibility` | `AccessibilityInfo` |
| [Colors](./color) | `colorize`, `parseColor`, `interpolateColor`, `colors`, `colorMap`, `toAnsiFg`, `toAnsiBg`, `toAnsiFgBg`, `applyStyle`, `setColorSupported`, `refreshColorSupport`, `isColorSupported` | `ColorInput`, `ParsedColor`, `ColorName`, `PaintTarget` |
| [Animation](./animation) | `animate`, `lerp`, `animateProgress`, `createEasing`, `createSpring`, `createTimeline` | `Keyframe`, `AnimationHandle`, `AnimateProgressHandle`, `AnimationConfig`, `Easing`, `SpringConfig` |
| [Gradient](./gradient) | `gradient` | `GradientStop`, `GradientPresetName` |
| [Progress](./progress) | `createProgressBar`, `createAnimatedProgressBar`, `createMultiProgressBar`, `task` | `ProgressBar`, `ProgressBarOptions`, `AnimatedProgressBarOptions`, `MultiProgressBarOptions`, `MultiProgressBarHandle`, `MultiBarHandle`, `TaskContext`, `TaskOptions` |
| [Utils](./utils) | `padCenter`, `padRight`, `fitWidth`, `terminalWidth`, `stripAnsi`, `visibleLength`, `wrapAnsiWord`, `countRenderLines`, `renderLine`, `renderStatic`, `computeLinesRendered` | |
| [Prompt](./prompt) | `confirm`, `formatLog` | `ConfirmOptions` |
| [Table](./table) | `table` | `TableOptions`, `TableColumnOptions` |
| [Spinner](./spinner) | `createSpinner` | `Spinner`, `SpinnerOptions` |
| [Steps](./steps) | `steps` | `StepItem` |
| [Input](./input) | `input` | `InputOptions` |
| [Select](./select) | `select` | `SelectChoice`, `SelectOptions` |
| [Multiselect](./multiselect) | `multiselect` | `MultiselectChoice`, `MultiselectOptions` |
| [Tree](./tree) | `tree` | `TreeNode`, `TreeOptions` |
| [Grid](./grid) | `grid` | `GridColumn`, `GridOptions` |
| [Modal](./modal) | `modal` | `ModalButton`, `ModalOptions` |
| [Tabs](./tabs) | `tabs` | `TabsOptions`, `TabsStyle` |
| [Badge](./badge) | `badge` | `BadgeOptions`, `BadgeStatus` |
| [Kbd](./kbd) | `kbd` | `KbdOptions`, `KbdPlatform` |
| [Section](./section) | `section` | `SectionOptions`, `SectionAlign` |
| [Style](./style) | `defineClass`, `removeClass`, `getClass`, `applyClass`, `resetClasses` | `TerminalStyle` |
| [Mouse](./mouse) | `enableMouse`, `disableMouse`, `enableMouseMove`, `disableMouseMove`, `registerClickableArea`, `unregisterClickableArea`, `registerHoverableArea`, `unregisterHoverableArea`, `getClickedItem`, `getHoveredItem`, `getMousePosition`, `onMouseEvent`, `parseSGRMouseData`, `parseSGRMouseDataAll`, `clearClickableAreas`, `clearHoverableAreas`, `isMouseEnabled`, `isMouseMoveEnabled` | `ClickableArea`, `HoverableArea`, `MouseEvent` |
| [Plugin](./plugin) | `usePluginAsync`, `usePlugin`, `unregisterPlugin`, `renderWith`, `runRenderHookAsync`, `runRenderHook`, `emitRenderEvent`, `emit`, `listPlugins`, `getPlugin`, `isPluginReady`, `awaitPluginsReady` | `DuiPlugin`, `PluginAPI`, `PluginEvents`, `PluginMeta`, `PluginCapabilities`, `PluginSharedState`, `Renderer`, `RenderContext`, `RenderHookOptions` |
| [Render](./render) | `calcPercentage`, `buildBarString`, `formatProgressLine` | |
| [Plain](./plain) | `formatBoxPlain`, `formatBadgePlain`, `formatSectionPlain`, `formatDividerPlain`, `formatModalPlain`, `formatTabsPlain`, `formatKbdPlain`, `formatActionToken`, `formatActionTokens` | `BoxLikeOpts`, `ActionInput` |
