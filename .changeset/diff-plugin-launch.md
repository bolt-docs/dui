---
'@dui-toolkit/plugin-diff': minor
'@bdocs/dui': minor
---

**New plugin: `@dui-toolkit/plugin-diff`** — render unified, side-by-side, and word-level diffs with ANSI colors, hunk tracking, and multi-file support.

- **`diff(old, new, options?)`** — unified, git-style diff with correct `@@ -A,B +C,D @@` hunk headers, configurable context, line numbers, and four gutter styles (`bracket` / `bar` / `compact` / `arrow`)
- **`diffSideBySide(old, new, options?)`** — two-column view with column-aligned rows and per-row line numbering; modified pairs get word-level intra-line highlights
- **`diffWords(old, new)`** / **`diffWordsRender(oldLine, newLine)`** — Myers-style word diff over whitespace-punctuated tokens; the renderer emits ANSI ready to drop into any DUI surface
- **`diffStat(result)`** — one-line summary widget like `1 file changed, +12, -3`
- **`diffFiles([{...}])`** — multi-file composition with `NEW` / `DEL` / `MOD` status badges and per-file stats
- **`diffDirectories(oldDir, newDir)`** — recursively walks two directory trees and produces the same multi-file output
- **`diffPlugin`** — `usePlugin(diffPlugin)` integration hook
- Fully themed through `@bdocs/dui`'s `DuiTheme.diff.*` slots (`add`, `del`, `context`, `hunk`, `linenum`, `gutter`, `fileHeader`, `stat`, `wordAdd`, `wordDel`)
- Every color can be overridden per-call via `DiffOptions` (`addColor`, `delColor`, …) or globally via `configure({ theme: { diff: {...} } })`
- Powered by [`jsdiff`'s `structuredPatch`](https://github.com/kpdecker/jsdiff) so EOF-newline edge cases and multi-hunk tracking are correct out of the box
- Built on raw SGR emission (not `@bdocs/dui`'s `colors.X` runtime gate) so the output is deterministic across vitest worker pools and CI environments

```ts
import { diff, diffSideBySide, diffFiles, diffStat, diffWordsRender } from '@dui-toolkit/plugin-diff'

const r = diff(oldCode, newCode, { filename: 'src/greet.ts' })
console.log(r.output)

console.log(diffStat(diffFiles([
  { oldPath: 'a.ts', newPath: 'a.ts', oldContent: 'x', newContent: 'y' },
  { oldPath: 'b.ts', newPath: 'b.ts', oldContent: '1\n2', newContent: '1\n3' },
])))
// "  2 files changed, +2, -1"
```

---

**`@bdocs/dui`: standard-cross-ecosystem color-detection support** — `isColorSupported` now honors `FORCE_COLOR` alongside `NO_COLOR`.

- **`FORCE_COLOR` env var** (any non-empty value other than `"0"`) forces colors on, overriding the TTY check — useful in CI, vitest, scripts, and logs of TTY-captured output
- **`NO_COLOR` always wins**, per [no-color.org](https://no-color.org) — even an empty value disables colors
- **`refreshColorSupport()`** exported as a re-evaluation helper for callers whose initial detection ran against stale env state

```ts
// before: color support only checked stdout.isTTY + NO_COLOR
// after: also checks FORCE_COLOR, matches chalk/picocolors/kleur

import { setColorSupported, refreshColorSupport } from '@bdocs/dui'

// Force-on for a CLI tool that wants ANSI even when piped:
setColorSupported(true)

// Re-evaluate from current env (e.g. after spawning a subprocess that
// flipped FORCE_COLOR on the parent process):
refreshColorSupport()
```

Both additions are backward-compatible: code that already relied on the previous
TTY-only detection keeps working unchanged.
