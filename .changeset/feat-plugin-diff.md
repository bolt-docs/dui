---
'@dui-toolkit/plugin-diff': minor
---

feat: new `@dui-toolkit/plugin-diff` — terminal diff viewer

Render text diffs in the terminal with the same level of polish as the rest
of the DUI toolkit. Built on `jsdiff` + `@bdocs/dui` core (no new heavy deps).

- **`diff()`** — unified diff with canonical `@@ -A,B +C,D @@` hunk headers,
  real line numbers in the gutter, four gutter styles (`bracket` / `bar` /
  `compact` / `arrow`), and word-level intra-line highlighting by default.
- **`diffSideBySide()`** — column-aligned two-pane diffs with proper row
  pairing so modified pairs stay aligned even with asymmetric adds/deletes;
  word highlights are applied to the modified column.
- **`diffWordsRender()`** — Myers-style word diff that returns the
  ANSI-painted `old` and `new` strings for one modified line pair.
- **`diffFiles()`** — multi-file aggregate with `NEW` / `MOD` / `DEL`
  badges, per-file hunk headers, and totals at the bottom.
- **`diffDirectories()`** — async directory-tree walker that uses
  `diffFiles()` to produce the same multi-file output.
- **`diffStat()`** — one-line summary widget suitable for CI logs:
  `2 files changed, +12, -3` or `1 hunk, +3, -1`.
- **`diffPlugin`** — `usePlugin()` integration.
- **Theming** — 10 theme slots (`diff.add`, `diff.del`, `diff.context`,
  `diff.hunk`, `diff.linenum`, `diff.gutter`, `diff.fileHeader`,
  `diff.stat`, `diff.word.add`, `diff.word.del`) configurable through
  `configure({ theme: { diff: { … } } })` or per-call override options.
- **Robustness** — CRLF/CR line endings are normalized before line
  counting; identical strings produce an empty result with no spurious
  hunks; CR-only and mixed endings stay consistent across `diff()` and
  `diffSideBySide()`.
- **Strict types** — zero `any`, fully typed public API.
- **Tests** — `tests/diff.test.ts` covers 30+ cases including CRLF input,
  multi-hunk files, word-level diffs, multi-file aggregation, theme
  configuration, and identical-input behaviour.
- **Docs** — full EN + ES API reference at
  `website/docs/plugins/diff.mdx`.
- **Example** — `examples/12-diff/index.ts` demos unified, side-by-side,
  word-level, multi-file and theme-customized output.
