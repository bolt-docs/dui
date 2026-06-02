---
title: Steps
sidebarPosition: 11
description: Pipeline timeline display for multi-step processes.
---

```ts
import { steps } from '@bdocs/dui'
```

## `steps(items: StepItem[]): string`

Renders a pipeline timeline with step status indicators.

```ts
steps([
  { label: 'Validate', status: 'done' },
  { label: 'Build', status: 'running' },
  { label: 'Deploy', status: 'pending' },
])
```

### StepItem

```ts
interface StepItem {
  label: string
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped'
}
```

Each status gets a distinct visual indicator:

| Status | Indicator |
|--------|-----------|
| `done` | ✔ (green) |
| `running` | ◌ (cyan, animated) |
| `pending` | • (dim) |
| `error` | ✘ (red) |
| `skipped` | → (yellow) |
