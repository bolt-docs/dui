---
title: Referencia API
sidebarPosition: 1
description: Referencia API completa para DUI v0.5.0.
---

Todas las funciones son importables desde `@bdocs/dui`:

```ts
import { info, box, bullet } from '@bdocs/dui'
import { usePlugin } from '@bdocs/dui'
```

| Módulo | Funciones | Tipos |
|--------|-----------|-------|
| [Config](./config) | `configure`, `getConfig` | `DuiConfig` |
| [Logger](./logger) | `info`, `warn`, `error`, `success`, `debug` | |
| [Box](./box) | `box`, `double`, `single`, `round` | `BoxOptions` |
| [List](./list) | `bullet`, `ordered`, `tasks` | `TaskItem` |
| [Divider](./divider) | `divider`, `dividerLog` | |
| [Theme](./theme) | `resolveColor` | `DuiTheme` |
| [Colors](./color) | `colorize`, `parseColor`, `interpolateColor`, `colors`, `colorMap` | `ColorInput` |
| [Animation](./animation) | `animate`, `lerp` | `Keyframe`, `AnimationHandle` |
| [Progress](./progress) | `createProgressBar` | `ProgressBar` |
| [Utils](./utils) | `padCenter`, `padRight`, `fitWidth`, `terminalWidth`, `stripAnsi`, `visibleLength`, `wrapAnsiWord` | |
| [Prompt](./prompt) | `confirm` | |
| [Table](./table) | `table` | `TableOptions` |
| [Spinner](./spinner) | `createSpinner` | `Spinner` |
| [Steps](./steps) | `steps` | `StepItem` |
| [Plugin](./plugin) | `usePlugin` | `DuiPlugin`, `PluginAPI` |
