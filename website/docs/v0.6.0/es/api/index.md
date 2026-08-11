---
title: Referencia API
sidebarPosition: 1
description: Referencia API completa para todos los módulos de DUI.
---

Todas las funciones son importables desde `@bdocs/dui`:

```ts
import { info, box, bullet } from '@bdocs/dui'
import { usePluginAsync } from '@bdocs/dui'
```

| Módulo | Funciones | Tipos |
|--------|-----------|-------|
| [Config](./config) | `configure`, `getConfig` | `DuiConfig` |
| [Logger](./logger) | `info`, `warn`, `error`, `success`, `debug` | |
| [Box](./box) | `box`, `double`, `single`, `round` | `BoxOptions` |
| [List](./list) | `bullet`, `ordered`, `tasks` | `TaskItem` |
| [Divider](./divider) | `divider`, `dividerLog` | |
| [Theme](./theme) | `resolveColor`, `resolveColorSimple` | `DuiTheme` |
| [Colors](./color) | `colorize`, `parseColor`, `interpolateColor`, `colors`, `colorMap` | `ColorInput`, `ColorStyle` |
| [Animation](./animation) | `animate`, `lerp` | `Keyframe`, `AnimationHandle`, `EasingFn`, `Easing` |
| [Badge](./badge) | `badge` | `BadgeOptions`, `BadgeStatus` |
| [Progress](./progress) | `createProgressBar` | `ProgressBar`, `ProgressBarOptions` |
| [Utils](./utils) | `padCenter`, `padRight`, `fitWidth`, `terminalWidth`, `stripAnsi`, `visibleLength`, `wrapAnsiWord` | |
| [Prompt](./prompt) | `confirm`, `formatLog` | |
| [Table](./table) | `table` | `TableOptions`, `TableColumnOptions` |
| [Presets](./presets) | `presets` | `PresetName`, `DuiThemePreset` |
| [Grid](./grid) | `grid` | `GridColumn`, `GridOptions` |
| [Spinner](./spinner) | `createSpinner` | `Spinner`, `SpinnerOptions` |
| [Steps](./steps) | `steps` | `StepItem` |
| [Plugin](./plugin) | `usePluginAsync` | `DuiPlugin`, `PluginAPI`, `PluginEvents` |
| [Kbd](./kbd) | `kbd` | `KbdOptions`, `KbdPlatform` |
| [Modal](./modal) | `modal` | `ModalButton`, `ModalOptions` |
| [Section](./section) | `section` | `SectionOptions`, `SectionAlign` |
| [Tabs](./tabs) | `tabs` | `TabsOptions`, `TabsStyle` |
