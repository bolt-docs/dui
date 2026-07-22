# @bdocs/dui

**Docs UI** — Terminal output utilities for CLI tools.

A lightweight, zero-dependency library for consistent terminal
output: boxes, colors, logging, lists, dividers, progress bars, spinners, animations, plugins, and more.
Built for the Boltdocs ecosystem but fully configurable for any tool.

## Install

```bash
pnpm add @bdocs/dui
```

## Configuration

Call `configure()` **once at your CLI entry point** to set your tool's identity.
All modules read from this config at call time, so it takes effect immediately.

```ts
import { configure } from '@bdocs/dui'

configure({
  prefix: 'mytool',                         // shown as [mytool] in every log
  devServerTitle: 'mytool dev server',      // title of the devServer() box
  previewServerTitle: 'mytool preview',     // title of the previewServer() box
  updateCommand: 'pnpm add mytool@latest',  // shown in updateAvailable()
})
```

**DuiConfig fields:**

| Field | Type | Default | Description |
|---|---|---|---|
| `prefix` | `string` | `'dui'` | Prefix in log lines, e.g. `[mytool]` |
| `devServerTitle` | `string` | `'dev server'` | Title of the dev-server box |
| `previewServerTitle` | `string` | `'preview server'` | Title of the preview-server box |
| `updateCommand` | `string` | `'npm install dui@latest'` | Update command in the notification box |
| `theme` | `DuiTheme` | — | Global color theme overrides for every component |

You can also read back the current config:

```ts
import { getConfig } from '@bdocs/dui'

const cfg = getConfig()
console.log(cfg.prefix) // 'mytool'
```

---

### Theme

Define a global color theme. Every component picks up these colors automatically:

```ts
import { configure } from '@bdocs/dui'

configure({
  prefix: 'build',
  theme: {
    success: '#22c55e',
    error:   '#ef4444',
    warning: '#eab308',
    info:    '#3b82f6',
    muted:   '#6b7280',
    accent:  '#22d3ee',
  },
})
```

You can also override colors for individual components:

```ts
configure({
  theme: {
    logger: { success: '#00cc66' },
    box:    { border: '#334155', title: '#ffffff' },
    progress: { bar: { fg: '#22c55e', bg: '#052e16' } },
  },
})
```

Per-call color options take precedence over the theme.

---

## Usage

### Logger

Consistent `[prefix]`-prefixed output with semantic log levels.

```ts
import { info, warn, error, success, debug } from '@bdocs/dui'

info('Starting build...')
success('Build completed!')
warn('Deprecated API used')
error('Failed to connect', err)
debug('Verbose trace')        // only shown with DEBUG or BOLTDOCS_DEBUG env
```

### Box

Flexible box builder with three border styles. Width adapts to terminal size by default.

```ts
import { box, double, single, round } from '@bdocs/dui'

// Generic builder
box(['Line 1', 'Line 2'], {
  title: 'Status',
  style: 'double',
})

// Shorthands
double('Title', ['Content'])
single('Title', ['Content'])
round('Title', ['Content'])
```

**Pre-built boxes** (titles and commands pulled from `configure()` at call time):

```ts
import { devServer, previewServer, updateAvailable } from '@bdocs/dui'

// Dev server status — uses devServerTitle from config
console.log(devServer('http://localhost:5173', null))

// Preview server status — uses previewServerTitle from config
console.log(previewServer('http://localhost:4173', 'http://192.168.1.5:4173'))

// Version update notification — uses updateCommand from config
console.log(updateAvailable('1.0.0', '2.0.0'))
```

### Lists

```ts
import { bullet, ordered, tasks } from '@bdocs/dui'

bullet(['Item A', 'Item B'])
// • Item A
// • Item B

ordered(['First', 'Second'])
// 1. First
// 2. Second

tasks([
  { label: 'Install', done: true },
  { label: 'Configure', done: false },
])
// ✔ Install
// ✘ Configure
```

### Divider

```ts
import { divider, dividerLog } from '@bdocs/dui'

divider()          // returns "──────..." (fits terminal)
divider('═', 30)   // returns "══════════════════════════"
dividerLog()       // prints directly
```

### Progress

Animated progress bar with TTY (inline) and non-TTY (newline) modes.

```ts
import { createProgressBar } from '@bdocs/dui'

const bar = createProgressBar({ width: 30 })
bar.start(100)
bar.update(50, 'compiling...')
bar.stop('done!')
```

Supports custom bar/empty characters, theme colors, and status messages.

### Input

Interactive text input with validation, placeholder, and cursor navigation.

```ts
import { input } from '@bdocs/dui'

const name = await input('Enter your name:', {
  default: 'User',
  placeholder: 'Type here...',
  validate: (v) => v.length >= 2 || 'Too short',
})
// TTY: type freely, ←/→ to navigate, Enter to confirm, Esc to cancel
// Non-TTY: standard readline input
```

### Select

Interactive prompt to pick one option from a list using arrow keys, with a non-TTY fallback.

```ts
import { select } from '@bdocs/dui'

const value = await select('Choose a color:', {
  choices: [
    { label: 'Red',   value: 'red' },
    { label: 'Green', value: 'green', disabled: true },
    { label: 'Blue',  value: 'blue' },
  ],
})
// TTY: ↑↓ arrows + Enter to select, Esc to cancel
// Non-TTY: numbered list + numeric input
```

### Multiselect

Interactive prompt to pick multiple options from a list. Space to toggle, arrow keys to navigate.

```ts
import { multiselect } from '@bdocs/dui'

const values = await multiselect('Choose colors:', {
  choices: [
    { label: 'Red',   value: 'red', checked: true },
    { label: 'Green', value: 'green' },
    { label: 'Blue',  value: 'blue', disabled: true },
  ],
})
// TTY: ↑↓ arrows, Space to toggle, Enter to confirm, Esc to cancel
// Non-TTY: comma-separated numbers (e.g. "1,3")
```

### Animation

Keyframe-based animation engine for terminal output. Powers the spinner internally.

```ts
import { animate, colorize } from '@bdocs/dui'
import readline from 'node:readline'

const pulse = animate({
  keyframes: [
    { offset: 0,   fg: '#666666' },
    { offset: 0.5, fg: '#ffffff' },
    { offset: 1,   fg: '#666666' },
  ],
  duration: 800,
  loop: true,
  onFrame: (frame) => {
    readline.clearLine(process.stdout, 0)
    readline.cursorTo(process.stdout, 0)
    process.stdout.write(colorize('● Loading...', frame.fg!))
  },
})
```

Easing: `linear`, `ease-in`, `ease-out`, `ease-in-out`, or custom function.

### Utilities

```ts
import { padCenter, padRight, fitWidth, terminalWidth, stripAnsi, visibleLength } from '@bdocs/dui'

padCenter('hello', 11)                    // "   hello   "
padRight('hello', 8)                      // "hello   "
fitWidth('hi', 5)                         // "hi   "
terminalWidth()                           // 80 (or actual terminal cols)
stripAnsi('\x1b[31mred\x1b[0m')           // "red"
stripAnsi('\x1b]8;;https://x.com\x07a\x1b]8;;\x07') // "a" — OSC hyperlinks too
visibleLength('\x1b[31mred\x1b[0m')       // 3
```

### Colors

| Function | Returns | Description |
|---|---|---|
| `colorize(text, color, target?)` | string | Paint text with true color (hex, rgb, oklch) |
| `parseColor(input)` | object | Parse hex/rgb/oklch to `{r,g,b,a}` |
| `interpolateColor(a, b, t)` | string | Blend between two colors |
| `colors` | object | Named ANSI colors: `red`, `green`, `bold`, etc. Supports chaining: `colors.red.bold('text')` |
| `colorMap` | object | String-indexed color accessor |
| `toAnsiFg(color)` | string | Raw ANSI foreground sequence |
| `toAnsiBg(color)` | string | Raw ANSI background sequence |
| `toAnsiFgBg(fg, bg)` | string | Raw ANSI foreground + background |
| `applyStyle(text, fg?, bg?, styles?)` | string | Apply foreground, background, and text styles |
| `setColorSupported(value)` | void | Force color support on/off (for tests) |
| `renderLine(text, stream?)` | void | Overwrite current line (readline.cursorTo + clearLine) |
| `renderStatic(text, stream?)` | void | Write text + newline |

### Animation

| Function | Returns | Description |
|---|---|---|
| `animate(config)` | `AnimationHandle` | Run a keyframe animation with `stop()` and `then()` |
| `lerp(a, b, t)` | number | Linear interpolation between two numbers |

### Progress

| Function | Returns | Description |
|---|---|---|
| `createProgressBar(opts?)` | `ProgressBar` | Animated progress bar |

### Input

| Function | Returns | Description |
|---|---|---|
| `input(message, options?)` | `Promise<string>` | Interactive text input with validation |

### Select

| Function | Returns | Description |
|---|---|---|
| `select(message, options)` | `Promise<T>` | Interactive select prompt with arrow keys |
| `multiselect(message, options)` | `Promise<T[]>` | Interactive multi-select prompt with space toggle |

### Tree

| Function | Returns | Description |
|---|---|---|
| `tree(message, options)` | `Promise<T \| undefined>` | Interactive tree prompt with expand/collapse |

### Theme

| Function | Returns | Description |
|---|---|---|
| `configure(opts)` | void | Global config including `theme` |
| `resolveColor(slot, theme?)` | string | Resolve a slot name to a color value |
| `mergeTheme(...themes)` | `DuiTheme` | Merge multiple theme objects |

### Divider

| Function | Returns | Description |
|----------|---------|-------------|
| `divider(char?, len?)` | string | Gray horizontal line |
| `dividerLog(char?, len?)` | void | Prints divider directly |

### Utils

| Function | Returns | Description |
|----------|---------|-------------|
| `padCenter(s, w)` | string | Center-pads string to visible width (ANSI-aware) |
| `padRight(s, w)` | string | Right-pads string to visible width (ANSI-aware) |
| `fitWidth(s, w)` | string | Pads to exact visible width (ANSI-aware) |
| `terminalWidth()` | number | Terminal columns (falls back to 80) |
| `stripAnsi(s)` | string | Removes all ANSI escape sequences (SGR + OSC + Fe) |
| `visibleLength(s)` | number | String length excluding ANSI codes |
| `countRenderLines(s)` | number | How many terminal rows a string occupies |
| `wrapAnsiWord(s, w)` | string | ANSI-preserving word-wrap |
| `renderLine(text, stream?)` | void | Overwrite current line (readline.cursorTo + clearLine) |
| `renderStatic(text, stream?)` | void | Write text + newline |

## License

MIT

---

## Plugins

### Plugin System

Register plugins to extend DUI's functionality. Plugins can register
renderers, hook into lifecycle events, and compose with other plugins.

```ts
import { usePluginAsync, renderWith, type DuiPlugin } from '@bdocs/dui'

const myPlugin: DuiPlugin = {
  name: 'my-plugin',
  setup(api) {
    api.registerRenderer('myplugin.hello', async (input) => {
      return `Hello, ${input}!`
    })
    api.on('configure', (config) => { /* ... */ })
  }
}

await usePluginAsync(myPlugin)

// Call through the plugin API
const msg = await renderWith('myplugin.hello', 'World')
console.log(msg) // "Hello, World!"
```

**API functions:**

| Function | Description |
|---|---|
| `usePluginAsync(plugin)` | Register a plugin (async, preferred). Chained calls run in order; `register` event fires once after queue drains. |
| `usePlugin(plugin)` | Register a plugin (sync, deprecated). |
| `unregisterPlugin(name)` | Tear down a plugin: runs cleanup, removes slots/hooks/renderers/handlers. |
| `renderWith(name, input, opts?)` | Invoke a renderer registered by any plugin. |
| `runRenderHookAsync(name, input, ctx?)` | Run the chain of render hooks for a channel (sync & async). |
| `emitRenderEvent(event, ctx?)` | Emit `before-render` or `after-render` lifecycle events. |

**PluginAPI methods:**

| Method | Description |
|---|---|
| `api.on(event, handler)` | Subscribe to lifecycle events (`register`, `configure`, `theme-changed`, `before-render`, `after-render`). |
| `api.registerThemeSlot(slot, color)` | Register theme default color for a slot. |
| `api.registerRenderHook(name, hook)` | Register a sync/async render hook for a channel. |
| `api.registerRenderer(name, renderer)` | Register a renderer for discovery by other plugins. |
| `api.getRenderer(name)` | Get a renderer registered by any plugin. |

### Chart Plugin

`@dui-toolkit/plugin-chart` — Terminal charts (bar, column, line, pie, sparkline).

```bash
pnpm add @dui-toolkit/plugin-chart
```

```ts
import { bar, column, line, pie, sparkline, animateChart } from '@dui-toolkit/plugin-chart'

bar([80, 60, 95], { labels: ['A', 'B', 'C'], title: 'Scores' })
column([20, 40, 60], { labels: ['Q1', 'Q2', 'Q3'] })
line([10, 25, 18, 30], { width: 40, height: 8, fill: true })
pie([{ label: 'Used', value: 65 }, { label: 'Free', value: 35 }])
sparkline([10, 25, 18, 30, 22])  // → ▂▅▃▇▅
```

### Markdown Plugin

`@dui-toolkit/plugin-markdown` — Render markdown to terminal with syntax highlighting.

```bash
pnpm add @dui-toolkit/plugin-markdown shiki
```

```ts
import { md, mdRender, mdSyntax, tokenize } from '@dui-toolkit/plugin-markdown'

await mdRender('# Title\n\n- Item 1\n- Item 2')
const highlighted = await mdSyntax('const x = 1', 'javascript')
```
