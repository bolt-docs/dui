---
title: Utils
sidebarPosition: 10
description: ANSI-aware padding, centering, and terminal width utilities.
---

import TerminalPreview from '../../components/TerminalPreview'

```ts
import { padCenter, padRight, fitWidth, terminalWidth, stripAnsi, visibleLength } from '@bdocs/dui'
```

### padCenter

```ts
padCenter(s: string, width: number): string
```

<Field name="s" type="string">The string to center.</Field>
<Field name="width" type="number">Target visible width in columns.</Field>

Center-pads a string to a given visible width (ANSI-aware).

```ts
padCenter('hello', 11) // "   hello   "
```

### padRight

```ts
padRight(s: string, width: number): string
```

<Field name="s" type="string">The string to right-pad.</Field>
<Field name="width" type="number">Target visible width in columns.</Field>

Right-pads a string to a given visible width.

```ts
padRight('hello', 8) // "hello   "
```

### fitWidth

```ts
fitWidth(s: string, width: number): string
```

<Field name="s" type="string">The string to pad.</Field>
<Field name="width" type="number">Target visible width in columns.</Field>

Pads a string to exactly the given visible width.

```ts
fitWidth('hi', 5) // "hi   "
```

### terminalWidth

```ts
terminalWidth(): number
```

Returns the current terminal width in columns. Falls back to `80`.

```ts
terminalWidth() // 80 (or actual terminal cols)
```

### stripAnsi

```ts
stripAnsi(s: string): string
```

<Field name="s" type="string">A string with ANSI escape codes.</Field>

Removes all ANSI escape sequences (SGR + OSC hyperlinks + Fe codes).

```ts
stripAnsi('\x1b[31mred\x1b[0m') // "red"
stripAnsi('\x1b]8;;https://x.com\x07a\x1b]8;;\x07') // "a"
```

### visibleLength

```ts
visibleLength(s: string): number
```

<Field name="s" type="string">The string to measure.</Field>

Returns the string length excluding ANSI codes.

```ts
visibleLength('\x1b[31mred\x1b[0m') // 3
```

### wrapAnsiWord

```ts
wrapAnsiWord(text: string, maxWidth: number): string[]
```

<Field name="text" type="string">Text to wrap, may contain ANSI codes.</Field>
<Field name="maxWidth" type="number">Maximum visible width per line.</Field>

ANSI-aware word-wrapping. Preserves color/styles across line breaks.

```ts
wrapAnsiWord('hello world', 5) // ['hello', 'world']
```

<TerminalPreview command="node utils.js">
{`   hello
hello
hi
80
red
3`}
</TerminalPreview>
