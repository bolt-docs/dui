---
title: Config
sidebarPosition: 1
description: Configure DUI's identity — prefix, server titles, and update command.
---

import TerminalPreview from '../../components/TerminalPreview'

## configure

```ts
configure(opts: Partial<DuiConfig>): void
```

Override one or more configuration values. Merges with existing config.

```ts
import { configure } from '@bdocs/dui'

configure({
  prefix: 'mytool',
})
```

Call this once at the entry point of your CLI, before any other DUI functions. The `prefix` must not be empty (contains only whitespace or empty string), otherwise an error will be thrown.

## getConfig

```ts
getConfig(): Readonly<DuiConfig>
```

Returns a read-only snapshot of the current config.

```ts
import { getConfig } from '@bdocs/dui'
console.log(getConfig().prefix)
```

## resetConfig

```ts
resetConfig(): void
```

Restores the global configuration to its default values (`{ prefix: 'dui' }`).

```ts
import { resetConfig, getConfig } from '@bdocs/dui'

resetConfig()
console.log(getConfig().prefix) // 'dui'
```

## DuiConfig

<Field name="prefix" type="string" default="'dui'">Prefix shown in every log line, e.g. `[mytool]`.</Field>
<Field name="theme" type="DuiTheme">Global theme overrides. See [Theme](./theme).</Field>

<TerminalPreview command="node config.js">
{`\x1b[1m[mytool]\x1b[0m Starting build...`}
</TerminalPreview>
