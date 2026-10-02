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

Proposed, not committed — each item is a gap verified in the tree, not a
promise. Nothing is scheduled yet.

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