---
name: dui
description: Terminal UI library for Node.js (@bdocs/dui). Use when the project imports from '@bdocs/dui' or when building CLIs with colored output, boxes, tables, spinners, progress bars, interactive prompts, etc.
version: 0.6.0

---

# DUI — Terminal UI Library for Node.js

`@bdocs/dui` is a **zero-dependency** (except `string-width`) library for building rich CLI output. It supports ANSI true-color, bordered boxes, tables, animated spinners, progress bars, interactive prompts, and more.

**Tech stack:** TypeScript, ESM only, Vitest, tsdown, Biome, Turborepo, pnpm.

## Installation

```bash
pnpm add @bdocs/dui
# or
npm install @bdocs/dui
# or
yarn add @bdocs/dui
```

## Imports

All modules are imported from `@bdocs/dui`:

```typescript
import {
  configure, colors, box, table, spinner, input, select,
  info, warn, error,  success, debug, createLogger,
  bullet, ordered, tasks, steps, divider, confirm,
  multiselect, tree, animate, createProgressBar,
  stripAnsi, visibleLength, wrapAnsiWord, renderLine,
  renderStatic, terminalWidth, formatLog,
  usePlugin, usePluginAsync, unregisterPlugin, runRenderHook, runRenderHookAsync,
  emit, renderWith, DUI_VERSION, countRenderLines, colorize, parseColor,
  interpolateColor, applyStyle, toAnsiFg, toAnsiBg, toAnsiFgBg,
  isColorSupported, setColorSupported, refreshColorSupport, colorMap, dividerLog,
  double, single, round, createSpinner, lerp,
  badge, kbd, tabs, section, grid, modal,
  gradient, gradientPresets, presets,
  getAccessibilityInfo, isPlainMode, isReducedMotion, refreshAccessibility,
  formatBoxPlain, formatDividerPlain, formatKbdPlain, formatModalPlain,
  formatSectionPlain, formatTabsPlain, formatActionToken, formatActionTokens,
  enableMouse, disableMouse, enableMouseMove, disableMouseMove,
  onMouseEvent, parseSGRMouseData, parseSGRMouseDataAll,
  registerClickableArea, unregisterClickableArea,
  registerHoverableArea, unregisterHoverableArea,
  getClickedItem, getHoveredItem, getMousePosition,
  defineClass, getClass, removeClass, resetClasses, builtinClasses, applyClass,
  resolveColor, resolveColorSimple, listPlugins, getPlugin, isPluginReady, awaitPluginsReady
} from '@bdocs/dui'
```

## Global configuration

```typescript
import { configure, getConfig, resetConfig } from '@bdocs/dui'

// Call once at CLI entry point
configure({
  prefix: 'my-tool',  // default: 'dui'
  theme: { /* DuiTheme optional */ }
})
```

## Color system

### Chainable API (chalk-like)

```typescript
import { colors } from '@bdocs/dui'

colors.red('text')
colors.bold.underline.blue('important')
colors.bgYellow.black('warning')
colors.dim('secondary')
colors.green.bold('✓ success')

// Available colors:
// fg: black, red, green, yellow, blue, magenta, cyan, white, gray
//      bright-red, bright-green, bright-yellow, bright-blue
//      bright-magenta, bright-cyan, bright-white
// bg: bgBlack, bgRed, bgGreen, bgYellow, bgBlue, bgMagenta, bgCyan, bgWhite, bgGray
//      bgBright-red, bgBright-green, bgBright-yellow, bgBright-blue
//      bgBright-magenta, bgBright-cyan, bgBright-white
// styles: bold, dim, italic, underline, inverse, hidden, strikethrough
```

### Direct color by name

```typescript
import { colorMap } from '@bdocs/dui'

colorMap.red('error')
colorMap.green('ok')
```

### True-color (hex, rgb, oklch)

```typescript
import { colorize, parseColor, interpolateColor, applyStyle } from '@bdocs/dui'

colorize('hello', '#ff6600', 'fg')        // foreground
colorize('hello', '#ff6600', 'bg')        // background

applyStyle('text', '#ff6600', '#1a1a2e', ['bold', 'underline'])

parseColor('#ff6600')       // → { r: 255, g: 102, b: 0 }
parseColor('rgb(255, 102, 0)')
parseColor('oklch(0.6 0.15 30)')

interpolateColor('#ff0000', '#0000ff', 0.5)  // → halfway color
```

### Raw ANSI sequences

```typescript
import { toAnsiFg, toAnsiBg, toAnsiFgBg } from '@bdocs/dui'

toAnsiFg('#ff6600')   // → '\x1b[38;2;255;102;0m'
toAnsiBg('#1a1a2e')   // → '\x1b[48;2;26;26;46m'
```

### Color control

```typescript
import { isColorSupported, setColorSupported, refreshColorSupport } from '@bdocs/dui'

isColorSupported  // boolean, respects NO_COLOR and TTY
setColorSupported(false)  // force disable (useful in tests)
refreshColorSupport()    // re-detect terminal color support at runtime
```

## Badge

```typescript
import { badge } from '@bdocs/dui'

// Status badges with colored backgrounds
console.log(badge('PASS', 'success'))
console.log(badge('FAIL', 'error'))
console.log(badge('WARN', 'warning'))
console.log(badge('INFO', 'info'))

// Available statuses: 'success' | 'error' | 'warning' | 'info' | 'muted'
// With custom label
console.log(badge('ACTIVE', 'success', { label: 'Status' }))
```

## Kbd (keyboard shortcuts)

```typescript
import { kbd } from '@bdocs/dui'

// Render keyboard shortcuts for different platforms
console.log(kbd('Ctrl+C'))                    // Auto-detects platform
console.log(kbd('Cmd+S', { platform: 'mac' })) // Force macOS style
console.log(kbd('Ctrl+Shift+P', { platform: 'win' }))

// Supports: mac, win, linux
// Mac: ⌘ ⌥ ⇧ ⌃
// Win/Linux: Ctrl Alt Shift Win
```

## Tabs

```typescript
import { tabs } from '@bdocs/dui'

// Horizontal tabs for organizing sections
console.log(tabs([
  { label: 'Overview', active: true },
  { label: 'Settings', active: false },
  { label: 'Help', active: false, disabled: true },
]))

// With colors
console.log(tabs([
  { label: 'Code', active: true },
  { label: 'Preview', active: false },
], {
  colors: {
    active: { fg: '#22c55e', bg: '#1a1a2e' },
    inactive: '#888',
  },
}))
```

## Section

```typescript
import { section } from '@bdocs/dui'

// Section header with optional suffix
console.log(section('Configuration'))
console.log(section('Package Details', 'v2.0.0'))

// With colors
console.log(section('Build Output', { colors: { title: '#ff6600', suffix: '#888' } }))
```

## Grid

```typescript
import { grid } from '@bdocs/dui'

// Grid layout with columns
console.log(grid([
  { content: 'Left cell', width: 20 },
  { content: 'Center cell', width: 20, align: 'center' },
  { content: 'Right cell', width: 20, align: 'right' },
]))
```

## Modal

```typescript
import { modal } from '@bdocs/dui'

// Interactive modal dialog
const choice = await modal('Delete file?', {
  buttons: [
    { label: 'Cancel', value: false },
    { label: 'Delete', value: true, variant: 'danger' },
  ],
})
```

## Gradient

```typescript
import { gradient, gradientPresets } from '@bdocs/dui'

// Create color gradients for terminal output
const sunset = gradient('#ff6b6b', '#ffd93d')
console.log(sunset('Sunset gradient'))

// Built-in presets
console.log(gradientPresets.ocean('Deep blue text'))
console.log(gradientPresets.neon('Bright neon text'))

// Available presets: ocean, sunset, neon, forest, candy, fire, ice, aurora
```

## Preset themes

```typescript
import { presets } from '@bdocs/dui'

// Apply a pre-built theme palette
configure({ theme: presets.forest })
configure({ theme: presets.ocean })
configure({ theme: presets.dracula })

// Available: forest, ocean, dracula, nord, solarized, monokai, github, oneDark
```

## Plain mode (accessibility)

```typescript
import {
  isPlainMode, isReducedMotion, refreshAccessibility, getAccessibilityInfo,
  formatBoxPlain, formatDividerPlain, formatKbdPlain,
  formatModalPlain, formatSectionPlain, formatTabsPlain,
  formatActionToken, formatActionTokens,
} from '@bdocs/dui'

// Detect accessibility state
isPlainMode()       // true when ANSI-free text-only output is active
isReducedMotion()   // true when user prefers reduced motion
refreshAccessibility()  // re-detect

// Accessibility info object
getAccessibilityInfo()
// → { plain: boolean, reducedMotion: boolean, colorBlind: boolean }

// Format components for plain (non-ANSI) output
formatBoxPlain(['content'], { title: 'Box' })
formatDividerPlain()
formatKbdPlain('Ctrl+C')
formatModalPlain('message', { buttons: [...] })
formatSectionPlain('title')
formatTabsPlain([...])

// Action tokens (screen-reader-friendly)
formatActionToken('Build complete', 'success')
formatActionTokens(['Build', 'Test', 'Deploy'])
```

## Mouse support

```typescript
import {
  enableMouse, disableMouse, enableMouseMove, disableMouseMove,
  onMouseEvent, parseSGRMouseData, parseSGRMouseDataAll,
  registerClickableArea, unregisterClickableArea,
  registerHoverableArea, unregisterHoverableArea,
  getClickedItem, getHoveredItem, getMousePosition,
} from '@bdocs/dui'

// Enable SGR mouse tracking
enableMouse()
enableMouseMove()  // also track hover (position without clicks)

// Subscribe to raw mouse events
onMouseEvent((event) => {
  if (event.type === 'click') console.log('Click at:', event.x, event.y)
  if (event.type === 'wheel') console.log('Wheel:', event.wheel, event.x, event.y)
  if (event.type === 'move') console.log('Moved to:', event.x, event.y)
})

// Parse mouse data from stdin buffer
const events = parseSGRMouseDataAll(buffer)
// → Array<MouseEvent | MouseWheelEvent>

// Register interactive areas (used by select, multiselect, tree internally)
registerClickableArea({ id: 'btn-1', type: 'custom', bounds: { left: 0, top: 0, width: 10, height: 1 }, data: {} })
getClickedItem(x, y)  // → the clickable area at (x, y) or undefined
getMousePosition()    // → { x, y } or null

// Cleanup
disableMouse()
disableMouseMove()
```

## Style classes

```typescript
import { defineClass, getClass, removeClass, resetClasses, builtinClasses, applyClass } from '@bdocs/dui'

// Define and apply custom style classes
defineClass('my-style', { fg: '#ff6600', bg: '#1a1a2e', bold: true })
const styled = applyClass('my-style', 'text content')

// Built-in classes: 'hover', 'active', 'selected', 'disabled'
builtinClasses()  // → Map of registered classes

// Manage classes
removeClass('my-style')
resetClasses()  // clear all custom classes
```

## Semantic logger

```typescript
import { info, warn, error, success, debug } from '@bdocs/dui'

info('Processing files...')
success('Operation completed!')
warn('Deprecated: use the new API')
error('File not found', err)  // err is logged after
debug('Value of x:', { color: { fg: '#888' } })  // only with DEBUG or BOLTDOCS_DEBUG env

// With per-call color override
success('Done', { color: '#00ff00' })
```

### Custom prefix logger

```typescript
import { createLogger } from '@bdocs/dui'

const log = createLogger('build')
log.info('Compiling...')
log.error('Failed')
```

## Box (bordered boxes)

Three styles: `"single"` (┏━┓), `"double"` (╔═╗), `"round"` (╭─╮).

```typescript
import { box, double, single, round } from '@bdocs/dui'

// Basic usage
console.log(double(['Line 1', 'Line 2']))

// With title and options
console.log(single(['Content'], {
  title: 'Title',
  padding: 2,
  color: '#ff6600',
  colors: {
    border: '#888',
    title: { fg: '#fff', bg: '#ff6600' },
  }
}))

// Responsive: uses terminalWidth() capped at 80
const result = round(['Text with auto word-wrap'])
```

## Divider

```typescript
import { divider, dividerLog } from '@bdocs/dui'

divider()                    // → '────' (up to 72 chars or terminalWidth)
divider('═', 40)             // 40 chars of ═
divider('─', 30, { color: '#888' })  // with color
dividerLog()                 // prints directly
```

## Lists

```typescript
import { bullet, ordered, tasks } from '@bdocs/dui'

// Bullet list
console.log(bullet(['First', 'Second', 'Third']))
//   • First
//   • Second

// Ordered list
console.log(ordered(['Step 1', 'Step 2']))
//   1. Step 1
//   2. Step 2

// Task list (checklist)
console.log(tasks([
  { label: 'Install dependencies', done: true },
  { label: 'Configure ESLint', done: false },
]))
//   ✔ Install dependencies
//   ✘ Configure ESLint

// With custom colors
bullet(['Item'], { colors: { bullet: '#ff6600' } })
```

## Table

```typescript
import { table } from '@bdocs/dui'

const headers = ['Name', 'Age', 'City']
const rows = [
  ['Alice', '28', 'Madrid'],
  ['Bob', '35', 'Barcelona'],
]

console.log(table(headers, rows))
// ┏━━━━━━━━┳━━━━━━┳━━━━━━━━━━┓
// ┃ Name   ┃ Age  ┃ City     ┃
// ┣━━━━━━━━╋━━━━━━╋━━━━━━━━━━┫
// ┃ Alice  ┃ 28   ┃ Madrid   ┃
// ┃ Bob    ┃ 35   ┃ Barcelona┃
// ┗━━━━━━━━┻━━━━━━┻━━━━━━━━━━┛

// With options
console.log(table(headers, rows, {
  style: 'double',         // 'single' | 'double' | 'round' | 'none'
  headerSeparator: true,
  padding: 2,
  columns: {
    0: { align: 'left' },
    1: { align: 'center' },
    2: { align: 'right' },
  },
  colors: {
    header: { fg: '#fff', bg: '#333' },
    border: '#888',
  },
}))
```

## Animated spinner

```typescript
import { createSpinner } from '@bdocs/dui'

const spinner = createSpinner('Downloading...')

spinner.start()

// Update message
spinner.update('Processing...')

// Stop with status
spinner.stop('success', 'Download complete!')
spinner.stop('fail', 'Connection error')
spinner.stop('warn', 'Warning')
spinner.stop('info', 'Information')

// With options
const s = createSpinner('Loading', {
  prefix: 'build',
  frames: ['◜', '◝', '◞', '◟'],  // custom frames
  colors: { frame: '#ff6600', success: '#00ff00' }
})

// TTY: inline animation with cursor hidden
// non-TTY: shows "... " static
```

## Progress Bar

```typescript
import { createProgressBar } from '@bdocs/dui'

const bar = createProgressBar({
  width: 30,           // bar width
  barChar: '█',
  emptyChar: '░',
  prefix: '[build]',
  suffix: 'files',
})

bar.start(100)          // optional total (default 100)
bar.update(50, 'Compiling...')  // current, optional message
bar.update(100)
bar.stop('Done!')      // optional final message

// TTY: renders inline with updates every 100ms
// non-TTY: prints one line per update
```

## Animation engine (keyframes)

```typescript
import { animate, lerp } from '@bdocs/dui'

const anim = animate({
  keyframes: [
    { offset: 0, content: '⠋', fg: '#ff0000' },
    { offset: 0.5, content: '⠙', fg: '#00ff00' },
    { offset: 1, content: '⠹', fg: '#0000ff' },
  ],
  duration: 1000,
  loop: true,
  easing: 'ease-in-out',  // 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | ((t) => t)
  onFrame: (frame) => {
    console.log(frame.content, frame.fg, frame.bg)
  },
})

// Stop
anim.stop()

// Completion callback (non-looping only)
anim.then(() => console.log('Animation done'))

// Lerp for number interpolation
lerp(0, 100, 0.5) // → 50
```

## Interactive prompts

### Confirm

```typescript
import { confirm } from '@bdocs/dui'

const answer = await confirm('Do you want to continue?')
// → [dui] Do you want to continue? (Y/n):
// default = true → "(Y/n)", default = false → "(y/N)"
// SIGINT → resolves with default

const yes = await confirm('Are you sure?', true)  // default true
const no = await confirm('Are you sure?', false) // default false
```

### Input

```typescript
import { input } from '@bdocs/dui'

const name = await input('What is your name?')
const email = await input('Email', {
  default: 'user@example.com',
  placeholder: 'your@email.com',
  validate: (v) => v.includes('@') ? true : 'Invalid email',
  colors: {
    message: '#ff0',
    value: '#fff',
    placeholder: { fg: '#888' },
    error: '#f00',
  }
})
// Shortcuts: ← → home end, backspace delete, Ctrl+U clear line, Ctrl+K delete to end
// Escape → reject with Error, Ctrl+C → process.exit(1)
// Non-TTY → uses readline.question with validation
```

### Select

```typescript
import { select } from '@bdocs/dui'

const color = await select('Pick a color', {
  choices: [
    { label: 'Red', value: '#ff0000' },
    { label: 'Green', value: '#00ff00' },
    { label: 'Blue (disabled)', value: '#0000ff', disabled: true },
  ],
  pageSize: 5,  // visible items before scroll
  colors: {
    pointer: '#0ff',
    selected: '#0ff',
    label: '#fff',
    message: '#ff0',
  }
})
// ↑↓ navigate, Enter select, Escape → reject, Ctrl+C → exit
// Non-TTY → numbered list, input by number
```

### Multiselect

```typescript
import { multiselect } from '@bdocs/dui'

const selected = await multiselect('Which options?', {
  choices: [
    { label: 'Option A', value: 'a', checked: true },
    { label: 'Option B', value: 'b' },
    { label: 'Option C (disabled)', value: 'c', disabled: true },
  ],
  pageSize: 10,
  required: true,  // prevents empty submit
  colors: {
    pointer: '#0ff',
    selected: '#0ff',
    checked: '#0f0',
    label: '#fff',
    message: '#ff0',
  }
})
// Space: toggle, Enter: confirm, required prevents empty submission
```

### Tree

```typescript
import { tree } from '@bdocs/dui'

const result = await tree('Navigate and select', {
  tree: [
    {
      label: 'src',
      children: [
        {
          label: 'components',
          children: [
            { label: 'Button.tsx', value: 'src/components/Button.tsx' },
            { label: 'Input.tsx (disabled)', value: '', disabled: true },
          ]
        },
        { label: 'utils.ts', value: 'src/utils.ts' },
      ]
    },
    { label: 'README.md', value: 'README.md' },
  ],
  pageSize: 10,
  initialExpanded: true,  // expand all initially
  colors: {
    pointer: '#0ff',
    selected: '#0ff',
    label: '#fff',
    message: '#ff0',
    branch: '#888',
  }
})
// ← → expand/collapse, ← on leaf → collapse ancestor, Enter select leaf
// Space: toggle expand, Escape → reject, Ctrl+C → exit
```

## Steps

```typescript
import { steps } from '@bdocs/dui'

console.log(steps([
  { label: 'Installing dependencies', status: 'success' },
  { label: 'Compiling...', status: 'running', details: 'src/index.ts → dist/' },
  { label: 'Running tests', status: 'pending' },
  { label: 'Publishing', status: 'error', details: 'Auth error' },
]))
//   ✔  Installing dependencies
//   │
//   ●  Compiling...
//   │  └─ src/index.ts → dist/
//   │
//   ○  Running tests
//   │
//   ✖  Publishing
//      └─ Auth error
```

## Text utilities

```typescript
import {
  stripAnsi, visibleLength, terminalWidth,
  padCenter, padRight, fitWidth,
  wrapAnsiWord, tokenizeAnsi,
  renderLine, renderStatic, countRenderLines
} from '@bdocs/dui'

// Strip ANSI codes
stripAnsi('\x1b[31mHello\x1b[0m')  // → 'Hello'

// Visible length (without ANSI codes)
visibleLength('\x1b[31mHello\x1b[0m')  // → 5

// Terminal width
terminalWidth()  // → column count

// ANSI-safe padding
padCenter('hello', 10)    // '  hello   '
padRight('hello', 10)     // 'hello     '
fitWidth('hello', 10)     // 'hello     '

// ANSI-preserving word-wrap
wrapAnsiWord(text, 40)

// Tokenizer for ANSI (useful for custom wrap)
tokenizeAnsi(text)
// → [{ type: 'word' | 'space' | 'ansi' | 'newline', value, width }]

// Count how many terminal rows a line occupies
countRenderLines('hello')  // → 1
countRenderLines(longWrappedText)  // → 3

// Inline render (overwrites current line)
renderLine('Loading...')           // stdout
renderLine('Error!', process.stderr)  // stderr

// Final render (with newline)
renderStatic('Done!')
```

## Theme system

### Full DuiTheme

```typescript
import type { ColorStyle, DuiTheme } from '@bdocs/dui'

const theme: DuiTheme = {
  // Global colors (fallback for components)
  success: '#00ff00',
  error: '#ff0000',
  warning: '#ffff00',
  info: '#00ffff',
  muted: '#888888',
  accent: '#ff6600',

  // Logger
  logger: {
    info: '#888',
    warn: '#ff0',
    error: '#f00',
    success: '#0f0',
    debug: '#888',
  },

  // Box
  box: {
    border: '#888',
    title: { fg: '#fff', bg: '#333' },
    arrow: '#0f0',
    url: '#0ff',
    hint: '#888',
    label: '#fff',
    value: '#fff',
  },

  // Spinner
  spinner: {
    frame: '#0ff',
    success: '#0f0',
    fail: '#f00',
    warn: '#ff0',
    info: '#00f',
  },

  // Lists
  list: {
    bullet: '#888',
    number: '#888',
    check: '#0f0',
    cross: '#f00',
  },

  // Steps
  steps: {
    success: '#0f0',
    error: '#f00',
    running: '#0ff',
    pending: '#888',
    detail: '#888',
    connector: '#888',
  },

  // Divider
  divider: { line: '#888' },

  // Prompts
  prompt: { message: '#ff0', suffix: '#888' },
  input: {
    message: '#ff0',
    value: '#fff',
    placeholder: '#888',
    error: '#f00',
  },
  select: {
    pointer: '#0ff',
    selected: '#0ff',
    label: '#fff',
    message: '#ff0',
  },
  multiselect: {
    pointer: '#0ff',
    selected: '#0ff',
    checked: '#0f0',
    label: '#fff',
    message: '#ff0',
  },
  tree: {
    pointer: '#0ff',
    selected: '#0ff',
    label: '#fff',
    message: '#ff0',
    branch: '#888',
  },

  // Progress
  progress: { bar: '#0ff' },

  // Table
  table: { header: 'bold', border: '#888' },
}
```

### ColorStyle

```typescript
type ColorStyle = string | { fg?: string; bg?: string }
// string → foreground color (hex, rgb(), oklch())
// { fg: '#ff0', bg: '#333' } → foreground and background
```

### Color resolution order

The resolution order for a color slot is:
1. Override passed directly in the call (e.g. `info('msg', { color: '#f00' })`)
2. Component theme (e.g. `theme.logger.error`)
3. Global color (e.g. `theme.error`)
4. Slot default (e.g. `logger.error` → red)

## Plugin system

`@bdocs/dui` ships a v2 plugin API that gives the plugin a real reason to exist: theme-slot registration, render-hook chaining, and an event bus.

### Bootstrapping plugins

```typescript
import {
  configure, usePluginAsync, unregisterPlugin,
  runRenderHook, emit, DUI_VERSION,
  type DuiPlugin, type PluginAPI, type PluginEvents, type RenderContext,
} from '@bdocs/dui'
import { markdownPlugin } from '@dui-toolkit/plugin-markdown'
import { diffPlugin } from '@dui-toolkit/plugin-diff'

// Async + ordered: the `register` event fires once after the queue drains.
await usePluginAsync(markdownPlugin)
await usePluginAsync(diffPlugin)

// Configure after plugins — user theme overrides plugin defaults.
configure({
  theme: {
    success: '#22c55e',
    markdown: { heading1: '#fbbf24' },
    diff: { add: '#86efac', del: '#fca5a5' },
  },
})

// Tear down cleanly (per-plugin cleanup, slot removal, hook filter)
unregisterPlugin('@dui-toolkit/plugin-markdown')
```

`usePlugin(plugin)` is a synchronous wrapper kept for backwards compatibility but marked `@deprecated` — prefer the async form so the `register` event fires after `setup()` resolves.

### Plugin shape

```typescript
const myPlugin: DuiPlugin = {
  name: 'my-plugin',                                   // unique identifier
  version: '0.1.0',                                   // surfaced for diagnostics
  peerDependencies: { dui: '^0.5.0' },                // major mismatch → warn

  // `setup` receives a `PluginAPI` and may return either nothing, a
  // sync cleanup function, or a `Promise` that resolves to a cleanup
  // function. Cleanup runs once on `unregisterPlugin(name)`.
  setup(api) {
    api.registerThemeSlot('my.slot', '#ff6600')
    api.registerRenderHook('my-channel', (input, ctx) => input.toUpperCase())
    return () => { /* module-level cleanup */ }
  },
}
```

### Registering theme slots

`registerThemeSlot(slot, defaultColor)` registers a default that flows into `resolveColor(slot)` *before* the built-in fallback map. User-level overrides via `configure({ theme: { … } })` always win.

```typescript
api.registerThemeSlot('markdown.heading1', '#ff6e6e')
api.registerThemeSlot('markdown.codeInline', { fg: '#96c8ff', bg: '#282c34' })
```

`defaultColor` accepts any `ColorStyle`: a hex/rgb/oklch string paints as `fg`, while `{ fg, bg }` exposes both `apply` and `bg` painters via DUI's `resolveColor`.

### Render hooks + runRenderHook

`registerRenderHook(name, hook)` chains hooks in registration order. `runRenderHook(name, input, ctx)` runs them sequentially; with no hooks, `runRenderHook` returns input unchanged (identity).

```typescript
api.registerRenderHook('echo', (input) => `> ${input}`)
api.registerRenderHook('echo', (input) => `< ${input}`)   // chains after

runRenderHook('echo', 'hello')   // '> < hello'
runRenderHook('missing', 'x')   // 'x'
```

`sync` is honoured by any plugin whose render path is sync; async renderers (`md`, `qrcode`, `renderImage`, `animateGif`) continue to be called directly via `await`, deferred to a future release for a `runRenderHookAsync` channel.

### Event bus

```typescript
type PluginEvents = {
  register:        () => void
  unregister:      () => void
  configure:       (config: DuiConfig) => void
  'theme-changed': (theme: DuiTheme) => void
  'plain-changed': (plain: boolean) => void
  'before-render': (ctx: RenderContext) => void
  'after-render':  (ctx: RenderContext) => void
  'terminal-resize': (cols: number, rows: number) => void
  'wheel-up':   (event: MouseWheelEvent) => void
  'wheel-down': (event: MouseWheelEvent) => void
}

api.on('register', () => { /* fired after this plugin's setup resolves */ })
api.on('configure', (config) => { /* fired on every configure() */ })
api.on('theme-changed', (theme) => { /* fired only when configure() touches theme */ })
api.on('plain-changed', (plain) => { /* fired when configure({ plain }) toggles accessibility */ })
api.on('wheel-up', (event) => { /* fired on every SGR wheel-up (button 64) */ })
api.on('wheel-down', (event) => { /* fired on every SGR wheel-down (button 65) */ })
```

The plugin bus is bridged to `configure()` via `onConfigChange` to avoid circular imports — your `register` handler intentionally fires *once* after a queued `usePluginAsync` chain drains.

### Async render hooks

```typescript
import { runRenderHookAsync } from '@bdocs/dui'

// Hooks can be sync or async; they chain in priority order
await runRenderHookAsync('my-channel', input, ctx)

// Priority: higher = runs first. "first" = first, "last" = last.
api.registerRenderHook('my-channel', async (input, ctx) => {
  return transform(input)
}, { priority: 'first' })

// The sync runRenderHook throws if it encounters an async hook
```

### Plugin renderers + capabilities

```typescript
import { renderWith, listPlugins, getPlugin, isPluginReady, awaitPluginsReady } from '@bdocs/dui'

// Register a renderer (like qrcode, image, markdown)
api.registerRenderer('my-renderer', (input, opts) => {
  return renderedOutput
})

// Discover renderers registered by other plugins
const renderer = api.getRenderer('qrcode')
if (renderer) {
  const result = await renderer('https://example.com')
}

// Or use the exported helper (throws if no renderer registered)
const output = await renderWith('qrcode', 'https://example.com')

// Introspect plugin capabilities
api.capabilities.themeSlots   // → ['my.slot']
api.capabilities.renderHooks  // → ['my-channel']
api.capabilities.renderers    // → ['my-renderer']

// Global introspection
listPlugins()  // → PluginMeta[] (sorted by registration order)
getPlugin('@dui-toolkit/plugin-markdown')  // → PluginMeta | undefined
isPluginReady('@dui-toolkit/plugin-qrcode')  // → boolean

// Wait for plugins to finish loading
await awaitPluginsReady(['@dui-toolkit/plugin-markdown', '@dui-toolkit/plugin-diff'])
```

### Plugin shared state

```typescript
// Each plugin has its own namespace for sharing data
api.shared.set('counter', 0)
api.shared.get('counter')      // → 0
api.shared.has('counter')      // → true
api.shared.keys()              // → ['counter']
api.shared.delete('counter')   // → true
// Shared map is automatically cleared on unregisterPlugin(name)
```

### Real example — what an `@dui-toolkit/plugin-*` looks like

The shipped plugins opt into the v2 surface: `markdownPlugin`, `diffPlugin`, `chartPlugin`, `qrcodePlugin`, `imagePlugin`, `notifyPlugin` are each a `DuiPlugin` whose `setup()` registers the slots the renderer consumes. Each declares `peerDependencies: { dui: '^0.6.0' }` so a major-version mismatch warns via `logger.warn` at boot.

See [`examples/16-plugin-stack`](https://github.com/bolt-docs/dui/tree/master/examples/16-plugin-stack) for a composition example that registers three plugins in one chain and applies a unified theme.

## QR Code plugin (`@dui-toolkit/plugin-qrcode`)

```bash
pnpm add @dui-toolkit/plugin-qrcode
```

```typescript
import { qrcode } from '@dui-toolkit/plugin-qrcode'

// Natural size, dimmed URL label
console.log(await qrcode('https://example.com'))

// Branded colors + custom label
console.log(await qrcode('https://example.com/pair', {
  color: '#22c55e',
  bgColor: '#0a0a0a',
  margin: 1,
  label: 'Scan to continue',
}))

// Narrow render for tight columns
console.log(await qrcode('https://example.com', { width: 40, label: false }))
```

Options: `width`, `errorCorrection` (`L`|`M`|`Q`|`H`), `color`, `bgColor`, `margin`, `label` (`boolean | string`), `showVersion`.

## Chart plugin (`@dui-toolkit/plugin-chart`)

```bash
pnpm add @dui-toolkit/plugin-chart
```

```typescript
import { bar, column, line, pie, sparkline, animateChart } from '@dui-toolkit/plugin-chart'

// Horizontal bar chart
bar([80, 60, 95, 45], {
  labels: ['A', 'B', 'C', 'D'],
  title: 'Scores',
  color: '#ff6600',
  format: (v) => `${v}%`,
})

// Vertical column chart
column([20, 40, 60, 80], {
  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
  height: 10,
})

// Line chart (braille characters or filled area)
line([10, 25, 18, 30, 22], {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  width: 40,
  height: 8,
  fill: false,  // true = block element fill
})

// Pie chart (horizontal bar representation)
pie([
  { label: 'Used', value: 65 },
  { label: 'Free', value: 35 },
], { width: 40 })

// Sparkline (compact single-line)
sparkline([10, 25, 18, 30, 22, 15, 28])  // → ▂▅▃▇▅▂▇

// Animate a chart
const handle = animateChart({
  duration: 1000,
  loop: false,
  easing: 'ease-out',
  onFrame: (progress) => {
    bar(data.map(v => v * progress))
  },
})
handle.stop()
```

## Markdown plugin (`@dui-toolkit/plugin-markdown`)

```bash
pnpm add @dui-toolkit/plugin-markdown shiki
```

```typescript
import { md, mdRender, mdSyntax, tokenize } from '@dui-toolkit/plugin-markdown'

// Render markdown to terminal
const rendered = await md('# Hello\n\nThis is **bold** and *italic*.\n\n```ts\nconst x = 1\n```')
console.log(rendered)

// Render directly to console
await mdRender('# Title\n\n- Item 1\n- Item 2')

// Syntax highlight code
const highlighted = await mdSyntax('console.log("hello")', 'javascript')

// Tokenize markdown into AST
const tokens = tokenize('## Heading\n\nParagraph text')
// → [{ type: 'heading', level: 2, inline: [...] }, { type: 'paragraph', inline: [...] }]
```

## Diff plugin (`@dui-toolkit/plugin-diff`)

```bash
pnpm add @dui-toolkit/plugin-diff
```

```typescript
import { diff, diffSideBySide, diffWordsRender, diffStat, diffFiles, diffDirectories } from '@dui-toolkit/plugin-diff'

// Standard unified diff (git-style with hunk headers)
console.log(diff('const a = 1', 'const a = 2'))

// Side-by-side terminal diff (column-aligned rows)
console.log(diffSideBySide('old text\nline 2', 'new text\nline 2', {
  width: 80,
  colors: { insert: '#00ff00', delete: '#ff0000' }
}))

// Word-level diff with intra-line highlighting
console.log(diffWordsRender('the quick fox', 'the slow fox'))

// Compact stats (e.g. " 3 files changed, 12 insertions(+), 4 deletions(-)")
console.log(diffStat('a\nb', 'a\nc'))

// File and directory multi-diffs (async)
const fileDiff = await diffFiles('src/old.ts', 'src/new.ts')
const dirDiff = await diffDirectories('./old-dir', './new-dir')
```

## Image plugin (`@dui-toolkit/plugin-image`)

```bash
pnpm add @dui-toolkit/plugin-image
```

```typescript
import { renderImage, renderAnsi, animateGif, pixelsToAnsi, applyDither, detectTerminal } from '@dui-toolkit/plugin-image'

// Render a static image (PNG, JPG) using ANSI half-blocks
console.log(await renderImage('docs/logo.png', { width: 40 }))

// Animate a GIF directly in the terminal
const anim = await animateGif('docs/demo.gif', {
  width: 60,
  loop: true,        // loop infinitely
})
anim.stop()

// Lower-level: ANSI half-block conversion (no filesystem)
const ansi = pixelsToAnsi(pixels, { bg: true, dither: true })

// Apply ordered dithering to reduce blocking artifacts
const dithered = applyDither(rgba, 'bayer4x4')

// Detect terminal capabilities (Kitty, iTerm, Sixel, etc.)
const caps = detectTerminal()
// → TerminalCapabilities { truecolor, sixel, kitty, iterm2, columns, rows, bestFormat }
```

Options: `width`, `bg` (use background blocks), `dither` (algorithm), `preserveAspectRatio`, `loop`, `fps`. Pass per-call `colors` to override palette; otherwise terminal defaults are used.

## Best practices

### 1. Configure at startup

```typescript
import { configure } from '@bdocs/dui'

// In your CLI entry point
configure({
  prefix: 'my-cli',
  theme: myTheme,
})
```

### 2. TTY vs non-TTY detection

DUI handles TTY vs non-TTY automatically:
- **Spinner:** TTY → inline animation; non-TTY → static `...`
- **Progress:** TTY → inline update; non-TTY → new line per update
- **Prompts:** TTY → interactive raw mode; non-TTY → readline.question

### 3. Respect NO_COLOR

DUI respects `NO_COLOR` and disables colors if stdout is not TTY. Use `setColorSupported()` in tests to force.

### 4. Use themes for consistency

Define a global theme and avoid passing `colors` on every call. Use overrides only for exceptions.

### 5. Error handling in prompts

All prompts (`input`, `select`, `multiselect`, `tree`) reject with `Error('Cancelled')` on Escape. Handle with try/catch:

```typescript
try {
  const result = await select('Option:', { choices })
  // use result
} catch {
  // user cancelled
}
```

### 6. Use formatLog for manual logging

```typescript
import { formatLog } from '@bdocs/dui'

console.log(formatLog('custom message', 'info'))
console.log(formatLog('critical', 'error'))
```

### 7. Tests

Run tests:
```bash
pnpm --filter @bdocs/dui test
pnpm --filter @bdocs/dui test:coverage  # with coverage
```

Lint and format:
```bash
pnpm exec biome lint --write .
pnpm exec biome format --write .
```

### 8. Key project files

| Path | Purpose |
|---|---|
| `packages/dui/src/index.ts` | Barrel / Public API |
| `packages/dui/src/config.ts` | Global config (prefix, theme) |
| `packages/dui/src/color.ts` | ANSI color engine |
| `packages/dui/src/theme.ts` | Theme system |
| `packages/dui/src/logger.ts` | Semantic logger |
| `packages/dui/src/box.ts` | Bordered boxes |
| `packages/dui/src/table.ts` | Tables |
| `packages/dui/src/spinner.ts` | Animated spinner |
| `packages/dui/src/progress.ts` | Progress bar |
| `packages/dui/src/animation.ts` | Keyframe engine |
| `packages/dui/src/prompt.ts` | Confirm prompt |
| `packages/dui/src/input.ts` | Interactive input |
| `packages/dui/src/select.ts` | Interactive select |
| `packages/dui/src/multiselect.ts` | Interactive multiselect |
| `packages/dui/src/tree.ts` | Tree navigation |
| `packages/dui/src/steps.ts` | Step indicators |
| `packages/dui/src/utils.ts` | Utilities (wrap, strip, render, countRenderLines) |
| `packages/dui/src/divider.ts` | Dividers |
| `packages/dui/src/plugin.ts` | Plugin system |
| `packages/dui-chart/` | Chart plugin (bar, column, line, pie, sparkline) |
| `packages/dui-markdown/` | Markdown plugin (render, syntax highlight) |
| `packages/dui-qrcode/` | QR code plugin (terminal scannable QR) |
| `packages/dui-diff/` | Diff plugin (unified, side-by-side, word) |
| `packages/dui-image/` | Image plugin (ANSI half-block + Kitty) |
