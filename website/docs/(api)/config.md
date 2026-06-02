---
title: Config
sidebarPosition: 1
description: Configure DUI's identity — prefix, server titles, and update command.
---

## `configure(opts: Partial<DuiConfig>): void`

Override one or more configuration values. Merges with existing config.

```ts
import { configure } from '@bdocs/dui'

configure({
  prefix: 'mytool',
  devServerTitle: 'mytool dev server',
  previewServerTitle: 'mytool preview server',
  updateCommand: 'pnpm add mytool@latest',
})
```

Call this once at the entry point of your CLI, before any other DUI functions.

## `getConfig(): Readonly<DuiConfig>`

Returns a read-only snapshot of the current config.

```ts
import { getConfig } from '@bdocs/dui'
console.log(getConfig().prefix)
```

## `DuiConfig`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `prefix` | `string` | `'dui'` | Prefix shown in every log line, e.g. `[mytool]` |
| `devServerTitle` | `string` | `'dev server'` | Title text in the dev-server box |
| `previewServerTitle` | `string` | `'preview server'` | Title text in the preview-server box |
| `updateCommand` | `string` | `'npm install dui@latest'` | Command shown in the update-available notification |
