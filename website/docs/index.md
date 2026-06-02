---
title: DUI
description: Terminal UI utilities — boxes, colors, logging, lists, dividers, and more.
---

import { Terminal, Paintbrush, ListOrdered, Table, MessageSquare, Activity, Cog, Type, PanelTop, SquareDashed, SplitSquareHorizontal } from 'lucide-react'

**DUI** is a lightweight, zero-dependency terminal UI toolkit for Node.js CLI applications. It provides consistent, beautiful terminal output with minimal configuration.

---

## Why DUI?

DUI handles the messy parts of terminal output so you don't have to:

- **ANSI-aware** — All padding, centering, and width calculations properly handle ANSI escape codes and emoji
- **Configurable** — Set a prefix once and every log, box, and divider uses it
- **Zero runtime dependencies** — Just `picocolors` and `string-width`
- **Tree-shakeable** — Import only what you need

---

## Quick Start

```bash
pnpm add @bdocs/dui
```

```ts
import { configure, info, success, box, bullet, divider } from '@bdocs/dui'

configure({ prefix: 'mytool', devServerTitle: 'mytool dev server' })

info('Starting build...')
success('Build completed!')

console.log(box(['Output ready at dist/'], { title: 'Result', style: 'round' }))
console.log(bullet(['File A', 'File B', 'File C']))
dividerLog()
```

---

## Modules

<Cards cols={2}>
  <Card title="Logger" icon={<MessageSquare />} href="/docs/api/logger">
    info, warn, error, success, debug with configurable prefix
  </Card>
  <Card title="Box" icon={<PanelTop />} href="/docs/api/box">
    Box builder with double, single, and round border styles
  </Card>
  <Card title="Lists" icon={<ListOrdered />} href="/docs/api/list">
    Bullet points, numbered lists, and task checklists
  </Card>
  <Card title="Divider" icon={<SplitSquareHorizontal />} href="/docs/api/divider">
    Horizontal line separators
  </Card>
  <Card title="Colors" icon={<Paintbrush />} href="/docs/api/colors">
    picocolors wrapper with color map
  </Card>
  <Card title="Utils" icon={<Type />} href="/docs/api/utils">
    ANSI-aware padding, centering, width utilities
  </Card>
  <Card title="Prompt" icon={<Activity />} href="/docs/api/prompt">
    Interactive confirm prompts
  </Card>
  <Card title="Table" icon={<Table />} href="/docs/api/table">
    Box-drawing character tables
  </Card>
  <Card title="Spinner" icon={<SquareDashed />} href="/docs/api/spinner">
    Animated terminal spinners with braille frames
  </Card>
  <Card title="Steps" icon={<Cog />} href="/docs/api/steps">
    Pipeline timeline display
  </Card>
</Cards>
