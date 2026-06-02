---
title: List
sidebarPosition: 4
description: Bullet points, numbered lists, and task checklists.
---

```ts
import { bullet, ordered, tasks } from '@bdocs/dui'
```

## `bullet(items: string[]): string`

Unordered list with `•` markers.

```ts
bullet(['Item A', 'Item B', 'Item C'])
// • Item A
// • Item B
// • Item C
```

## `ordered(items: string[]): string`

Numbered list.

```ts
ordered(['First', 'Second', 'Third'])
// 1. First
// 2. Second
// 3. Third
```

## `tasks(items: TaskItem[]): string`

Check/cross task list.

```ts
tasks([
  { label: 'Install', done: true },
  { label: 'Configure', done: false },
])
// ✔ Install
// ✘ Configure
```

### TaskItem

```ts
interface TaskItem {
  label: string
  done: boolean
}
```
