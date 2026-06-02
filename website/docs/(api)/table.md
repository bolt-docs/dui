---
title: Table
sidebarPosition: 9
description: Box-drawing character tables.
---

```ts
import { table } from '@bdocs/dui'
```

## `table(data: string[][], options?: TableOptions): string`

Renders a table using box-drawing characters.

```ts
const result = table([
  ['Name', 'Version', 'Status'],
  ['boltdocs', '2.8.0', '✅'],
  ['dui', '0.1.2', '✅'],
])
console.log(result)
```

### TableOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `headerSeparator` | `boolean` | `true` | Draw a line after the first row |
| `padding` | `number` | `1` | Cell padding |

### TableColumnOptions

Currently tables use automatic column width based on content.
