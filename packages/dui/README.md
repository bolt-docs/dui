# @bdocs/dui

**Docs UI** — Terminal output utilities for CLI tools.

A lightweight, zero-dependency library for consistent terminal
output: boxes, colors, logging, lists, dividers, progress bars,
spinners, animations, interactive prompts, badges, keyboard hints,
sections, tabs, modals, grids, gradient presets, accessibility
layer, theme presets, and an extensible plugin system.

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
| `plain` | `boolean` | `false` | Force text-only output (no ANSI, no borders, no animation). Composes with auto-detect `isPlainMode()` |
| `useStrictInput` | `boolean` | `false` | Strict SGR mouse input validation — logs warnings for malformed sequences |
| `gestureWindowMs` | `number` | `500` | Multi‑click gesture window in milliseconds |

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

### Preset Palettes

DUI ships with curated color presets:

```ts
import { configure, presets } from '@bdocs/dui'

configure({ theme: presets.dracula })
configure({ theme: presets.nord })
configure({ theme: presets.gruvbox })
configure({ theme: presets.solarized })
configure({ theme: presets.catppuccin })
configure({ theme: presets.oneDark })
configure({ theme: presets.monokai })
configure({ theme: presets.github })
```

### Accessibility

Auto-detects when plain text output is needed and provides
a text-only fallback for screen readers, CI pipelines, and
dumb terminals:

```ts
import { configure, isPlainMode, isReducedMotion } from '@bdocs/dui'

// Force plain mode globally
configure({ plain: true })

// Or check current state
if (isPlainMode()) {
  // All widgets return text-only, no ANSI
}
if (isReducedMotion()) {
  // Skip spinner / progress animation cadences
}
```

Triggers on: `NO_COLOR`, `TERM=dumb`, screen reader (brltty / VoiceOver / NVDA / JAWS), or explicit `configure({ plain: true })`.

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

Flexible box builder with seven border styles. Width adapts to terminal size by default.

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

### Badge

Colored status chip for labels and indicators:

```ts
import { badge } from '@bdocs/dui'

badge({ label: 'PASS', status: 'success' })
badge({ label: 'FAIL', status: 'error' })
badge({ label: 'WARN', status: 'warning' })
badge({ label: 'INFO', status: 'info' })
```

### Kbd

Keyboard shortcut hint display:

```ts
import { kbd } from '@bdocs/dui'

kbd({ keys: ['⌘', 'K'] })       // macOS
kbd({ keys: ['Ctrl', 'K'] })    // cross-platform
kbd({ keys: ['Ctrl', 'Alt', 'Del'], platform: 'linux' })
```

### Section

Labeled divider line:

```ts
import { section } from '@bdocs/dui'

section({ title: 'Configuration' })
section({ title: 'Logs', align: 'left' })
```

### Tabs

Segmented tab navigation:

```ts
import { tabs } from '@bdocs/dui'

tabs({
  items: [
    { label: 'Overview', active: true },
    { label: 'Settings' },
  ],
  style: 'underline',   // or 'boxed'
})
```

### Modal

Overlay dialog box:

```ts
import { modal } from '@bdocs/dui'

modal({
  title: 'Confirm',
  content: ['Are you sure you want to proceed?'],
  buttons: [
    { label: 'OK', primary: true },
    { label: 'Cancel' },
  ],
})
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
import { createProgressBar, createAnimatedProgressBar, createMultiProgressBar, task } from '@bdocs/dui'

// Discrete bar
const bar = createProgressBar({ width: 30 })
bar.start(100)
bar.update(50, 'compiling...')
bar.stop('done!')

// Smooth-fill animated bar with easing
const animBar = createAnimatedProgressBar({
  width: 40,
  easing: 'ease-out-elastic',
  animDuration: 600,
})
animBar.start(100)
animBar.update(50)
animBar.stop('complete!')

// Multiple parallel bars
const multi = createMultiProgressBar({
  bars: [
    { label: 'build', color: 'green' },
    { label: 'lint',  color: 'yellow' },
    { label: 'test',  color: 'red' },
  ],
  spacing: 1,
})
multi.start()
multi.bars[0].update(50)
multi.bars[1].update(30)
multi.stop('all done')

// High-level task wrapper
const result = await task('installing', 3, async (ctx) => {
  await step1()
  ctx.update(1, 'fetched')
  await step2()
  ctx.update(2, 'compiled')
  await step3()
  ctx.update(3, 'deployed')
})
```

### Spinner

```ts
import { createSpinner } from '@bdocs/dui'

const spinner = createSpinner('loading...', {
  prefix: 'myapp',
  colors: { frame: 'cyan', success: 'green' },
})
spinner.start()
// ... work ...
spinner.stop('success', 'Done!')
spinner.stop('fail', 'Failed!')
```

### Input

Interactive text input with validation, placeholder, and cursor navigation.

```ts
import { input } from '@bdocs/dui'

const name = await input('Enter your name:', {
  default: 'User',
  placeholder: 'Type here...',
  validate: (v) => v.length >= 2 || 'Too short',
})
```

### Select

Interactive prompt to pick one option from a list using arrow keys, with mouse and wheel support.

```ts
import { select } from '@bdocs/dui'

const value = await select('Choose a color:', {
  choices: [
    { label: 'Red',   value: 'red' },
    { label: 'Green', value: 'green', disabled: true },
    { label: 'Blue',  value: 'blue' },
  ],
})
```

### Multiselect

Interactive prompt to pick multiple options. Space to toggle, arrow keys to navigate,
mouse support, and optional drag-to-reorder.

```ts
import { multiselect } from '@bdocs/dui'

const values = await multiselect('Choose colors:', {
  choices: [
    { label: 'Red',   value: 'red', checked: true },
    { label: 'Green', value: 'green' },
    { label: 'Blue',  value: 'blue', disabled: true },
  ],
  enableDragReorder: true,  // users can drag to reorder
})
```

### Tree

Interactive tree navigation with expand/collapse branches:

```ts
import { tree } from '@bdocs/dui'

const value = await tree('Select config:', {
  tree: [
    {
      label: 'Database',
      children: [
        { label: 'MySQL', value: 'mysql' },
        { label: 'PostgreSQL', value: 'pg' },
      ],
    },
    { label: 'Redis', value: 'redis' },
  ],
})
```

### Grid

Column-based layout for side-by-side content:

```ts
import { grid } from '@bdocs/dui'

grid({
  columns: [
    { content: 'Left cell', width: '1fr' },
    { content: 'Right cell', width: '1fr', align: 'right' },
  ],
  width: 60,
  gap: 2,
})
```

### Animation

Keyframe-based animation engine with 20+ easing presets, spring physics,
cubic-bezier, and timeline sequencing.

```ts
import { animate, animateProgress, createTimeline } from '@bdocs/dui'

// Keyframe animation
const pulse = animate({
  keyframes: [
    { offset: 0,   fg: '#666666' },
    { offset: 0.5, fg: '#ffffff' },
    { offset: 1,   fg: '#666666' },
  ],
  duration: 800,
  loop: true,
  onFrame: (frame) => {
    process.stdout.write(colorize('● Loading...', frame.fg!))
  },
})

// Smooth progress animation
animateProgress({
  duration: 2000,
  easing: 'ease-out-elastic',
  onFrame: (p) => renderBar(p),
})

// Timeline for sequencing
const tl = createTimeline()
tl.add({ duration: 500, onFrame: render1 })
tl.add({ duration: 500, onFrame: render2 }, { after: true })
tl.play()
```

### Utilities

```ts
import { padCenter, padRight, fitWidth, terminalWidth, stripAnsi, visibleLength } from '@bdocs/dui'

padCenter('hello', 11)                    // "   hello   "
padRight('hello', 8)                      // "hello   "
fitWidth('hi', 5)                         // "hi   "
terminalWidth()                           // 80 (or actual terminal cols)
stripAnsi('\x1b[31mred\x1b[0m')           // "red"
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
| `refreshColorSupport()` | void | Re-evaluate color support from env vars |
| `renderLine(text, stream?)` | void | Overwrite current line (readline.cursorTo + clearLine) |
| `renderStatic(text, stream?)` | void | Write text + newline |

### Gradient Presets

| Function | Returns | Description |
|---|---|---|
| `gradient(count, stops)` | `string[]` | Generate N evenly-spaced hex colors from gradient stops |
| `gradientPresets` | object | Curated color ramps: sunset, ocean, forest, royal, fire, ice, rainbow, terminal |

### Animation

| Function | Returns | Description |
|---|---|---|
| `animate(config)` | `AnimationHandle` | Run a keyframe animation with `stop()`, `pause()`, `resume()`, `seek()`, and `then()` |
| `animateProgress(config)` | `AnimateProgressHandle` | Smooth progress animation from 0 to 1 |
| `createTimeline()` | object | Sequence or overlap multiple animations with `add()` and `play()` |
| `createEasing(x1, y1, x2, y2)` | function | Custom cubic-bezier easing function |
| `createSpring(config?)` | function | Spring-physics based easing |
| `lerp(a, b, t)` | number | Linear interpolation |

### Progress

| Function | Returns | Description |
|---|---|---|
| `createProgressBar(opts?)` | `ProgressBar` | Discrete progress bar |
| `createAnimatedProgressBar(opts?)` | `ProgressBar` | Smooth-fill progress bar with easing |
| `createMultiProgressBar(opts)` | `MultiProgressBarHandle` | Group of parallel animated progress bars |
| `task(label, optsOrTotal, fn)` | `Promise<T>` | High-level task wrapper with auto start/stop |

### Interactive Prompts

| Function | Returns | Description |
|---|---|---|
| `input(message, options?)` | `Promise<string>` | Interactive text input with validation |
| `select(message, options)` | `Promise<T>` | Single-select with arrow keys, mouse, wheel |
| `multiselect(message, options)` | `Promise<T[]>` | Multi-select with space toggle, drag-reorder |
| `tree(message, options)` | `Promise<T \| undefined>` | Tree navigation with expand/collapse |
| `confirm(message, options?)` | `Promise<boolean>` | Yes/no confirmation prompt |

### Widgets

| Function | Returns | Description |
|---|---|---|
| `badge(opts)` | `string` | Colored status chip (info, success, warning, error, neutral) |
| `kbd(opts)` | `string` | Keyboard shortcut hint |
| `section(opts)` | `string` | Labeled divider line |
| `tabs(opts)` | `string` | Segmented tab navigation (underline, boxed) |
| `modal(opts)` | `string` | Overlay dialog box with buttons |
| `grid(opts)` | `string` | Column-based side-by-side layout |

### Theme

| Function | Returns | Description |
|---|---|---|
| `configure(opts)` | void | Global config including `theme` and `plain` |
| `getConfig()` | `Readonly<DuiConfig>` | Get current configuration |
| `resetConfig()` | void | Reset configuration to defaults |
| `resolveColor(slot, theme?)` | object | Resolve a slot name to apply/bg functions |
| `resolveColorSimple(color, defaultFn)` | function | Resolve a simple color to a function |
| `presets` | object | Curated palette presets: dracula, nord, gruvbox, solarized, catppuccin, oneDark, monokai, github |

### Accessibility

| Function | Returns | Description |
|---|---|---|
| `isPlainMode(opts?, config?)` | boolean | True when output should be text-only (no ANSI) |
| `isReducedMotion(config?)` | boolean | True when animation should be suppressed |
| `getAccessibilityInfo(plainOverride?)` | `AccessibilityInfo` | Full probe result with individual flags |
| `refreshAccessibility()` | `AccessibilityInfo` | Re-probe screen reader and env heuristics |

### Style

| Function | Returns | Description |
|---|---|---|
| `defineClass(name, style)` | void | Register a named style class |
| `removeClass(name)` | void | Remove a named style class |
| `getClass(name)` | `TerminalStyle \| undefined` | Get a registered style class |
| `applyClass(name, text)` | string | Apply a named style class to text |
| `resetClasses()` | void | Reset all style classes to defaults |

### Divider

| Function | Returns | Description |
|---|---|---|
| `divider(char?, len?)` | string | Gray horizontal line |
| `dividerLog(char?, len?)` | void | Prints divider directly |

### Utils

| Function | Returns | Description |
|---|---|---|
| `padCenter(s, w)` | string | Center-pads string to visible width (ANSI-aware) |
| `padRight(s, w)` | string | Right-pads string to visible width (ANSI-aware) |
| `fitWidth(s, w)` | string | Pads to exact visible width (ANSI-aware) |
| `terminalWidth()` | number | Terminal columns (falls back to 80) |
| `stripAnsi(s)` | string | Removes all ANSI escape sequences (SGR + OSC + Fe) |
| `visibleLength(s)` | number | String length excluding ANSI codes |
| `countRenderLines(s)` | number | How many terminal rows a string occupies |
| `computeLinesRendered(lines)` | number | Compute total rendered rows for an array of strings |
| `wrapAnsiWord(s, w)` | string | ANSI-preserving word-wrap |
| `renderLine(text, stream?)` | void | Overwrite current line |
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
| `usePluginAsync(plugin)` | Register a plugin (async, preferred). Chained calls run in order |
| `usePlugin(plugin)` | Register a plugin (sync, deprecated) |
| `unregisterPlugin(name)` | Tear down a plugin: runs cleanup, removes slots/hooks/renderers/handlers |
| `renderWith(name, input, opts?)` | Invoke a renderer registered by any plugin |
| `runRenderHookAsync(name, input, ctx?)` | Run the chain of render hooks for a channel |
| `emitRenderEvent(event, ctx?)` | Emit `before-render` or `after-render` lifecycle events |
| `listPlugins()` | Return metadata for every registered plugin |
| `getPlugin(name)` | Look up a plugin's metadata by name |
| `isPluginReady(name)` | Check if a plugin has finished loading |
| `awaitPluginsReady(names)` | Wait for plugins to finish loading |

**PluginAPI methods:**

| Method | Description |
|---|---|
| `api.on(event, handler)` | Subscribe to lifecycle events (`register`, `configure`, `theme-changed`, `before-render`, `after-render`, `terminal-resize`, `wheel-up`, `wheel-down`) |
| `api.registerThemeSlot(slot, color)` | Register theme default color for a slot |
| `api.registerRenderHook(name, hook, opts?)` | Register a sync/async render hook with priority |
| `api.registerRenderer(name, renderer)` | Register a renderer for discovery by other plugins |
| `api.getRenderer(name)` | Get a renderer registered by any plugin |
| `api.shared` | Per-plugin key/value store |

### Chart Plugin

`@dui-toolkit/plugin-chart` — Terminal charts (bar, column, line, pie, sparkline).

```bash
pnpm add @dui-toolkit/plugin-chart
```

```ts
import { bar, column, line, pie, sparkline } from '@dui-toolkit/plugin-chart'

bar([80, 60, 95], { labels: ['A', 'B', 'C'], title: 'Scores' })
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
import { mdRender, mdSyntax } from '@dui-toolkit/plugin-markdown'

await mdRender('# Title\n\n- Item 1\n- Item 2')
const highlighted = await mdSyntax('const x = 1', 'javascript')
```

### Diff Plugin

`@dui-toolkit/plugin-diff` — Unified, side-by-side, and word-level diffs.

```bash
pnpm add @dui-toolkit/plugin-diff
```

### Image Plugin

`@dui-toolkit/plugin-image` — PNG / JPG / GIF in the terminal.

```bash
pnpm add @dui-toolkit/plugin-image
```

### QR Code Plugin

`@dui-toolkit/plugin-qrcode` — Scannable QR codes in the terminal.

```bash
pnpm add @dui-toolkit/plugin-qrcode
```

### Notify Plugin

`@dui-toolkit/plugin-notify` — Cross-platform desktop notifications.

```bash
pnpm add @dui-toolkit/plugin-notify
```
