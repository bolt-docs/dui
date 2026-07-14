# @dui-toolkit/plugin-diff

## 0.2.0

### Minor Changes

- [`2efd8ef`](https://github.com/bolt-docs/dui/commit/2efd8ef81aa5ab7a3ddf828a0a5b10f58024badf) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - **New plugin: `@dui-toolkit/plugin-diff`** — render unified, side-by-side, and word-level diffs with ANSI colors, hunk tracking, and multi-file support.

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
  import {
    diff,
    diffSideBySide,
    diffFiles,
    diffStat,
    diffWordsRender,
  } from "@dui-toolkit/plugin-diff";

  const r = diff(oldCode, newCode, { filename: "src/greet.ts" });
  console.log(r.output);

  console.log(
    diffStat(
      diffFiles([
        { oldPath: "a.ts", newPath: "a.ts", oldContent: "x", newContent: "y" },
        {
          oldPath: "b.ts",
          newPath: "b.ts",
          oldContent: "1\n2",
          newContent: "1\n3",
        },
      ])
    )
  );
  // "  2 files changed, +2, -1"
  ```

  ***

  **`@bdocs/dui`: standard-cross-ecosystem color-detection support** — `isColorSupported` now honors `FORCE_COLOR` alongside `NO_COLOR`.

  - **`FORCE_COLOR` env var** (any non-empty value other than `"0"`) forces colors on, overriding the TTY check — useful in CI, vitest, scripts, and logs of TTY-captured output
  - **`NO_COLOR` always wins**, per [no-color.org](https://no-color.org) — even an empty value disables colors
  - **`refreshColorSupport()`** exported as a re-evaluation helper for callers whose initial detection ran against stale env state

  ```ts
  // before: color support only checked stdout.isTTY + NO_COLOR
  // after: also checks FORCE_COLOR, matches chalk/picocolors/kleur

  import { setColorSupported, refreshColorSupport } from "@bdocs/dui";

  // Force-on for a CLI tool that wants ANSI even when piped:
  setColorSupported(true);

  // Re-evaluate from current env (e.g. after spawning a subprocess that
  // flipped FORCE_COLOR on the parent process):
  refreshColorSupport();
  ```

  Both additions are backward-compatible: code that already relied on the previous
  TTY-only detection keeps working unchanged.

- [`2efd8ef`](https://github.com/bolt-docs/dui/commit/2efd8ef81aa5ab7a3ddf828a0a5b10f58024badf) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - feat: new `@dui-toolkit/plugin-diff` — terminal diff viewer

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

### Patch Changes

- Updated dependencies [[`dfceb01`](https://github.com/bolt-docs/dui/commit/dfceb0181c85769d66137eac90827f681d988543), [`2efd8ef`](https://github.com/bolt-docs/dui/commit/2efd8ef81aa5ab7a3ddf828a0a5b10f58024badf)]:
  - @bdocs/dui@0.5.0

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
