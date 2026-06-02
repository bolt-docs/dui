---
title: Box
sidebarPosition: 3
description: Flexible box builder with three border styles.
---

```ts
import { box, double, single, round, devServer, previewServer, updateAvailable } from '@bdocs/dui'
```

## `box(lines: string[], opts?: BoxOptions): string`

Generic box builder. Width adapts to terminal size by default.

```ts
box(['Line 1', 'Line 2'], {
  title: 'Status',
  style: 'double',
})
```

### Shorthands

```ts
double('Title', ['Content'])
single('Title', ['Content'])
round('Title', ['Content'])
```

### Pre-built Boxes

These use titles from `configure()` at call time:

```ts
devServer('http://localhost:5173', 'http://192.168.1.5:5173')
previewServer('http://localhost:4173', null)
updateAvailable('1.0.0', '2.0.0')
```

### BoxOptions

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | `string?` | — | Bold title in top border |
| `width` | `number?` | responsive | Box width (defaults to terminal width) |
| `style` | `'single' \| 'double' \| 'round'` | `'single'` | Border style |
| `padding` | `number?` | `1` | Inner horizontal padding |
