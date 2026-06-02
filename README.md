# @bdocs/dui

**Terminal UI utilities** — boxes, colors, logging, lists, dividers, and more.

A lightweight, zero-dependency (well, just `picocolors`) library for consistent terminal output. Built for the Boltdocs ecosystem but fully configurable for any CLI tool.

## Packages

| Package | Description |
|---------|-------------|
| [`@bdocs/dui`](./packages/dui) | Core terminal UI library |

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
