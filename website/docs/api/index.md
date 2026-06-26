---
title: API Reference
sidebarPosition: 1
description: Complete API reference for all DUI modules.
---

All functions are importable from `@bdocs/dui`:

```ts
import { info, box, bullet } from '@bdocs/dui'
import { usePlugin } from '@bdocs/dui'
```

| Module | Functions | Types |
|--------|-----------|-------|
| [Config](./config) | `configure`, `getConfig` | `DuiConfig` |
| [Logger](./logger) | `info`, `warn`, `error`, `success`, `debug` | |
| [Box](./box) | `box`, `double`, `single`, `round` | `BoxOptions` |
| [List](./list) | `bullet`, `ordered`, `tasks` | `TaskItem` |
| [Divider](./divider) | `divider`, `dividerLog` | |
| [Theme](./theme) | `resolveColor`, `mergeTheme` | `DuiTheme` |
| [Colors](./color) | `colorize`, `parseColor`, `interpolateColor`, `colors`, `colorMap` | `ColorInput`, `ColorStyle` |
| [Animation](./animation) | `animate`, `lerp` | `Keyframe`, `AnimationHandle`, `EasingFn`, `Easing` |
| [Progress](./progress) | `createProgressBar` | `ProgressBar`, `ProgressBarOptions` |
| [Utils](./utils) | `padCenter`, `padRight`, `fitWidth`, `terminalWidth`, `stripAnsi`, `visibleLength`, `wrapAnsiWord` | |
| [Prompt](./prompt) | `confirm`, `formatLog` | |
| [Table](./table) | `table` | `TableOptions`, `TableColumnOptions` |
| [Spinner](./spinner) | `createSpinner` | `Spinner`, `SpinnerOptions` |
| [Steps](./steps) | `steps` | `StepItem` |
| [Plugin](./plugin) | `usePlugin` | `DuiPlugin`, `PluginAPI`, `PluginEvents` |
