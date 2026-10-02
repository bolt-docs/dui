# Roadmap

Status of the DUI monorepo: released versions and the work queued behind them.

## Release state

`@bdocs/dui@0.7.0` (stable) is the current release, promoted from the
`next` pre-release (`0.7.0-next.1 → 0.7.0-next.8`) via `changeset pre
exit` + `changeset version`.

| Package | Released |
| `@bdocs/dui` | `0.7.0` |
| `@dui-toolkit/plugin-chart` | `0.4.1` |
| `@dui-toolkit/plugin-diff` | `0.4.0` |
| `@dui-toolkit/plugin-image` | `0.4.0` |
| `@dui-toolkit/plugin-markdown` | `0.4.0` |
| `@dui-toolkit/plugin-qrcode` | `0.3.1` |
| `@dui-toolkit/plugin-notify` | `0.1.1` |
| `@dui-toolkit/plugin-tui` | `0.1.1` |

Docs for 0.7.0 live at `/docs/v0.7.0`; `/docs/next` now tracks the
0.8.0 cycle. All changesets are consumed — nothing is pending release.

Two lines are now active:

- **`0.7.x` (patch / maintenance)** — user-facing bug fixes only, cut from
  the `fix/v0.7.x` branch. No new features, no breaking changes. See
  [Maintenance line: 0.7.x](#maintenance-line-07x).
- **`0.8.0` (minor / strategy)** — the engine-diet + adoption cycle planned
  below. See [Planned for 0.8.0](#planned-for-080).

## Shipped in 0.7.0 (changesets consumed)

- **Native widget set** (`v0.7.0-new-widgets`) — `toast()` center,
  `createStatusBar()`, `banner()` (embedded ANSI Shadow figlet),
  `richtext()`, `link()`/`linkify()` (OSC 8), `copyToClipboard()`
  (OSC 52) and the `tabs` label fix.
- **Multi-field forms** (`v0.7.0-form-number-textarea`) — `form()` with
  text / password / select / number / textarea fields, per-field
  validation, Tab-submits-on-last-field.
- **Command palette** (`v0.7.0-palette-tests-surface-perf`) —
  `palette()` with fuzzy search, `wheelSensitivity`, full mouse support
  (click / wheel / hover), and `disabled`-item skipping on both keyboard
  and mouse paths.
- **Fuzzy engine** — `fuzzyMatch` / `highlightFuzzy` / `filterFuzzy`
  plus `searchable` mode on `select` / `multiselect` / `tree`.
- **Logger v2 + testing utils** (`v0.7.0-logger-testing-presets`) —
  leveled logging with `LOG_LEVEL` filtering, file transport and JSON
  output; `createMockTty()` / `withMockTty()` / `snapshotWidget()`.
- **Alt screen** — `withAltScreen()` and cursor helpers.
- **Accessibility layer** — every widget honors plain mode, with
  `NO_COLOR` / `TERM=dumb` / screen-reader detection and the shared
  `formatActionsPlain()` grammar.
- **CSS Color 4** — space-separated `rgb()` / `hsl()` / `oklch()`, hue
  units, `none` keywords and percentage alpha.
- **Rendering perf** — ASCII fast path in `RenderSurface.write()` and a
  single rebindable SGR `delta` per `flush()`/`render()`; measured on
  the `surface-batch` benchmark: `write()/fill()` ~16 → ~577 ops/sec,
  `render()` full→ANSI ~20 → ~227 ops/sec (median of 3, vs the
  pre-optimisation code). Exposed as `pnpm bench` and excluded from the
  turbo cache, since a cached benchmark replays stale numbers.
- **Bug fixes** — 16-colour SGR parsing in `json-output`, truecolor
  probing for `TERM=xterm-kitty`-style terminals, grapheme/CJK width
  fixes across `surface`, `input()`, `form()`, `toast` and `fuzzy`,
  markdown tokenizer hang on unmatched delimiters, `RenderSurface`
  skipping CJK/emoji glyphs without reserving their cells, bold→dim
  losing the `dim` attribute, `pie()` `progress` being a no-op, and
  `mergeBatch()` reading the first item instead of the highest-priority
  one.
- **CI** — build/test/bench workflow, plus a type-level regression that
  tests cannot catch: `ClickableArea["type"]` is now the exported
  `MouseAreaType` and includes `"palette"`.

## Shipped in 0.6.0 (changesets consumed)

- **Accessibility layer** (`v0.6.0-accessibility-layer`) — `isPlainMode()`
  auto-detects `NO_COLOR`, `TERM=dumb`, and screen readers (brltty /
  VoiceOver / NVDA / JAWS); `isReducedMotion()`; `configure({ plain: true })`
  force-override; text-only fallback across every widget.
- **Interactive prompts overhaul** (`v0.6.0-interactive-improvements`) —
  Plugin API v2 (`usePluginAsync`, `awaitPluginsReady`, lifecycle hooks),
  wheel scrolling with `wheelSensitivity`, `multiselect` drag-to-reorder
  with `dragSource`/`dropTarget` slots, `MouseEvent` discriminated union.
- **Preset palettes** (`v0.6.0-preset-palettes`) — `presets.dracula`,
  `nord`, `solarized`, `catppuccin`, `gruvbox`.
- **Notify plugin** (`notify-plugin`, `notify-plugin-accessibility`,
  `notify-plugin-os-action-capture`) — OS / OSC / TUI-toast / bell
  routing, plain-mode collapse, libnotify + MessageBox action capture.

- **Native widget set** (`v0.6.0-native-widget-set`) — `badge`, `kbd`,
  `section`, `tabs`, `modal`, `grid` + extended box border styles
  (`thick`, `ascii`, `dashed`, `dotted`).
- **Animation + color control** (`v0.6.0-animation-color-control`,
  `v0.6.0-keyframe-extensions`) — 25 easing presets, springs,
  `cubic-bezier()`, `animateProgress`, `createTimeline`, keyframe
  fg/bg interpolation, plus numeric channel interpolation
  (`numbers`), `{name}` content templates, CSS-style `direction`
  (`normal`/`reverse`/`alternate`/`alternate-reverse`), and finite
  `iterations` (superset of `loop`).
- **Rendering infrastructure** — `RenderSurface` + overlays
  (`v0.6.0-render-surface`), output batching / flicker reduction
  (`v0.6.0-output-batching`), pagination (`v0.6.0-pagination`), JSON
  output (`v0.6.0-json-output`), terminal capabilities detection
  (`v0.6.0-capabilities`).
- **Plugin upgrades** — animated QR (`v0.6.0-animated-qr`), Kitty
  graphics protocol (`v0.6.0-kitty-protocol`), optional-sharp image
  loader (`v0.6.0-image-loader`), diff move detection
  (`v0.6.0-diff-move-detection`), markdown autolinks + nested inline
  parsing (`v0.6.0-markdown-autolinks`, `v0.6.0-markdown-nested-inline`),
  notify queue (`v0.6.0-notify-queue`), chart value axes
  (`v0.6.0-chart-min-max`).

## Planned for 0.8.0

### Strategy

Every item below is a gap verified in the tree or in the npm registry, not
a promise. Nothing is scheduled yet.

The target is **not** Ink. Measured npm downloads (last month):

| Package | Downloads/mo |
| | ---: |
| `chalk` | 2,110,381,380 |
| `ora` | 375,165,811 |
| `prompts` | 254,594,766 |
| `inquirer` | 201,750,184 |
| `listr2` | 177,777,253 |
| `enquirer` | 144,403,674 |
| `cli-table3` | 139,155,433 |
| `boxen` | 120,606,149 |
| `@clack/prompts` | 102,530,382 |
| `ink` | 29,036,069 |
| `@opentui/core` | 3,620,944 |
| **`@bdocs/dui`** | **1,241** |

Ink is the *tenth* entry on that list. The realistic position for 0.8.0 is
**the zero-dependency, accessible, CI-safe output layer that replaces
`chalk` + `ora` + `boxen` + `cli-table3` + `inquirer` + `listr2` +
`@clack/prompts`**:

- **One import instead of seven.** chalk v5 is already dep-free, so the
  pitch against chalk is "colors *and* boxes *and* tables *and* prompts
  *and* spinners in a single package".
- **Zero runtime deps** against 6–30 for every alternative.
- **Three capabilities none of them have at all:** a plain-mode
  accessibility layer with screen-reader *detection*, ANSI→structured-JSON
  output for CI capture, and a real animation engine.
- **Never hangs in CI.** For this audience that is the headline feature,
  not a bugfix — see the 0.7.x line below.

Ink stays a documented comparison and a future bridge, not the engine.
Beating Ink at Ink is not reachable in 0.8.0: the gap is categorical
(no `render()`, no reconciler, no layout tree, no flexbox), and closing it
means a Yoga port, which contradicts the zero-dependency constraint in
`spec.md`.

### Baseline (measured on `master` at `0.7.0`)

| Metric | Value |
| | ---: |
| `dist/index.mjs` (published) | 336,700 B raw / 88,068 B gzip |
| `dist/index.d.mts` | 130,673 B |
| `import { box }` → esbuild bundle + minify | **44,491 B** |
| Public exports (`src/index.ts`) | ~162 value + ~112 type |
| Tests passing | 1,483 (1,009 core + 474 across 7 plugins) |
| `TODO` / `FIXME` / `@ts-ignore` in `src/` | 0 |
| Runtime dependencies | 1 (`string-width`) |
| `sideEffects` declared | **no package** |
| Bundle-size gate in CI | none |

### Wave 1 — Engine diet

Ordered by measured impact, not by effort. The goal is a plausible
single-file binary (`bun build --compile`) without a layout engine.

| # | Change | Measured effect |
| | --- | --- |
| 1.1 | `minify: true` in all 8 `tsdown.config.ts` (output ships unminified today) | dist **336.7 KB → 146.4 KB (−57%)**; gzip **88.1 → 44.3 KB (−50%)** |
| 1.2 | `"sideEffects": false` in all 8 `package.json` | Absent everywhere. Required for webpack to drop unused modules from `node_modules`. |
| 1.3 | `/* @__PURE__ */` on `presets.ts:651` (`Object.freeze`) and on `color.ts` table construction | Proven with an esbuild `--metafile` run: `box`-only **44,534 → 36,101 B (−19%)**. 8.4 KB of theme palettes ship in every build today. |
| 1.4 | Replace `string-width` with an internal width module | **−17,514 B = 39% of a `box`-only bundle** (`emoji-regex` 14,157 + `get-east-asian-width` 4,055 + `strip-ansi` + `ansi-regex`). Also makes the "zero-dependency" claim in `docs/*/overview/index.mdx` true. |
| 1.5 | `theme.ts:409` — hoist the 130-entry literal out of `getDefaultFn()` | It is rebuilt on **every** `resolveColor()` call — GC pressure in spinner/animation loops. |
| 1.6 | Lazy-load the `banner.ts` ANSI Shadow font (~23 KB) and `presets.ts` | Both are pure leaves; neither should appear in a `box` build. |
| 1.7 | `shiki` → dynamic import + optional dep; `sharp` → `optionalDependencies`; drop the CJS `qrcode`/`yargs`/`pngjs` chain | `shiki` is a *static* import today (`dui-markdown/src/syntax.ts:2`) and is the dominant binary cost for markdown users. `qrcode` is CJS with no ESM entry, which disables shaking for its whole graph, and drags in a CLI arg parser. |
| 1.8 | `size-limit` in CI with per-entrypoint budgets, plus an esbuild `--metafile` test asserting `banner`/`presets` are dropped | Makes the win permanent. No size gate exists anywhere today. |

**Explicit non-goal:** `tsdown --unbundle` was measured and does **not**
help — 44,534 B vs 44,491 B, i.e. nothing. Preserving module structure is
not the lever; purging import-time side effects and dropping the
dependency tree is. Do not spend time there.

**Projected result:** `box`-only from 44.5 KB → ~12–15 KB; full core dist
from 336.7 KB → ~115–125 KB.

Open decisions to settle during implementation:

- **Width precision bar for 1.4** — how exact must CJK/emoji widths stay?
  The existing width tests are thorough and must be rewritten, not deleted.
- Whether `.d.mts` ships unminified (it should — editor hovers) while
  `index.mjs` is minified.

### Wave 2 — API coherence

- **2.1 Unify the item model.** `tabs()` takes `string[]` while `select` /
  `multiselect` / `tree` / `palette` / `form` take `{label, value}`. That
  inconsistency is exactly why `examples/20-presets/index.ts` fails to
  compile. One `Item<T>` across the board. **Breaking** for `tabs()`.
- **2.2 Handle `SIGWINCH` → `RenderSurface.resize()`**, and actually emit
  the already-declared-but-never-emitted `terminal-resize` plugin event
  (`plugin.ts:51`). Today, resizing mid-spinner corrupts output.
- **2.3 `withTerminal({columns, rows}, fn)`** so widgets render
  deterministically at a fixed width for snapshot tests. There is no
  way to render at width 40 today without faking a TTY.
- **2.4 Drop the React-shaped names** — `usePlugin` → `registerPlugin`,
  `usePluginAsync` → `registerPluginAsync`. In a library that sells "no
  React" these read as hooks and mislead. Keep deprecated aliases.
- **2.5 Guard all 5 prompts** against `options === undefined`. Today
  `select()` with no options throws `Cannot destructure property 'choices'
  of 'options' as it is undefined` instead of a clear message.
- **2.6 Stop exporting the deprecated `runRenderHook`**, and make the other
  two render-hook entry points coherent.

### Wave 3 — Adoption surface

- **3.1 npm metadata** — the highest-leverage strings in the repo.
  `description` is stale by ~4 minor versions ("Terminal UI utilities —
  boxes, colors, logging, lists, and dividers") and hides every
  differentiator. Add `keywords` (`tui`, `terminal-ui`, `prompt`,
  `accessibility`, `a11y`, `ansi`, `zero-dependencies`, …), `engines`,
  `funding`, GitHub `topics`, and an OG image (`website/public/` has only
  two SVGs, so npm/Slack/Twitter render a blank card).
- **3.2 Migration guides**, one per target: chalk, ora, boxen, cli-table3,
  inquirer, listr2, @clack/prompts. Side-by-side, runnable. This is the
  actual conversion mechanism, not the feature list.
- **3.3 "Why not X" comparison page** covering the 7 targets plus Ink and
  OpenTUI — honest about the gaps (no flexbox, no `render()`).
- **3.4 Document `tree()` (837 LOC), `json-output` (547), `mouse` (585) and
  `RenderSurface` (678)** — all completely undocumented today.
- **3.5 Generate `llm.mdx`, `ai-agents.mdx` and `SKILL.md` from the real
  export list.** They currently teach a 0.2.0-era API (28 functions vs
  ~162) and `SKILL.md` still declares `version: 0.6.0`. Generate them from
  `index.ts` in a script so they cannot drift again — today they actively
  generate wrong code.
- **3.6 Reframe the homepage** around the strategy rather than
  "Terminal UI utilities".
- **3.7 Position `render()` as a 0.9.0 exploration** for React/TUI-app
  users, so the demand is captured without spending Wave 1's size budget
  on a layout engine.

### Feature backlog

Carried over, still valid:

- **Document `plugin-tui`** — it is the least visible package in the
  monorepo: no README, no `plugins/tui.mdx`, and it is absent from
  `docs/*/plugins/meta.json`, yet it already ships `BaseWidget`,
  `TextInput`, `SelectList`, `Modal`, `StatusBar` and `tuiPlugin`.
  Documentation first; API stability after.
- **Notify exit-event signalling** — `osc.ts` documents the gap itself:
  Kitty reports click coordinates but there is no way to tell the host the
  notification was dismissed, so `onDismiss` cannot fire for OSC backends.
- **`input()` history + autocomplete** — no `history`, no `completion`
  anywhere in `input.ts`. It is the only prompt in the set without either,
  and both are cheap next to the fuzzy engine that already exists.
- **An interactive `table()`** — `table()` and `tabs()` are pure
  functions returning `string`, unlike `palette()` / `form()` / `select()`.
  A keyboard-navigable table (sortable headers, row selection, paging)
  closes the last gap between the static and interactive widget halves.

## Maintenance line: 0.7.x

Branch: **`fix/v0.7.x`**. Patch releases only — user-facing bug fixes and
CI/test infrastructure. **No new features, no breaking changes.** Waves 1–3
above stay on `master` for 0.8.0.

Two of these are real defects that affect every consumer, and one of them
is a hard blocker for the strategy in 0.8.0.

### 0.1 — Interactive prompts hang forever without a TTY (P0)

`confirm()` has a non-TTY guard (`prompt.ts:23`). `input`, `select`,
`multiselect`, `tree`, `palette` and `form` each have a non-TTY fallback,
but every one of them is built on `readline.question()` **without a
`close` handler** — and on stdin EOF that callback is never invoked, so the
returned promise never settles and the process deadlocks.

```bash
(sleep 30) | node -e 'import("@bdocs/dui").then(m => m.input("Name?"))'
# today: hangs, exit 124
# after: resolves to the default, exit 0
```

Minimal repro of the root cause — on EOF readline fires `close` but never
the `question` callback:

```
Q: >>> rl CLOSE fired, question callback called = false
>>> 1500ms later, question callback called = false => PROMISE WOULD HANG
```

Affects CI, Docker without `-t`, pipelines, npm scripts, and `< /dev/null`.
For the chalk/ora audience this is *the* adoption blocker: the first thing
any team does is run their tool in GitHub Actions.

Fix: one shared helper (e.g. `readAnswer()`) used by all six prompts, so
the EOF path cannot drift between them again, plus regression tests.

### 0.2 — `readFileSync(package.json)` at import time (P1)

All 8 packages read their own version at module scope:

```ts
export const DUI_VERSION: string = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;
```

Present in `packages/dui/src/plugin.ts:26` and in the `plugin.ts` of all 7
toolkit packages. Two problems:

- **Binary blocker.** `new URL("../package.json", import.meta.url)` resolves
  against the module's file URL. Under `bun build --compile`,
  `node --experimental-sea`, `pkg` or `deno compile` there is no such path,
  so this **throws at import time and takes down the whole CLI**.
- **Tree-shaking blocker.** An unremovable top-level call whose result
  escapes into an exported binding. It also forces `node:fs` into the graph.

Fix: inline the version at build time (tsdown `define`). A version-parity
test already exists in `packages/dui/tests/plugin.test.ts:89` to update.

### Remaining 0.7.x items

| # | Change | Status |
| | --- | --- |
| 0.4 | `turbo.json`: `"test": { "dependsOn": ["^build"] }` | **done** — `pnpm test` used to die on a fresh clone with `Failed to resolve entry for package "@bdocs/dui"`; the workflows hid it by running `pnpm build` first. Verified with every `dist` and the turbo cache removed: 1,498 tests pass from a cold start. |
| 0.5 | Fix the `sharp` type errors in `dui-image`; add the missing `dui-tui/tsconfig.json` | **done** — 7 errors, not 3, all from one root cause: `sharp` typed as `typeof import("sharp")` (the module namespace) where the callable default export was needed. Added a `SharpModule` alias. `dui-tui` also needed `TData extends object`, which `setData()`'s `Object.assign` has always required. |
| 0.6 | Fix the real type errors in `examples/` | **done** — 4 of the 7 traced back to `DuiTheme` rejecting plugin namespaces (`diff`, `notify`), which the diff docs page documents as supported. See 0.6 below. |
| 0.7 | Add a `tsc --noEmit` CI gate | **done** — `scripts/typecheck.mjs`, run per package against `src/`. Fails loudly if a package has no `tsconfig.json`, since a skip would recreate the `dui-tui` bug. Both failure paths verified by hand. |
| 0.8 | Close the already-resolved ROADMAP items | **done** — the 8 website `tsc` errors and the "67 broken cross-references" were both already fixed; `npx tsc --noEmit` and `npx boltdocs build` in `website/` exit clean. |

### 0.6 in detail — plugin theme namespaces

`DuiTheme` declared only the core slots, but `getFromTheme` walks an
arbitrary dotted path and the plugin API exposes `registerThemeSlot`, so a
plugin's namespace cannot be known at compile time. The documented form

```ts
configure({ theme: { diff: { add: "#88ff88" } } });
```

was a type error even though it worked at runtime — which is why three
examples failed with `'diff' does not exist in type 'DuiTheme'`. **The
types were contradicting the docs.**

Adding `[key: string]: unknown` fixes it without weakening the built-in
slots: `theme: { box: { borderr: "red" } }` still fails with `TS2561`
against `BoxTheme`, because declared properties win over an index
signature. Only a misspelled *namespace* slips through, which is the
unavoidable cost of supporting plugin namespaces at all.

**Deliberately excluded from 0.7.x:** the npm publish credentials
(`release.yml` has no `registry-url`, and `.npmrc` has no
`_authToken=${NPM_TOKEN}` line, so the automated publish cannot work —
0.7.0 went out manually). Releases are being cut by hand for now, so this
is not blocking.

## Next steps

Order they were landed in on `fix/v0.7.x`, so each commit leaves the repo
publishable and the CI gate never goes red:

1. **0.5** — unblock typechecking. (`b7aa880`)
2. **0.7** — add the `tsc --noEmit` gate. (`0fa9eeb`)
3. **0.1** — the P0 non-TTY deadlock + regression tests. (`b0e8d61`)
4. **0.2** — inline the package versions at build time. (`8ac316a`)
5. **0.4** — make `pnpm test` self-sufficient. (in `8ac316a`)
6. **0.6** — plugin theme namespaces + the examples. (`d314bf9`)

**Remaining before cutting the changeset:**

- `pnpm bench` has not been re-run since these changes.
- The changeset itself, then `changeset version`.

⚠️ Watch the 0.7.0 `plugin-tui` incident: a duplicated `peerDependency`
silently escalated a patch to `1.0.0`. Inspect the changeset diff before
running `changeset version`.

Then, back on `master` for 0.8.0: Wave 1 → Wave 2 → Wave 3, as four
separate changesets so a slipping wave does not hold the release.

### Verification state at the end of 0.7.x

| Check | Result |
| --- | --- |
| `pnpm test` (all 8 packages, cold) | 1,498 passing — 1,024 core in 62 files + 474 across 7 plugins |
| `pnpm typecheck` | clean in all 8 packages |
| `pnpm build` | clean, 8 versions inlined |
| `examples/ tsc --noEmit` | 0 errors (was 7) |
| Non-TTY deadlock | fixed, 11 regression tests |
| Binary import (no `package.json`) | loads and reports the right version |

The `node:fs` import is now gone from all 7 toolkit dists. The core keeps
its own because `logger.ts` genuinely reads files.

### Known flake: 5s timeouts under CPU contention

Found while verifying this branch. **Pre-existing — it reproduces on
`master` too**, so it is not a regression from 0.7.x.

Under saturating CPU load (`yes` × 8 on 8 cores), 1–8 core tests fail with
`Test timed out in 5000ms`. The set varies per run, which is what marks it
as contention rather than a real defect:

| Branch | Runs | Failing files |
| --- | --- | --- |
| `master` | 2 | `banner`, `bug-hunting`, `logger-v2`, `tree-lazy` |
| `fix/v0.7.x` | 2 | `banner`, `bug-hunting-v3`, `form`, `grid`, `multi-progress`, `steps`, `tabs` |

Not one file overlaps consistently, and every failure is a timeout rather
than an assertion mismatch. The 5s default is simply not enough headroom
when 8 vitest workers share 8 already-busy cores.

Unverified: whether these are all the same root cause. The fix is probably
raising `testTimeout` in `packages/dui/vitest.config.ts`, or replacing the
sleep-and-poll patterns with condition-based waits — the same treatment
the `dui-notify` queue tests already received (see the "queue flake —
FIXED" entry above). Worth doing before it eats a real CI run, but it is
its own task rather than part of this patch line.