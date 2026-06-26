---
title: Plugin
sidebarPosition: 16
description: Plugin system for extending DUI with custom functionality.
---

```ts
import { usePlugin, type DuiPlugin, type PluginAPI, type PluginEvents } from '@bdocs/dui'
```

DUI includes a lightweight plugin system that lets you extend the core with custom
functionality. Plugins receive access to shared utilities and can hook into lifecycle
events.

## Creating a plugin

A plugin is an object with a `name` and a `setup` function. The `setup` function
receives a `PluginAPI` object with utilities and event hooks.

```ts
import { usePlugin, type DuiPlugin } from '@bdocs/dui'

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

usePlugin(myPlugin)
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
```

## Available plugins

| Package | Description |
|---------|-------------|
| [@dui-toolkit/plugin-markdown](/docs/plugins/markdown) | Render markdown to ANSI-colored terminal output |

```ts
import { usePlugin } from '@bdocs/dui'
import { markdownPlugin } from '@dui-toolkit/plugin-markdown'

usePlugin(markdownPlugin)
```

See the [Plugins section](/docs/plugins) for detailed documentation.
