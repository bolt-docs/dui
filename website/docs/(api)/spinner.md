---
title: Spinner
sidebarPosition: 10
description: Animated terminal spinners with braille frames.
---

```ts
import { createSpinner } from '@bdocs/dui'
```

## `createSpinner(options?: SpinnerOptions): Spinner`

Creates an animated spinner for long-running operations.

```ts
const spinner = createSpinner({ text: 'Installing dependencies...' })
spinner.start()

// ... do async work ...

spinner.succeed('Installed!')
// or
spinner.fail('Installation failed')
// or
spinner.warn('Had some issues')
// or
spinner.info('Some info')
// or
spinner.stop()
```

### SpinnerOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `text` | `string` | `''` | Text to display next to the spinner |
| `color` | `string` | `'cyan'` | Spinner color |
| `frames` | `string[]` | braille frames | Custom animation frames |

### Spinner API

| Method | Description |
|--------|-------------|
| `start()` | Start the spinner animation |
| `stop()` | Stop and clear |
| `succeed(text?)` | Stop with ✔ prefix |
| `fail(text?)` | Stop with ✘ prefix |
| `warn(text?)` | Stop with ⚠ prefix |
| `info(text?)` | Stop with ℹ prefix |
| `update(text)` | Update the displayed text |
