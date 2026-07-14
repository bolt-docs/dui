# @bdocs/dui

**Terminal UI utilities** — boxes, colors, logging, lists, dividers, and more.

A lightweight, zero-dependency (well, just `picocolors`) library for consistent terminal output. Built for the Boltdocs ecosystem but fully configurable for any CLI tool.

## Packages

| Package | Description |
|---------|-------------|
| [`@bdocs/dui`](./packages/dui) | Core terminal UI library |
| [`@dui-toolkit/plugin-chart`](./packages/dui-chart) | Terminal charts (bar, column, line, pie, sparkline) |
| [`@dui-toolkit/plugin-markdown`](./packages/dui-markdown) | Markdown rendering with syntax highlighting |
| [`@dui-toolkit/plugin-diff`](./packages/dui-diff) | Unified, side-by-side, and word-level diffs |
| [`@dui-toolkit/plugin-image`](./packages/dui-image) | PNG / JPG / GIF in the terminal (ANSI + Kitty) |
| [`@dui-toolkit/plugin-qrcode`](./packages/dui-qrcode) | Scannable QR codes in the terminal |

## Documentation

Visit the [documentation site](https://bdocs-dui.vercel.app) for full API reference and usage guides.

## Quick Start

```bash
pnpm add @bdocs/dui
```

```ts
import { configure, info, success, box } from '@bdocs/dui'

configure({ prefix: 'mytool' })
info('Starting...')
success('Done!')
console.log(box(['Hello'], { title: 'Output', style: 'round' }))
```

## Development

```bash
pnpm install
pnpm build       # Build all packages
pnpm test        # Run tests
pnpm dev         # Start docs dev server
```

## License

MIT
