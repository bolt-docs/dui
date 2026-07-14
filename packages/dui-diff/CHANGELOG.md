# @dui-toolkit/plugin-diff

## 0.1.0

### Initial release

Render text diffs in the terminal with full theming support.

- **`diff()`** — unified diff with canonical `@@ -A,B +C,D @@` hunk headers, real line numbers, and configurable gutter styles (`bracket` / `bar` / `compact` / `arrow`).
- **`diffSideBySide()`** — column-aligned side-by-side view with proper row pairing and word-level intra-line highlighting.
- **`diffWordsRender()`** — Myers-style word diff returned as ANSI-formatted `old` and `new` strings.
- **`diffFiles()`** / **`diffDirectories()`** — multi-file diff aggregation with `NEW` / `MOD` / `DEL` badges and per-file stats.
- **`diffStat()`** — one-line summary suitable for CI logs.
- **`diffPlugin`** — `usePlugin()` integration with theming slot hooks.
- **Theming** — 10 theme slots (`diff.add`, `diff.del`, `diff.context`, `diff.hunk`, `diff.linenum`, `diff.gutter`, `diff.fileHeader`, `diff.stat`, `diff.word.add`, `diff.word.del`) configurable through `configure({ theme: { diff: { … } } })` or per-call overrides.
- **Zero `any` types**, strict TypeScript.
- Built on `jsdiff`'s `diffLines` + jsdiff/`diffWordsWithSpace`, no additional heavy dependencies.
