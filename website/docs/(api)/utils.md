---
title: Utils
sidebarPosition: 7
description: ANSI-aware padding, centering, and terminal width utilities.
---

```ts
import { padCenter, padRight, fitWidth, terminalWidth, stripAnsi, visibleLength } from '@bdocs/dui'
```

### `padCenter(s: string, width: number): string`

Center-pads a string to a given visible width (ANSI-aware).

```ts
padCenter('hello', 11) // "   hello   "
```

### `padRight(s: string, width: number): string`

Right-pads a string to a given visible width.

```ts
padRight('hello', 8) // "hello   "
```

### `fitWidth(s: string, width: number): string`

Pads a string to exactly the given visible width.

```ts
fitWidth('hi', 5) // "hi   "
```

### `terminalWidth(): number`

Returns the current terminal width in columns. Falls back to `80`.

```ts
terminalWidth() // 80 (or actual terminal cols)
```

### `stripAnsi(s: string): string`

Removes all ANSI escape sequences (SGR + OSC hyperlinks + Fe codes).

```ts
stripAnsi('\x1b[31mred\x1b[0m') // "red"
stripAnsi('\x1b]8;;https://x.com\x07a\x1b]8;;\x07') // "a"
```

### `visibleLength(s: string): number`

Returns the string length excluding ANSI codes.

```ts
visibleLength('\x1b[31mred\x1b[0m') // 3
```
