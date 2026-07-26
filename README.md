# @bdocs/dui

**Terminal UI utilities** — boxes, colors, logging, lists, dividers, progress bars, spinners, animations, interactive prompts, badges, keyboard hints, sections, tabs, modals, grids, accessibility layer, preset themes, and extensible plugin system.

A zero-dependency library for consistent terminal output. Built for the Boltdocs ecosystem but fully configurable for any CLI tool.

## Features

- 🎨 **Colors & Theming** — Hex, RGB, HSL, OkLCh color parsing; chainable ANSI color API; global theme slots
- 📦 **Boxes** — 7 border styles (single, double, round, thick, ascii, dashed, dotted) with titles
- 📝 **Logger** — Semantic log levels with prefix
- 📋 **Lists** — Bullet, ordered, and task lists
- 📊 **Progress** — Discrete and smooth-animated progress bars, multi-bar groups, task wrapper
- ⏳ **Spinner** — Animated spinner with customizable frames and colors
- 🎬 **Animation** — Keyframe animation engine with 20+ easing presets, spring physics, cubic-bezier, timeline
- 🖱️ **Interactive Prompts** — Input, select, multiselect (with drag-to-reorder), tree navigation, confirm
- 🧩 **Widgets** — Badge, keyboard hints (kbd), section dividers, tabs, modals, grids
- ♿ **Accessibility** — Auto-detects NO_COLOR, TERM=dumb, screen readers; plain-text fallback; reduced motion
- 🎨 **Preset Palettes** — Dracula, Nord, Gruvbox, Solarized, Catppuccin, OneDark, Monokai, GitHub
- 🔌 **Plugin System** — Extensible with renderer registry, lifecycle hooks, shared state
- 🌈 **Gradients** — Curated color ramps (sunset, ocean, forest, royal, fire, ice, rainbow, terminal)

## Packages

| Package | Description |
|---------|-------------|
| [`@bdocs/dui`](./packages/dui) | Core terminal UI library |
| [`@dui-toolkit/plugin-chart`](./packages/dui-chart) | Terminal charts (bar, column, line, pie, sparkline) |
| [`@dui-toolkit/plugin-markdown`](./packages/dui-markdown) | Markdown rendering with syntax highlighting |
| [`@dui-toolkit/plugin-diff`](./packages/dui-diff) | Unified, side-by-side, and word-level diffs |
| [`@dui-toolkit/plugin-image`](./packages/dui-image) | PNG / JPG / GIF in the terminal (ANSI + Kitty) |
| [`@dui-toolkit/plugin-qrcode`](./packages/dui-qrcode) | Scannable QR codes in the terminal |
| [`@dui-toolkit/plugin-notify`](./packages/dui-notify) | Cross-platform desktop notifications |

## Documentation

Visit the [documentation site](https://bdocs-dui.vercel.app) for full API reference and usage guides.

## Quick Start

```bash
pnpm add @bdocs/dui
```

```ts
import { configure, info, success, box, badge, section } from '@bdocs/dui'

configure({ prefix: 'mytool' })
info('Starting...')
console.log(section({ title: 'Status' }))
console.log(box(['Hello'], { title: 'Output', style: 'round' }))
badge({ label: 'OK', status: 'success' })
success('Done!')
```

## With themes and presets

```ts
import { configure, presets } from '@bdocs/dui'

configure({ prefix: 'build', theme: presets.dracula })
```

## Accessibility

```ts
import { configure, isPlainMode, isReducedMotion } from '@bdocs/dui'

// Force plain text globally
configure({ plain: true })

// Or auto-detect: NO_COLOR, TERM=dumb, screen reader
if (isPlainMode()) {
  // All widgets return text-only output
}
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
