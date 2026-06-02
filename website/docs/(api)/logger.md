---
title: Logger
sidebarPosition: 2
description: info, warn, error, success, debug — consistent [prefix]-prefixed output.
---

All log functions print to the terminal with the configured prefix (set via `configure()`).

```ts
import { info, warn, error, success, debug } from '@bdocs/dui'
```

| Function | Prefix color | Stream | Env-gated |
|----------|-------------|--------|-----------|
| `info(msg)` | none | stdout | no |
| `warn(msg)` | yellow | stdout | no |
| `error(msg, err?)` | red | stderr | no |
| `success(msg)` | green | stdout | no |
| `debug(msg)` | dim | stdout | `DEBUG` or `BOLTDOCS_DEBUG` |

### Examples

```ts
info('Starting build...')
success('Build completed!')
warn('Deprecated API used')
error('Failed to connect', new Error('ECONNREFUSED'))
debug('Verbose trace') // only shown with DEBUG=1
```

The `error` function accepts an optional error object that will be printed after the message:

```ts
error('Something broke', err)
// [mytool] Something broke
// [mytool]   ↳ Error: Something broke
//       at main (file.ts:10)
```
