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
| [Theme](./theme) | `resolveColor`, `resolveColorSimple` | `DuiTheme` |
| [Presets](./presets) | `presets` | `PresetName`, `DuiThemePreset` |
| [Accessibility](../overview/accessibility) | `isPlainMode`, `isReducedMotion`, `getAccessibilityInfo`, `refreshAccessibility` | `AccessibilityInfo` |
| [Colors](./color) | `colorize`, `parseColor`, `interpolateColor`, `colors`, `colorMap`, `toAnsiFg`, `toAnsiBg`, `toAnsiFgBg`, `applyStyle`, `setColorSupported`, `refreshColorSupport`, `isColorSupported` | `ColorInput`, `ParsedColor`, `ColorName`, `PaintTarget` |
| [Animation](./animation) | `animate`, `lerp`, `animateProgress`, `createEasing`, `createSpring`, `createTimeline` | `Keyframe`, `AnimationHandle`, `AnimateProgressHandle`, `AnimationConfig`, `Easing`, `SpringConfig` |
| [Progress](./progress) | `createProgressBar`, `createAnimatedProgressBar`, `createMultiProgressBar`, `task` | `ProgressBar`, `ProgressBarOptions`, `AnimatedProgressBarOptions`, `MultiProgressBarOptions`, `MultiProgressBarHandle`, `MultiBarHandle`, `TaskContext`, `TaskOptions` |
| [Utils](./utils) | `padCenter`, `padRight`, `fitWidth`, `terminalWidth`, `stripAnsi`, `visibleLength`, `wrapAnsiWord`, `splitGraphemes`, `truncateByCells`, `countRenderLines`, `renderLine`, `renderStatic`, `computeLinesRendered` | |
| [Prompt](./prompt) | `confirm`, `formatLog` | `ConfirmOptions` |
| [Table](./table) | `table` | `TableOptions`, `TableColumnOptions` |
| [Spinner](./spinner) | `createSpinner` | `Spinner`, `SpinnerOptions` |
| [Steps](./steps) | `steps` | `StepItem` |
| [Grid](./grid) | `grid` | `GridColumn`, `GridOptions` |
| [Modal](./modal) | `modal` | `ModalButton`, `ModalOptions` |
| [Tabs](./tabs) | `tabs` | `TabsOptions`, `TabsStyle` |
| [Badge](./badge) | `badge` | `BadgeOptions`, `BadgeStatus` |
| [Kbd](./kbd) | `kbd` | `KbdOptions`, `KbdPlatform` |
| [Section](./section) | `section` | `SectionOptions`, `SectionAlign` |
| [Plugin](./plugin) | `usePluginAsync`, `usePlugin`, `unregisterPlugin`, `renderWith`, `runRenderHookAsync`, `runRenderHook`, `emitRenderEvent`, `emit`, `listPlugins`, `getPlugin`, `isPluginReady`, `awaitPluginsReady` | `DuiPlugin`, `PluginAPI`, `PluginEvents`, `PluginMeta`, `PluginCapabilities`, `PluginSharedState`, `Renderer`, `RenderContext`, `RenderHookOptions` |
| Gradient | `gradient`, `gradientPresets` | `GradientStop`, `GradientPresetName` |
| Input | `input` | `InputOptions` |
| Select | `select` | `SelectChoice`, `SelectOptions` |
| Multiselect | `multiselect` | `MultiselectChoice`, `MultiselectOptions` |
| Tree | `tree` | `TreeNode`, `TreeOptions` |
| Style | `defineClass`, `removeClass`, `getClass`, `applyClass`, `resetClasses` | `TerminalStyle` |
| Mouse | `enableMouse`, `disableMouse`, `enableMouseMove`, `disableMouseMove`, `registerClickableArea`, `unregisterClickableArea`, `registerHoverableArea`, `unregisterHoverableArea`, `getClickedItem`, `getHoveredItem`, `getMousePosition`, `onMouseEvent`, `parseSGRMouseData`, `parseSGRMouseDataAll`, `clearClickableAreas`, `clearHoverableAreas`, `isMouseEnabled`, `isMouseMoveEnabled` | `ClickableArea`, `HoverableArea`, `MouseEvent` |
| Render | `calcPercentage`, `buildBarString`, `formatProgressLine` | |
| Plain | `formatBoxPlain`, `formatBadgePlain`, `formatSectionPlain`, `formatDividerPlain`, `formatModalPlain`, `formatTabsPlain`, `formatKbdPlain`, `formatBulletPlain`, `formatOrderedPlain`, `formatTasksPlain`, `formatStepsPlain`, `formatTablePlain`, `formatActionToken`, `formatActionTokens`, `formatActionsPlain` | `BoxLikeOpts`, `ActionInput` |
| Batch | `createBatch`, `getDefaultBatch`, `resetDefaultBatch` | `BatchHandle`, `BatchOptions` |
| Paginate | `paginate`, `paginateInteractive`, `terminalHeight` | `PaginateOptions` |
| Surface | `RenderSurface`, `SurfaceOverlay` | `SurfaceCell`, `SurfaceOptions` |
| Capabilities | `getCapabilities`, `setCapabilities`, `refreshCapabilities`, `hasTrueColor`, `hasKitty`, `hasHyperlinks`, `colorDepthLabel` | `TerminalCapabilities` |
| JSON Output | `formatJson`, `parseSgr`, `ansiToJson`, `diffNode`, `progressNode`, `spinnerNode`, `imageNode`, `widgetNode` | `JsonNode`, `JsonNodeType`, `JsonOutputOptions`, `JsonStyles`, `JsonMeta` |
| [Form](./form) | `form` | `FormField`, `FormOptions`, `FormTextField`, `FormSelectField` |
| [Palette](./palette) | `palette` | `PaletteItem`, `PaletteOptions` |
| [Fuzzy Search](./fuzzy) | `fuzzyMatch`, `highlightFuzzy`, `filterFuzzy` | `FuzzyResult` |
| [Link](./link) | `link`, `hyperlink`, `linkify`, `supportsHyperlinks` | `LinkOptions` |
| [Clipboard](./clipboard) | `copyToClipboard`, `copy`, `clipboardSupported` | |
| [Banner](./banner) | `banner`, `bannerLines` | `BannerOptions`, `BannerStyle` |
| [Rich Text](./richtext) | `richtext`, `richtextToPlain` | `RichTextOptions` |
| [Toast](./toast) | `toast`, `createToastCenter`, `dismissAllToasts` | `ToastOptions`, `ToastType`, `ToastCenter`, `ToastCenterOptions` |
| [Status Bar](./statusbar) | `createStatusBar` | `StatusBar`, `StatusBarOptions`, `StatusBarParts` |
| [Alt Screen](./alt-screen) | `withAltScreen`, `enterAltScreen`, `exitAltScreen`, `hideCursor`, `showCursor`, `saveCursor`, `restoreCursor` | |
| [Testing](./testing) | `createMockTty`, `withMockTty`, `snapshotWidget`, `snapshotStatic` | `MockTty`, `MockTtyOptions`, `MockTtyStream` |
| [create-dui](./create-dui) | `scaffold`, `parseArgs`, `main` | `ScaffoldOptions`, `ScaffoldResult` |
