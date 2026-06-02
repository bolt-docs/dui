---
title: API Reference
sidebarPosition: 1
description: Complete API reference for all DUI modules.
---

DUI exposes a clean, tree-shakeable API organized into the following modules:

- **[Config](./config)** — `configure()`, `getConfig()`, `DuiConfig`
- **[Logger](./logger)** — `info`, `warn`, `error`, `success`, `debug`
- **[Box](./box)** — `box`, `double`, `single`, `round`, `devServer`, `previewServer`, `updateAvailable`
- **[List](./list)** — `bullet`, `ordered`, `tasks`
- **[Divider](./divider)** — `divider`, `dividerLog`
- **[Colors](./colors)** — `colors`, `colorMap`
- **[Utils](./utils)** — `padCenter`, `padRight`, `fitWidth`, `terminalWidth`, `stripAnsi`, `visibleLength`
- **[Prompt](./prompt)** — `confirm`, `formatLog`
- **[Table](./table)** — `table`
- **[Spinner](./spinner)** — `createSpinner`
- **[Steps](./steps)** — `steps`

All functions are importable from `@bdocs/dui`:

```ts
import { info, box, bullet } from '@bdocs/dui'
```
