---
title: Getting Started
sidebarPosition: 1
description: Install DUI and use it in your CLI project.
---

## Installation

```bash
pnpm add @bdocs/dui
```

```bash
npm install @bdocs/dui
```

```bash
yarn add @bdocs/dui
```

## Configuration

Call `configure()` once at your CLI entry point to set your tool's identity:

```ts
import { configure } from '@bdocs/dui'

configure({
  prefix: 'mytool',
  devServerTitle: 'mytool dev server',
  previewServerTitle: 'mytool preview',
  updateCommand: 'pnpm add mytool@latest',
})
```

### DuiConfig Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `prefix` | `string` | `'dui'` | Prefix in log lines, e.g. `[mytool]` |
| `devServerTitle` | `string` | `'dev server'` | Title of the dev-server box |
| `previewServerTitle` | `string` | `'preview server'` | Title of the preview-server box |
| `updateCommand` | `string` | `'npm install dui@latest'` | Command shown in update notification |

### Reading Config

```ts
import { getConfig } from '@bdocs/dui'

const cfg = getConfig()
console.log(cfg.prefix)
```

## Minimal Example

```ts
import { configure, info, success, error, box, double, bullet, divider } from '@bdocs/dui'

configure({ prefix: 'example' })

function main() {
  info('Starting process...')

  const steps = ['Parse input', 'Transform data', 'Write output']
  console.log(bullet(steps))

  dividerLog('─', 40)

  console.log(double('Result', ['Completed successfully']))
  success('All done!')
}

main()
```
