---
title: Prompt
sidebarPosition: 11
description: Interactive confirm prompts.
---

import TerminalPreview from '../../components/TerminalPreview'

```ts
import { confirm, formatLog, input, multiselect, select, tree } from '@bdocs/dui'
```

## input

```ts
input(message: string, options?: InputOptions): Promise<string>
```

<Field name="message" type="string">The question to display.</Field>
<Field name="options" type="InputOptions">Optional configuration with default, placeholder, validate, and colors.</Field>

Interactive text input prompt. Supports typing, cursor navigation (←/→), backspace,
delete, Ctrl+U (clear line), Ctrl+K (delete to end), and Enter to submit.

```ts
const name = await input('What is your name?', {
  default: 'User',
  placeholder: 'Type your name...',
})
// TTY: type freely, Enter to submit, Esc to cancel
// Non-TTY: standard readline input
```

**InputOptions fields:**

| Field | Type | Default | Description |
|---|---|---|---|
| `default` | `string` | — | Default value when input is empty |
| `placeholder` | `string` | — | Dimmed hint shown when buffer is empty |
| `validate` | `(value: string) => string \| true` | — | Returns error message or `true` |
| `colors` | `object` | — | Per-call color overrides |

**Theme slots:** `input.message`, `input.value`, `input.placeholder`, `input.error`

```ts
const email = await input('Email:', {
  placeholder: 'user@example.com',
  validate: (v) =>
    v.includes('@') ? true : 'Must contain @',
  colors: {
    error: '#ff4444',
  },
})
```

## multiselect

```ts
multiselect<T = string>(message: string, options: MultiselectOptions<T>): Promise<T[]>
```

<Field name="message" type="string">The question to display.</Field>
<Field name="options" type="MultiselectOptions">Configuration object with choices, pageSize, required, and colors.</Field>

Interactive prompt to pick multiple options from a list. Supports arrow key navigation,
space to toggle, disabled items, and a non-TTY fallback with comma-separated numeric input.

```ts
const values = await multiselect('Choose colors:', {
  choices: [
    { label: 'Red',   value: '#ff0000' },
    { label: 'Green', value: '#00cc66', checked: true },
    { label: 'Blue',  value: '#3399ff', disabled: true },
  ],
})
// Use ↑↓ to navigate, Space to toggle, Enter to confirm, Esc to cancel
```

<Callout variant="info">
  In non-TTY environments, type comma-separated numbers (e.g. `1,3`) and press Enter.
</Callout>

**MultiselectOptions fields:**

| Field | Type | Default | Description |
|---|---|---|---|
| `choices` | `MultiselectChoice<T>[]` | — | Array of options |
| `pageSize` | `number` | `10` | Max visible items before scrolling |
| `required` | `boolean` | `false` | If true, at least one selection is enforced |
| `wheelSensitivity` | `number` | `1` | Wheel-tick cursor step (see Wheel Sensitivity below) |
| `enableDragReorder` | `boolean` | `false` | Allow press-and-drag to reorder the list (see Drag Reorder below) |
| `colors` | `object` | — | Per-call color overrides |

**MultiselectChoice fields:**

| Field | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Display text |
| `value` | `T` | — | Return value (any type) |
| `disabled` | `boolean` | `false` | If true, item cannot be selected |
| `checked` | `boolean` | `false` | Initial checked state |

**Theme slots:** `multiselect.pointer`, `multiselect.selected`, `multiselect.checked`, `multiselect.label`, `multiselect.message`

```ts
const frameworks = await multiselect('Select frameworks:', {
  choices: [
    { label: 'React',   value: 'react', checked: true, },
    { label: 'Vue',     value: 'vue' },
    { label: 'Svelte',  value: 'svelte' },
  ],
  colors: {
    pointer: '#ff8800',
    checked: '#00ff88',
  },
})
```

## select

```ts
select<T = string>(message: string, options: SelectOptions<T>): Promise<T>
```

<Field name="message" type="string">The question to display.</Field>
<Field name="options" type="SelectOptions">Configuration object with choices, pageSize, and colors.</Field>

Interactive prompt to pick one option from a list. Supports arrow key navigation, clickable area selection with mouse, disabled
items, page scrolling, and a non-TTY fallback with numeric input.

```ts
const value = await select('Choose a color:', {
  choices: [
    { label: 'Red',   value: '#ff0000' },
    { label: 'Green', value: '#00cc66', disabled: true },
    { label: 'Blue',  value: '#3399ff' },
  ],
})
// Use ↑↓ arrows to navigate, click to select, Enter to confirm, Esc to cancel
```

<Callout variant="info">
  In non-TTY environments, a numbered list is shown and the user types a number.
</Callout>

**SelectOptions fields:**

| Field | Type | Default | Description |
|---|---|---|---|
| `choices` | `SelectChoice<T>[]` | — | Array of options |
| `pageSize` | `number` | `10` | Max visible items before scrolling |
| `colors` | `object` | — | Per-call color overrides |

**SelectChoice fields:**

| Field | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Display text |
| `value` | `T` | — | Return value (any type) |
| `disabled` | `boolean` | `false` | If true, item cannot be selected |

**Theme slots:** `select.pointer`, `select.selected`, `select.label`, `select.message`

```ts
const framework = await select('Pick a framework:', {
  choices: [
    { label: 'React',  value: 'react' },
    { label: 'Vue',    value: 'vue' },
    { label: 'Svelte', value: 'svelte' },
  ],
  colors: {
    pointer: '#ff8800',
    selected: '#00ff88',
  },
})
```

### Mouse Support

When running in a terminal that supports mouse events (most modern terminals), `select()` automatically supports mouse clicks:

- **Left-click** on a choice selects it and closes the prompt
- Works the same as arrow navigation and Enter key
- Automatically adapts to scroll position

Mouse support is automatically enabled in TTY environments and disabled in non-TTY environments.

<Callout variant="info">
  Mouse features require SGR 1006 protocol support (most modern terminals).
</Callout>

### Wheel Scrolling

In addition to clicks, `select()` reads mouse-wheel events from the SGR 1006 stream and converts them into cursor moves:

- **Wheel up** is equivalent to pressing `↑` — moves the cursor up, skipping disabled items
- **Wheel down** is equivalent to pressing `↓` — moves the cursor down, skipping disabled items
- Each wheel tick moves the cursor by one row; when the cursor reaches the page boundary the visible window scrolls in lock-step
- Wheel scrolling does **not** auto-confirm the prompt — press `Enter` or click to commit the choice

Wheel support ships automatically with `select()` — no extra opt-in required. Modifier state is captured through the standard event but v1 maps every tick to a single row; faster scrolling just produces more ticks.

<Callout variant="info">
  Scrolling on `multiselect()` and `tree()` is also supported with the same semantics — wheel moves the cursor only, it does not toggle checkboxes or expand branches. Use `Space` (multiselect) or `→`/`Space` (tree) for those actions.
</Callout>

#### Wheel Sensitivity <Badge type="warning">next</Badge>

Pass `wheelSensitivity` on the options object for `select`, `multiselect`, or `tree` to make a single wheel tick advance the cursor by `N` rows instead of just one. Defaults to `1`. Values below `1` are coerced to `1` (fractional negatives or zero cannot disable wheel scrolling).

```ts
// One tick = 3 rows. Useful for long lists where a single
// notch feels too granular.
const value = await select("Pick", {
  choices: [...allItems],
  wheelSensitivity: 3,
});
```

The multiplier composes with multi-tick bursts: with `wheelSensitivity: 3` and a chunk of two consecutive wheel ticks, the cursor advances by `2 × 3 = 6` rows in a single render. Disabled items are still skipped per row (the loop calls `clampCursor` once per step). `multiselect` wheel scrolling never toggles checkboxes regardless of sensitivity, and `tree` cursor clamps at the ends (no wrap).

### Drag Reorder <Badge type="warning">next</Badge>

`multiselect()` supports press-and-drag reordering when `enableDragReorder: true`. Off by default to preserve the legacy contract that the `choices` array order is preserved end-to-end.

```ts
const order = await multiselect('Arrange in priority:', {
  choices: [
    { label: 'Critical', value: 'p0' },
    { label: 'High',     value: 'p1', checked: true },
    { label: 'Medium',   value: 'p2' },
    { label: 'Low',      value: 'p3' },
  ],
  enableDragReorder: true,
});
```

Semantics:

- **Press left mouse button on a row** → starts the drag; the row gets the `multiselect.dragSource` color (default `yellow`).
- **Move over another row** → that row gets the `multiselect.dropTarget` color (default `cyan`) as a live preview.
- **Release on a different enabled row** → the dragged row **moves** (inserts, not swaps) to that position. Elements between source and target shift up by one to make room.
- **Release on a disabled row, the same row, or outside any row** → drag is cancelled (no reorder).
- **Press and release on the same row** → behaves as a click: toggles the checkbox. Drag never accidentally toggles checkboxes.
- **Wheel scroll mid-drag** → cancels the in-flight drag cleanly (no stale state on the next press).

Two important invariants:

- The user's `choices` array is **never** mutated. The component keeps an internal copy and returns `.value` entries from that copy.
- **Checked state follows the dragged row** to its new index. If row 2 was checked and you drag it to row 5, the element at row 5 is checked after the drop. Any rows that fell inside the splice window follow their new indices in **both** directions (downward drag pushes them up by one; upward drag pushes them down by one).

The cursor is pinned to whichever **logical row** it was on before the move. When the cursor was sitting on the dragged row, it follows the row to its new index. When the cursor was sitting on a different row, that row may have shifted as part of the splice; the cursor follows the row to its new index (not the same absolute integer position, which would land on a different choice after the shift). This keeps the cursor visually anchored to the same prompt in BOTH drag directions.

**Theme slots:** `multiselect.dragSource`, `multiselect.dropTarget` (both default to a foreground color; pass `{ fg, bg }` for a chip background).

### Multi-click Gesture Detection <Badge type="warning">next</Badge>

When running in a terminal with mouse support, the mouse parser detects multi-click gestures (`doubleclick`, `tripleclick`) by tracking consecutive clicks at the same position within a configurable time window.

```ts
configure({ gestureWindowMs: 1000 })
// Three clicks within 1 second at (10,5):
// → 'click' (clicks: 1)
// → 'doubleclick' (clicks: 2)
// → 'tripleclick' (clicks: 3)
```

| Config | Default | Effect |
|--------|---------|--------|
| `gestureWindowMs` | `500` | Time window for multi-click detection. Increase for SSH/tmux users (e.g. `800`–`1000`). Set `0` to fall back to `500`. |

#### Double-click

- Two consecutive left-button clicks at the **same** position within the window produce `{ type: 'doubleclick', clicks: 2 }`
- Right-click and middle-click are also tracked but only left-button clicks can produce multi-click events
- A single delayed click outside the window starts a new gesture

#### Triple-click

- Three consecutive clicks within the sliding window produce `{ type: 'tripleclick', clicks: 3 }`
- After a triple-click, the gesture tracker resets so a fourth click starts a fresh gesture

#### Context Menu

- **Right-click** is always emitted as a dedicated `{ type: 'contextmenu' }` event regardless of gesture window
- This lets consumers branch on `type === 'contextmenu'` without tracking button state

### Strict Input Validation <Badge type="warning">next</Badge>

Enable `configure({ useStrictInput: true })` to log warnings for every malformed SGR mouse sequence. Helps debug terminal emulators that send non-standard mouse protocols.

```ts
configure({ useStrictInput: true })
```

**Warning scenarios:**

| Input | Warning |
|-------|---------|
| `hello` | `no SGR prefix found in 5 byte(s): "hello"` |
| `junk\x1b[<0;10;5M` | `4 byte(s) before SGR prefix: "junk"` |
| `\x1b[<0;10` | `incomplete SGR sequence after prefix: "0;10"` |
| `\x1b[<66;10;5~` | `unknown wheel base code 66 (raw button=66); modifiers may be interfering` |
| `\x1b[<64;5;3~junk` | `4 byte(s) between SGR sequences are not valid mouse data: "junk"` |

When `useStrictInput` is `false` (default), all malformed sequences are silently consumed without warnings.

### Wheel Scroll Hooks for Plugins <Badge type="warning">next</Badge>

Plugins can subscribe to `wheel-up` and `wheel-down` events through the plugin event bus — useful for dashboards that display live scroll counters or animations.

```ts
let scrollCount = 0
api.on('wheel-up', (event) => {
  scrollCount++
  api.shared.set('scroll-ups', scrollCount)
})
api.on('wheel-down', (event) => {
  scrollCount--
  api.shared.set('scroll-downs', scrollCount)
})
```

The handler receives the full `MouseWheelEvent` (`wheel`, `x`, `y`, `modifiers`, `timestamp`). These hooks fire once per parsed SGR wheel sequence, so multi-tick bursts fan out to multiple handler calls.

## tree

```ts
tree<T = string>(message: string, options: TreeOptions<T>): Promise<T | undefined>
```

<Field name="message" type="string">The question to display.</Field>
<Field name="options" type="TreeOptions">Configuration object with tree, pageSize, initialExpanded, and colors.</Field>

Interactive prompt to select a leaf node from a hierarchical tree. Supports arrow key
navigation, expand/collapse branches with ▶/◀ or Space, and Enter to select a leaf.

```ts
const value = await tree('Choose a category:', {
  tree: [
    { label: 'Fruits', children: [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
    ]},
    { label: 'Colors', children: [
      { label: 'Red',   value: '#ff0000', disabled: true },
      { label: 'Green', value: '#00cc66' },
      { label: 'Blue',  value: '#3399ff' },
    ]},
  ],
})
// Use ↑↓ to navigate, → or Space to expand, ← or Space to collapse, Enter to select, Esc to cancel
```

<Callout variant="info">
  In non-TTY environments, leaves are listed with numbers and the user types a number.
</Callout>

**TreeOptions fields:**

| Field | Type | Default | Description |
|---|---|---|---|
| `tree` | `TreeNode<T>[]` | — | Array of top-level tree nodes |
| `pageSize` | `number` | `10` | Max visible items before scrolling |
| `initialExpanded` | `boolean` | `false` | If true, all branches start expanded |
| `colors` | `object` | — | Per-call color overrides |

**TreeNode fields:**

| Field | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Display text |
| `value` | `T` | — | Return value when selected (leaf nodes only) |
| `disabled` | `boolean` | `false` | If true, node cannot be expanded or selected |
| `expanded` | `boolean` | `false` | Initial expanded state for branches |
| `children` | `TreeNode<T>[]` | — | Child nodes (creates a branch) |

**Theme slots:** `tree.pointer`, `tree.selected`, `tree.label`, `tree.message`, `tree.branch`

```ts
const choice = await tree('Pick a node:', {
  tree: [
    { label: 'Root', children: [
      { label: 'Nested', children: [
        { label: 'Deep', value: 'deep' },
      ]},
    ]},
  ],
  initialExpanded: true,
  colors: {
    pointer: '#ff8800',
    branch: '#88ff00',
  },
})
```

## confirm

```ts
confirm(message: string, options?: ConfirmOptions | boolean): Promise<boolean>
```

<Field name="message" type="string">The question to display.</Field>
<Field name="options" type="ConfirmOptions | boolean">Pass `{ default: true, color?: ColorInput }`, a boolean shorthand, or omit for no default.</Field>

Prompts the user for a yes/no confirmation. Resolves `true` for yes, `false` for no.

```ts
const proceed = await confirm('Are you sure you want to continue?')
if (proceed) {
  // do something
}
```

<Callout variant="info">
  Pass `true` as second argument for a default of `true`: `confirm('Continue?', true)`.
</Callout>

## formatLog

```ts
formatLog(message: string, style?: (s: string) => string | 'info' | 'warn' | 'error' | 'success'): string
```

<Field name="message" type="string">The message to format.</Field>
<Field name="style" type="function | string">Style function or preset name (`'info'`, `'warn'`, etc.).</Field>

Returns a formatted log string with the configured prefix.

```ts
console.log(formatLog('Custom message', 'info'))
// [mytool] Custom message
```

<TerminalPreview command="node prompt.js">
{`\x1b[33m?\x1b[0m \x1b[1mAre you sure you want to continue?\x1b[0m (Y/n)
\x1b[1m[mytool]\x1b[0m Custom message`}
</TerminalPreview>

<Callout variant="note">
  `style` also accepts a custom function: `formatLog('msg', s => s.toUpperCase())`.
</Callout>
