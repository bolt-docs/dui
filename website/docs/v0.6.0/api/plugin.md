---
title: Plugin
sidebarPosition: 19
description: Plugin system for extending DUI with custom functionality.
---

```ts
import { usePluginAsync, renderWith, type DuiPlugin, type PluginAPI, type PluginEvents, type Renderer } from '@bdocs/dui'
```

DUI includes a lightweight plugin system that lets you extend the core with custom
functionality. Plugins receive access to shared utilities, can hook into lifecycle
events, register renderers for other plugins to discover, and chain async render hooks.

## Creating a plugin

A plugin is an object with a `name` and a `setup` function. The `setup` function
receives a `PluginAPI` object with utilities and event hooks.

```ts
import { usePluginAsync, type DuiPlugin } from '@bdocs/dui'

const myPlugin: DuiPlugin = {
  name: 'my-plugin',
  setup(api) {
    const { colors, terminalWidth, getConfig } = api.utils

    api.on('register', () => {
      console.log(colors.green('Plugin registered!'))
    })

    api.on('configure', (config) => {
      console.log('Config updated:', config)
    })
  },
}

await usePluginAsync(myPlugin)
```

## PluginAPI

The `setup` function receives a `PluginAPI` with these properties:

### utils

Core utilities shared with the plugin:

```ts
api.utils.colors           // Chainable color API
api.utils.configure        // Global configure function
api.utils.getConfig        // Get current configuration
api.utils.terminalWidth    // Get terminal width in columns
api.utils.visibleLength    // Visible width of a string
api.utils.stripAnsi        // Remove ANSI escape sequences
api.utils.resolveColor     // Resolve a ColorStyle to ANSI function
api.utils.countRenderLines // Count terminal rows a line occupies
```

### on

Subscribe to lifecycle events:

```ts
api.on('register', () => { /* called on registration */ })
api.on('configure', (config) => { /* called on configure() */ })
api.on('theme-changed', (theme) => { /* called when theme changes */ })
api.on('before-render', (ctx) => { /* called before render */ })
api.on('after-render', (ctx) => { /* called after render */ })
```

#### Wheel Scroll Hooks

For dashboards that scroll-counter or animate scroll feedback, plugins can subscribe to wheel direction keys directly through the same event bus:

```ts
let ups = 0;
let downs = 0;
api.on('wheel-up', () => { ups++; /* redraw counter */ });
api.on('wheel-down', () => { downs++; /* redraw counter */ });
```

The handler receives the full [`MouseWheelEvent`](#) (the `wheel` field is `"up"` or `"down"`). These hooks reuse DUI's existing event bus — they fire exactly when a wheel SGR sequence is parsed from stdin (so multi-tick bursts fan out to multiple handler calls). `unregisterPlugin(name)` removes the subscriptions.

## Plugin lifecycle hooks

Plugins can hook into the entire DUI lifecycle:

| Hook | Timing | Use case |
|------|--------|----------|
| `register` | After all queued plugins finish setup | 🏁 Plugin-init, cross-plugin coordination |
| `unregister` | On `unregisterPlugin(name)` | 🧹 Tear down UI state, unsubscribe from external streams |
| `configure` | Every `configure()` call | ⚙️ React to config changes (prefix, theme, plain mode) |
| `theme-changed` | When `configure()` touches `theme` | 🎨 Re-render themed elements without full UI reset |
| `plain-changed` | When `configure()` toggles `plain` | ♿ Enable/disable accessibility text-only mode |
| `before-render` | Before `emitRenderEvent('before-render')` | 📐 Measure layout, capture start time |
| `after-render` | After `emitRenderEvent('after-render')` | ⏱️ Post-render metrics, cleanup |
| `terminal-resize` | When terminal resizes | 📏 Recalculate layout, re-render |

```ts
api.on('register', () => {
  // All queued plugins are ready — safe to call getRenderer()
  const formatter = api.getRenderer('diff')
})

api.on('unregister', () => {
  // Cleanup timers, remove listeners, save state
  clearInterval(myInterval)
})

api.on('terminal-resize', (cols, rows) => {
  // Recalculate grid positions
  myLayout.width = cols
})
```

### Wheel Scroll Hooks

For dashboards that scroll-counter or animate scroll feedback, plugins can subscribe to wheel direction keys directly through the same event bus:

```ts
let ups = 0;
let downs = 0;

api.on('wheel-up', (event) => { ups++; api.shared.set('scroll-ups', ups) });
api.on('wheel-down', (event) => { downs++; api.shared.set('scroll-downs', downs) });
```

The handler receives the full [`MouseWheelEvent`](#) (the `wheel` field is `"up"` or `"down"`, plus `x`, `y`, and `modifiers`). These hooks reuse DUI's existing event bus — they fire exactly when a wheel SGR sequence is parsed from stdin (multi-tick bursts fan out to multiple handler calls). `unregisterPlugin(name)` removes the subscriptions.

## Plugin-to-plugin communication

### Shared state

```ts
api.shared.set('counter', 42)
api.shared.get('counter') // 42
api.shared.has('counter') // true
api.shared.keys()         // ['counter']
api.shared.delete('counter')
```

Each plugin gets an isolated namespace — keys set by one plugin are invisible to others. To share data between plugins, coordinate through `api.registerRenderer()` / `api.getRenderer()` or the `PluginAPI.on()` event bus.

### Renderer discovery

```ts
// Plugin A registers a renderer
api.registerRenderer('transform.upper', async (input) => input.toUpperCase())

// Plugin B discovers and uses it
const upper = api.getRenderer('transform.upper')
if (upper) {
  const result = await upper('hello')
  // result: "HELLO"
}
```

### Render hook chains

Multiple plugins can register hooks for the same channel. Hooks run in **priority order** (see `registerRenderHook` options below) so each plugin transforms the output in sequence:

```ts
// Plugin C: high-priority hook (runs first)
api.registerRenderHook('md', async (input) => `# Metadata\n\n${input}`, { priority: 'first' })

// Plugin D: default priority (runs second)
api.registerRenderHook('md', async (input) => `${input}\n\n_FOOTER_`)
```

### registerThemeSlot

Register a default color for a theme slot (e.g. `"myplugin.border"`).
Plugin defaults are consulted only when the user hasn't supplied a value
via `configure({ theme: { … } })`, so user-set values always win.

```ts
api.registerThemeSlot('myplugin.border', '#646478')
api.registerThemeSlot('myplugin.bg', { fg: '#96c8ff', bg: '#282c34' })
```

### registerRenderHook

Register an async render hook for a named channel. Multiple plugins can
register hooks for the same channel; they chain in registration order.
Hooks can be sync or async.

```ts
api.registerRenderHook('md', async (input, ctx) => {
  // Transform the markdown output before display
  return input + '\n[rendered by myplugin]'
})
```

Invoke the chain with `runRenderHookAsync(name, input, ctx)`:

```ts
import { runRenderHookAsync } from '@bdocs/dui'

const output = await runRenderHookAsync('md', '# Hello')
```

### registerRenderer

Register a renderer that other plugins can discover and call through
`api.getRenderer(name)` or the exported `renderWith(name, input, opts)`.

```ts
api.registerRenderer('myplugin.format', async (input, options) => {
  const prefix = options?.prefix ?? ''
  return prefix + input.toUpperCase()
})
```

### getRenderer

Retrieve a renderer registered by any plugin. Returns `undefined` if
no renderer is registered for the given name.

```ts
const formatter = api.getRenderer('myplugin.format')
if (formatter) {
  const result = await formatter('hello')
}
```

## Plugin API Functions

### usePluginAsync (preferred)

```ts
import { usePluginAsync } from '@bdocs/dui'

await usePluginAsync(myPlugin)
await usePluginAsync(anotherPlugin)
// `register` event fires once after the queue drains
```

Async plugin registration. Chained calls run in order and the `register`
event fires once after the queue drains. Prefer this over the synchronous
`usePlugin`.

### usePlugin (deprecated)

Synchronous registration. Use `usePluginAsync` instead.

### unregisterPlugin

```ts
import { unregisterPlugin } from '@bdocs/dui'

unregisterPlugin('my-plugin') // runs cleanup, removes slots/hooks/handlers
```

Tear down a previously registered plugin: runs its cleanup, removes any
theme slots / render hooks / renderers / event handlers it contributed.

### renderWith

```ts
import { renderWith } from '@bdocs/dui'

const result = await renderWith('md', '# Hello World')
```

Invoke a renderer registered by any plugin. Throws if no renderer is
registered for the given name.

### runRenderHookAsync

```ts
import { runRenderHookAsync } from '@bdocs/dui'

const output = await runRenderHookAsync('md', '# Hello')
```

Run the chain of render hooks registered for a channel. Supports both sync
and async hooks. Hooks run in registration order, each receiving the
output of the previous hook.

### emitRenderEvent

```ts
import { emitRenderEvent } from '@bdocs/dui'

emitRenderEvent('before-render', { width: 80 })
emitRenderEvent('after-render', { width: 80 })
```

## Plugin composition

Plugins can compose each other through the renderer registry:

```ts
const pluginA: DuiPlugin = {
  name: 'plugin-a',
  setup(api) {
    api.registerRenderer('transform.upper', async (input) => input.toUpperCase())
  },
}

const pluginB: DuiPlugin = {
  name: 'plugin-b',
  setup(api) {
    const upper = api.getRenderer('transform.upper')
    api.registerRenderer('transform.composed', async (input, opts) => {
      const suffix = (opts?.suffix as string) ?? ''
      const uppercased = upper ? await upper(input) : input
      return uppercased + suffix
    })
  },
}

await usePluginAsync(pluginA)
await usePluginAsync(pluginB)

const result = await renderWith('transform.composed', 'hello', { suffix: '!!' })
// result: "HELLO!!"
```

## Available plugins

| Package | Description | Registered renderers |
|---------|-------------|---------------------|
| [@dui-toolkit/plugin-markdown](/docs/v0.6.0/plugins/markdown) | Render markdown to ANSI-colored terminal output | `"md"` |
| [@dui-toolkit/plugin-diff](/docs/v0.6.0/plugins/diff) | Unified and side-by-side diffs | `"diff"` |
| [@dui-toolkit/plugin-image](/docs/v0.6.0/plugins/image) | Terminal image renderer (PNG, JPG, GIF) | `"image"` |
| [@dui-toolkit/plugin-qrcode](/docs/v0.6.0/plugins/qrcode) | QR code generator | `"qrcode"` |
| [@dui-toolkit/plugin-chart](/docs/v0.6.0/plugins/chart) | Bar, line, pie charts and sparklines | `"chart.bar"`, `"chart.line"`, `"chart.pie"`, `"chart.sparkline"` |

```ts
import { usePluginAsync, renderWith } from '@bdocs/dui'
import { markdownPlugin } from '@dui-toolkit/plugin-markdown'
import { chartPlugin } from '@dui-toolkit/plugin-chart'

await usePluginAsync(markdownPlugin)
await usePluginAsync(chartPlugin)

// Through the plugin API:
const mdOutput = await renderWith('md', '# Hello')

// Or directly (same result):
import { md } from '@dui-toolkit/plugin-markdown'
const mdOutput2 = await md('# Hello')
```

## TypeScript types

```ts
import type { DuiPlugin, PluginAPI, PluginEvents, RenderContext, Renderer } from '@bdocs/dui'
```
