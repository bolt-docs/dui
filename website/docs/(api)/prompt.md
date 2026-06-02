---
title: Prompt
sidebarPosition: 8
description: Interactive confirm prompts.
---

```ts
import { confirm, formatLog } from '@bdocs/dui'
```

## `confirm(message: string, options?: ConfirmOptions): Promise<boolean>`

Prompts the user for a yes/no confirmation. Resolves `true` for yes, `false` for no.

```ts
const proceed = await confirm('Are you sure you want to continue?')
if (proceed) {
  // do something
}
```

## `formatLog(message: string, variant?: 'info' | 'warn' | 'error' | 'success'): string`

Returns a formatted log string with the configured prefix.

```ts
console.log(formatLog('Custom message', 'info'))
// [mytool] Custom message
```
