---
title: Divider
sidebarPosition: 5
description: Horizontal line separators.
---

```ts
import { divider, dividerLog } from '@bdocs/dui'
```

## `divider(char?: string, len?: number): string`

Returns a horizontal line that fits the terminal width.

```ts
divider()          // "──────..." (fits terminal)
divider('═', 30)   // "══════════════════════════"
```

## `dividerLog(char?: string, len?: number): void`

Prints the divider directly to stdout.

```ts
dividerLog()       // prints full-width divider
dividerLog('·', 20)
```
