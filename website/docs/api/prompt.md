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
