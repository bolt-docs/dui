# Roadmap

Status of the DUI monorepo: released versions and the work queued behind them.

## Release state

`@bdocs/dui@0.6.0` (stable) shipped together with all plugins.
The `next` pre-release (`0.6.0-next.0 → 0.6.0-next.2`) was promoted
via `changeset pre exit` + `changeset version`.

| Package | Released |
| `@bdocs/dui` | `0.6.0` |
| `@dui-toolkit/plugin-chart` | `0.4.0` |
| `@dui-toolkit/plugin-diff` | `0.3.0` |
| `@dui-toolkit/plugin-image` | `0.3.0` |
| `@dui-toolkit/plugin-markdown` | `0.3.0` |
| `@dui-toolkit/plugin-qrcode` | `0.3.0` |
| `@dui-toolkit/plugin-notify` | `0.1.0` |

## Shipped in 0.6.0 (changesets consumed)

### v0.6.0 — accessibility, interactive, widgets + rendering

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

## Recently completed (working tree)

- **Plain mode for every widget** — `modal`, `tabs`, `kbd` now honor
  `isPlainMode()` (their `format*Plain` helpers existed but were never
  wired); `list` (`bullet`/`ordered`/`tasks`), `steps`, `table`, and
  `grid` gained plain fallbacks; shared `formatActionsPlain` is the
  single source of truth for the `actions:` block consumed by both
  `box()` and `dui-notify`'s `plainEmit`.
- **Core hardening** — modal button rows grow the box instead of
  wrapping mid-token; tabs labels sanitized (newline/tab/ANSI);
  `steps` connector color consistency; box/table/grid narrow-width +
  CJK alignment fixes.
- **Chart precision** (`dui-chart`) — `pie()` `progress` was a no-op
  (the formula cancelled `p` out: `60.0%` at half progress); now the
  revealed fraction and percentage scale with progress. `line()`
  labels positioned with `visibleLength` instead of `String#length`
  (which counted ANSI escape bytes); `bar()` width math is
  CJK-cell-aware. `bar()`/`pie()` gained explicit `min`/`max` axes
  with clamped, negative-safe scaling — mixed-sign data renders from
  a zero baseline instead of throwing `RangeError` on
  `"█".repeat(negative)` (changeset'd in `v0.6.0-chart-min-max`;
  the earlier precision fixes are not yet changeset'd).
- **Notify precision** (`dui-notify`) — `mergeBatch()` took the
  *first* item's title/ttl/sound/actions instead of the
  highest-priority one (an `error` toast could show an earlier
  `info` title); now the highest-priority item drives the batch.
- **CSS Color 4 syntax** (core `color.ts`) — space-separated
  `rgb()`/`rgba()`, `hsl()` hue units (`deg`/`turn`/`rad`) + negative
  hue, slash + percentage alpha across `rgb`/`hsl`/`oklch`,
  `oklch()` legacy comma form, case-insensitive format dispatch
  (was: uppercase `RGB(...)` rejected while regexes were `/i`),
  `oklch()` hue units (`deg`/`turn`/`rad` + negative, both space and
  comma forms), percentage alpha in `rgb()`/`rgba()` (was only
  `hsl`/`oklch`), and the `none` keyword in any channel of
  `rgb`/`rgba`/`hsl`/`hsla`/`oklch` (missing component → 0,
  missing alpha → 1; case-insensitive) — completing CSS Color 4.
  `api/color.mdx` (en + es) documents every accepted variation
  (comma / space / slash alpha / hue units / `none`) with verified
  examples.
- **Website redesign** — terminal aesthetic (mono UI fonts, sharp
  corners, no macOS traffic lights, no code-block backgrounds),
  `TerminalPreview` restored for all home demos (replacing the
  reverted xterm.js approach), real scannable 29×29 QR preview, docs
  reorganization (troubleshooting last, links fixed, `es` meta
  added, API table aligned with real exports).

## Documentation gaps (docs site)

- **Spanish API pages** — **FIXED**: `es/api` now has all 25 pages
  (`badge`, `grid`, `kbd`, `modal`, `presets`, `section`, `tabs` were
  created following the es convention — condensed content, `<Field>`
  options, `TerminalPreview`; sidebar renumbered 1–25 matching the en
  order, `meta.json` + `index.md` table updated).
- **Release notes consolidated into `changelog.mdx`** — the old
  duplicated `*-features.mdx` release-notes pages were removed
  (both described the same upcoming release) and replaced by a single
  `changelog.mdx` with `ChangelogTimeline` (modern terminal-style
  vertical timeline — gradient rail, glowing nodes, Freebuff-style
  date line + bullets, registered in `docs/mdx-components.tsx`) with
  a **v0.6.0 (Next)** item and a **v0.5.0** item. Each bullet links to
  the docs page covering the feature (api/prompt, api/badge, …,
  plugins/chart, plugins/notify, plugins/qrcode, …). The page sets
  `onThisPage: false` — `TerminalOnThisPage` now honors that
  frontmatter flag. Sidebar updated (`overview/meta.json`).
- **Stale preset lists** — removed `oneDark` / `monokai` / `github`
  (don't exist; code ships `dracula`, `nord`, `solarized`,
  `catppuccin`, `gruvbox`) from `getting-started.mdx` and
  `packages/dui/README.md`; the core README now documents full
  plain-mode widget coverage (with verified `prefix:` output
  examples) and the `format*Plain` API table incl.
  `formatActionsPlain` as the shared `actions:` grammar. Also fixed a
  stale `tabs()` usage example (`{ label, active }` objects →
  `items: string[]` + `active` index) and the kbd example.

## Known issues (pre-existing)

- **Website typecheck**: 8 `tsc` errors in components (`Typographics`
  `level` double-spec, `LazySection` `style` prop, `Card` route type,
  `LazyTerminalPreview`, `InteractiveNotifyDemo`) — pre-existing on
  clean `HEAD`, unrelated to recent core changes.
- **`dui-qrcode` test**: rotate test **FIXED** — now passes.
- **`dui-notify` queue flake** — **FIXED**: `queue.test.ts`
  "respects throttleMs between dispatches" raced at a razor-thin
  boundary (debounce 10ms + throttle 50ms = second drain at exactly
  60ms vs `sleep(60)`). Replaced fixed sleeps with a poll-based
  `waitFor()` helper (wide margins, condition-based assertions) across
  all timing tests; verified 30× isolated, 20× full-suite, and 8×
  parallel-suite runs with zero failures.
- **Stale `PLAN.md`** — was superseded by this roadmap; it documented
  the reverted xterm.js homepage approach.

## Next steps

1. ~~Promote the `next` pre-release~~ — **done**: 0.6.0 stable shipped
   (all changesets consumed, versions bumped, `DUI_VERSION`/peerDeps
   aligned, docs promoted to `/docs/v0.6.0`).
2. Close the docs gaps above (`es/api` pages, README refresh).
3. Fix the pre-existing `dui-qrcode` rotate test and the 8 website
   type errors.
4. Add a `formatModalPlain` parity test between `box()` and
   `plainEmit()` so the shared action grammar can't silently diverge.
