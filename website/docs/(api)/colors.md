---
title: Colors
sidebarPosition: 6
description: picocolors wrapper with color map for dynamic access.
---

```ts
import { colors, colorMap } from '@bdocs/dui'
```

## `colors`

Direct re-export of [picocolors](https://github.com/alexeyraspopov/picocolors).

```ts
colors.red('Error text')
colors.bold(colors.green('Success'))
colors.cyan('Info')
colors.dim('Debug')
```

## `colorMap`

A string-indexed map for dynamic color access:

```ts
colorMap['cyan']('Info')
colorMap['red']('Error')
colorMap['green']('Done')
colorMap['yellow']('Warning')
```

This is useful when you want to apply colors based on a runtime value:

```ts
const level = 'info'   // could also be 'warn', 'error', etc.
const color = level === 'info' ? 'cyan' : level === 'warn' ? 'yellow' : 'red'
console.log(colorMap[color](message))
```
