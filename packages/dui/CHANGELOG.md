# @bdocs/dui

## 0.7.0-next.2

### Patch Changes

- [`5e185dc`](https://github.com/bolt-docs/dui/commit/5e185dce40d4bbf824743e34aeb4ec2e09b26053) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - **Bug fixes**

  - **Toast box alignment** — the top border of rendered toasts was two
    columns wider than the body and bottom borders (the header's
    trailing space stacked with the template's leading `┌─ ` gap), so
    stacked toasts looked misaligned. The dash run now accounts for both
    and every row renders at the same width.
  - **Solarized preset** — `markdown.heading6` used `#6c71c4` (typo);
    the official Solarized violet is `#6c71c6`. The heading now matches
    the rest of the palette.
  - **`richtext()` link color** — the `richtext.link` theme slot was
    force-cast to a string before painting, so `{ fg, bg }` color
    objects (and any non-string `ColorStyle`) silently misbehaved. Link
    painting now resolves through `resolveColor` like every other slot.
  - **Fuzzy docs** — the `fuzzyMatch("fb", "file-browser")` examples in
    the JSDoc claimed a score of 12; the real subsequence scorer returns 3. Examples updated to the actual values so the shipped `.d.ts`
    matches behavior.
  - **`palette()` description** — the feature is a fuzzy-searchable
    command palette (VS Code/Raycast-style action picker), not a color
    picker; the release notes now describe it accurately.

## 0.7.0-next.1

### Minor Changes

- [`7260786`](https://github.com/bolt-docs/dui/commit/72607867c0fadf83b131e668747a9880354b68cc) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - **v0.7.0 — logger v2, testing utils, tree, presets & accessibility**

  - **Logger v2** — leveled logging with env-based filtering
    (`getEffectiveLogLevel()` honors `LOG_LEVEL` / `DEBUG` / `NO_COLOR`),
    timestamps, a file transport, and JSON output; `createLogger()` /
    `configureLogger()` plus the module-level `debug` / `info` / `success` /
    `warn` / `error` helpers.
  - **Lazy tree loading** — `tree()` accepts an async `loadChildren` so nodes
    expand on demand instead of preloading the full hierarchy.
  - **Grapheme-aware widths** — `splitGraphemes()` and CJK/ZWJ/emoji-aware
    measuring (family emoji, flags, skin tones no longer break box/table/grid
    layout).
  - **Widget testing utilities** — `createMockTty()`, `withMockTty()`,
    `snapshotWidget()`, `snapshotStatic()` with `MockTty` for deterministic
    snapshot tests of interactive widgets.
  - **New theme presets** — `tokyonight`, `rose-pine`, and `ayu` added to the
    `presets` registry alongside dracula/nord/solarized/catppuccin/gruvbox.
  - **Accessibility live announcements** — `announce()`, `flushAnnouncements()`,
    `clearAnnouncements()`, `getAnnouncementQueue()` for screen-reader live
    regions, honoring plain mode.
  - **Banner fixes** — ANSI Shadow figlet rendering hardened (plain-mode `#`
    fill, trimmed rows, smush layout correctness, accented glyphs); docs
    previews kept in sync with real output.

- [`7260786`](https://github.com/bolt-docs/dui/commit/72607867c0fadf83b131e668747a9880354b68cc) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - **v0.7.0 — new widgets and APIs**

  - **`form()`** — full interactive form engine. Declarative field definitions
    (`FormField`), text + select field types (`FormTextField` / `FormSelectField`),
    validation, and typed submission.
  - **`palette()`** — interactive color-picker prompt with keyboard navigation.
  - **Fuzzy search engine** — `fuzzyMatch()`, `filterFuzzy()`, and
    `highlightFuzzy()` with `FuzzyResult` scoring; powers type-ahead lists and
    command palettes.
  - **OSC 8 hyperlinks** — `link()` / `linkify()` / `hyperlink()` render clickable
    terminal links with `supportsHyperlinks()` detection (Kitty/iTerm2/WezTerm
    native support, tmux passthrough-aware).
  - **OSC 52 clipboard** — `copyToClipboard()` / `copy()` write to the system
    clipboard with `clipboardSupported()` detection.
  - **`banner()`** — large terminal banners: embedded ANSI Shadow figlet font with
    smush layout, kerning, spacing, `#` fill override, `block` style, accented
    glyphs, and plain-mode fallback.
  - **`richtext()`** — rich-text rendering with inline styles, `richtextToPlain()`
    conversion, and full plain-mode support.
  - **Toast center** — `createToastCenter()` / `toast()` / `dismissAllToasts()`
    with `ToastType` severities and queueing.
  - **`createStatusBar()`** — persistent status-bar widget with parts-based layout.
  - **Alt screen** — `withAltScreen()`, `enterAltScreen()`, `exitAltScreen()`,
    `saveCursor()` / `restoreCursor()`, `showCursor()` / `hideCursor()`.
  - **Password input** — masked input mode for secrets.
  - **`onCancel` hooks on every interactive prompt** (`select`, `multiselect`,
    `tree`, `form`, `palette`, …) so consumers can distinguish cancel from submit.
  - **Theme slots** for all new widgets (`form.*`, `palette.*`, `banner.*`,
    `richtext.*`, `toast.*`, `statusbar.*`) via the existing `configure()` slot
    system.

## 0.7.0-next.0

### Minor Changes

- **v0.7.0 — logger v2, testing utils, tree, presets & accessibility**

  - **Logger v2** — leveled logging with env-based filtering
    (`getEffectiveLogLevel()` honors `LOG_LEVEL` / `DEBUG` / `NO_COLOR`),
    timestamps, a file transport, and JSON output; `createLogger()` /
    `configureLogger()` plus the module-level `debug` / `info` / `success` /
    `warn` / `error` helpers.
  - **Lazy tree loading** — `tree()` accepts an async `loadChildren` so nodes
    expand on demand instead of preloading the full hierarchy.
  - **Grapheme-aware widths** — `splitGraphemes()` and CJK/ZWJ/emoji-aware
    measuring (family emoji, flags, skin tones no longer break box/table/grid
    layout).
  - **Widget testing utilities** — `createMockTty()`, `withMockTty()`,
    `snapshotWidget()`, `snapshotStatic()` with `MockTty` for deterministic
    snapshot tests of interactive widgets.
  - **New theme presets** — `tokyonight`, `rose-pine`, and `ayu` added to the
    `presets` registry alongside dracula/nord/solarized/catppuccin/gruvbox.
  - **Accessibility live announcements** — `announce()`, `flushAnnouncements()`,
    `clearAnnouncements()`, `getAnnouncementQueue()` for screen-reader live
    regions, honoring plain mode.
  - **Banner fixes** — ANSI Shadow figlet rendering hardened (plain-mode `#`
    fill, trimmed rows, smush layout correctness, accented glyphs); docs
    previews kept in sync with real output.

- **v0.7.0 — new widgets and APIs**

  - **`form()`** — full interactive form engine. Declarative field definitions
    (`FormField`), text + select field types (`FormTextField` / `FormSelectField`),
    validation, and typed submission.
  - **`palette()`** — interactive color-picker prompt with keyboard navigation.
  - **Fuzzy search engine** — `fuzzyMatch()`, `filterFuzzy()`, and
    `highlightFuzzy()` with `FuzzyResult` scoring; powers type-ahead lists and
    command palettes.
  - **OSC 8 hyperlinks** — `link()` / `linkify()` / `hyperlink()` render clickable
    terminal links with `supportsHyperlinks()` detection (Kitty/iTerm2/WezTerm
    native support, tmux passthrough-aware).
  - **OSC 52 clipboard** — `copyToClipboard()` / `copy()` write to the system
    clipboard with `clipboardSupported()` detection.
  - **`banner()`** — large terminal banners: embedded ANSI Shadow figlet font with
    smush layout, kerning, spacing, `#` fill override, `block` style, accented
    glyphs, and plain-mode fallback.
  - **`richtext()`** — rich-text rendering with inline styles, `richtextToPlain()`
    conversion, and full plain-mode support.
  - **Toast center** — `createToastCenter()` / `toast()` / `dismissAllToasts()`
    with `ToastType` severities and queueing.
  - **`createStatusBar()`** — persistent status-bar widget with parts-based layout.
  - **Alt screen** — `withAltScreen()`, `enterAltScreen()`, `exitAltScreen()`,
    `saveCursor()` / `restoreCursor()`, `showCursor()` / `hideCursor()`.
  - **Password input** — masked input mode for secrets.
  - **`onCancel` hooks on every interactive prompt** (`select`, `multiselect`,
    `tree`, `form`, `palette`, …) so consumers can distinguish cancel from submit.
  - **Theme slots** for all new widgets (`form.*`, `palette.*`, `banner.*`,
    `richtext.*`, `toast.*`, `statusbar.*`) via the existing `configure()` slot
    system.

## 0.6.0

### Minor Changes

- b6c513d: New accessibility layer — auto-detected text-only fallback when
  the host signals non-ANSI conditions, with a forced opt-in flag
  orthogonal to theme presets.

  Heuristic overlay (any one triggers plain mode):

  - `NO_COLOR` env var set to a non-empty value ([no-color.org](https://no-color.org)).
  - `TERM=dumb`.
  - `process.stdout?.isTTY === false` (piped-to-file / CI / `tee` / `less`).
  - Screen reader presence — `brltty` (Linux via `pgrep -f brltty`),
    VoiceOver (macOS via `defaults read com.apple.universalaccess voiceOverOn`),
    NVDA / JAWS (Windows via PowerShell `Get-Process`). Probes are
    cached on the first call and run with a 100 ms hard timeout so
    startup stays fast.
  - `PREFERS_REDUCED_MOTION=1` / `REDUCE_MOTION=1` (separate
    `isReducedMotion()` getter — animation cadence only).

  Forced fallback:

  - `configure({ plain: true })` — flips every widget + every notify
    call into text-only output.
  - Composes with presets: `configure({ theme: presets.dracula, plain: true })`
    resolves the Dracula palette (still observable through
    `getConfig().theme`) but renders as text-only.

  Plain-mode output format:

  ```
  box: <title>
    <line>
    <line>
  actions:
    [<id>] <label>
  ```

  Widgets with early-return paths: `box`, `badge`, `section`,
  `divider`. The `box` / `badge` early-returns skip SGR resolution
  entirely so plain-mode `box()` is roughly 6× faster on hot paths
  than the styled variant (no border math, no padding calc, no
  `resolveColor`). `modal`, `tabs`, `kbd` keep their styled paint
  under the standard path; consumers needing them in plain mode
  emit their own multi-line text via `formatModalPlain` /
  `formatTabsPlain` / `formatKbdPlain` from `packages/dui/src/plain.ts`.

  Public API additions:

  ```ts
  import {
    isPlainMode, // opts + config-aware getter
    isReducedMotion, // PREFERS_REDUCED_MOTION + plain-aware
    getAccessibilityInfo, // structured {noColor, dumbTerm, nonTty,
    //             screenReader, reducedMotion,
    //             plainOverride}
    refreshAccessibility, // re-probe (e.g. after env mutation in tests)
    type AccessibilityInfo,
  } from "@bdocs/dui";
  ```

  Tests:

  - `packages/dui/tests/accessibility.test.ts` — each heuristic
    independently + the `plain: true` global override + per-call
    opts-level override + `refreshAccessibility()` cache refresh.
  - `packages/dui/tests/plain-mode.test.ts` — `box`, `badge`,
    `section`, `divider` plain-mode output shape and `prefix:`
    markers, no SGR in body, no box drawing glyphs.
  - `packages/dui-notify/tests/notify.test.ts` — five new cases
    exercising the `notify.plain: true` opt-in: bell text path,
    terminal box-skip, no `notify-send` spawn under `force: "os"`,
    NO_COLOR env auto-detect.

- ## v0.6.0-next — Animation and color control

  ### Animation API (`animate()` / `animateProgress()`)

  - **`AnimationHandle.pause()` / `.resume()`** — Pause and resume a running animation. The internal clock tracks accumulated time across pause/resume cycles so the animation continues exactly where it stopped.
  - **`AnimationHandle.seek(progress)`** — Jump to any point in the animation (0..1). Renders the frame at that position immediately. Running animations continue from the new virtual start time.
  - **`AnimationHandle.progress`** — Read the current animation progress (0..1) at any time.
  - **`AnimationHandle.paused`** — Read whether the animation is currently paused.

  ```ts
  const anim = animate({ keyframes, duration: 2000, onFrame });
  anim.pause();
  console.log(anim.progress, anim.paused); // e.g. 0.42, true
  anim.resume();
  anim.seek(0.5); // jump to halfway
  ```

  ### Color parsing

  - **HSL / HSLA color format** — `parseColor()` now accepts `hsl(H, S%, L%)` and `hsla(H, S%, L%, A)` strings. The standard HSL→RGB conversion is used.

  ```ts
  parseColor("hsl(120, 100%, 50%)"); // { r: 0, g: 255, b: 0 }
  parseColor("hsla(0, 100%, 50%, 0.5)"); // { r: 255, g: 0, b: 0, a: 0.5 }
  ```

  ### Gradient presets (`gradient()` / `gradientPresets`)

  - **`gradient(count, stops)`** — Generate N evenly-spaced hex colours by interpolating through `GradientStop` positions. Powers colour ramps for bar charts, sparklines, and progress bars.
  - **`gradientPresets`** — 8 curated presets: `sunset`, `ocean`, `forest`, `royal`, `fire`, `ice`, `rainbow`, `terminal`.

- Unified terminal capability detection module.

  - `getCapabilities()` returns a cached snapshot of terminal features: truecolor, hyperlinks, Kitty/Sixel/iTerm2 support, SGR mouse, color depth (1|16|256|16777216), eastAsianWidth, columns, rows, cursor shape, bracketed paste, tmux/screen detection.
  - `refreshCapabilities()` forces re-detection on next call.
  - `setCapabilities(partial)` overrides detected values for testing.
  - Convenience predicates: `hasTrueColor()`, `hasHyperlinks()`, `hasKitty()`, `colorDepthLabel()`.

- b6c513d: v0.6.0 — interactive prompts overhaul

  **`@bdocs/dui` core:**

  - **Plugin API v2** — `usePluginAsync(plugin)` is now the canonical register entry point. Plugins can declare metadata (`description`, `tags`, `homepage`, `author`, `dependsOn`); peer-dependency warnings surface on major-version mismatch. Lifecycle is now observable via `awaitPluginsReady([names])` and `isPluginReady(name)`; status (`loading` / `ready` / `error`) is exposed through `getPlugin(name)` and `listPlugins()`.
  - **Wheel scrolling across `select`, `multiselect`, `tree`** — every prompt reads multi-tick SGR bursts correctly (prior implementation only kept the last tick in a chunk). A new `wheelSensitivity?: number` option multiplies the per-burst magnitude — `wheelSensitivity: 3` + two ticks = 6 rows/second rendered.
  - **Plugin wheel hooks** — `PluginEvents` gained `"wheel-up"` and `"wheel-down"` pre-filtered events so dashboards can subscribe via `api.on('wheel-up', handler)` instead of filtering every `MouseEvent`.
  - **Drag-and-drop reordering on `multiselect({ enableDragReorder: true })`** — press-and-drag any enabled row to MOVE (insert, not swap) into a new position with live `multiselect.dragSource` / `multiselect.dropTarget` color previews. Checked state and the cursor both follow their logical row across the splice in **both directions** — `cursor remapIndex` helper makes the cursor visually pinned to its original choice even when row indices shift.
  - **Dropping past `pageSize` boundary** — registered clickable areas extend during an active drag so a release on a row past the visible viewport resolves to the correct logical choice and scrolls the window to show the drop.
  - **`MouseEvent` discriminated union** — `type === "wheel"` narrows to `MouseWheelEvent` and forces reading `event.wheel` instead of `event.button`. `MouseWheelEvent.button` is now `undefined` at runtime and marked `@deprecated` so cross-branch consumers no longer hit the false-positive left-click on wheel-up.
  - **Theme slots** — new slots `multiselect.dragSource` and `multiselect.dropTarget` (defaults in `getDefaultFn`). Wheel-only events no longer leak into `MouseEventBase.button`.

  **`@dui-toolkit/plugin-markdown`:**

  - Headings render without the literal `#` marker; indentation scales with depth (H1 single indent, H2 deeper) and H1/H2 use `bold` for a typographic hierarchy.

  **`@dui-toolkit/plugin-diff`:**

  - Slot key renamed `thunk` → `hunk` (the old name was a typo); the symmetric `diff.hunk` default cyan now resolves correctly via `resolveColor('diff.hunk', theme)` and the test pins the default.

  **Cross-plugin:**

  - All five `@dui-toolkit/plugin-*` packages bumped to align with the DUI 0.6.0 release line.

- feat: add JSON output formatter for structured DUI rendering

  - `formatJson(nodes, opts?)` serializes a `JsonNode[]` tree to compact or pretty-printed JSON
  - `ansiToJson(text, opts?)` parses ANSI SGR escape sequences into `JsonNode[]` with extracted styles
  - `parseSgr(text)` decomposes ANSI text into styled content segments (bold, fg, bg, etc.)
  - Widget helpers: `widgetNode(type, content, meta?)`, `progressNode(content, pct)`, `spinnerNode(content, frame?)`, `imageNode(alt, format)`, `diffNode(content, hunks?)`
  - `JsonNode` supports type, content, styles, meta, position (x/y/w/h), and children
  - Options for pretty-print, position inclusion, style stripping, and text merging
  - ANSI 256‑color to hex conversion for faithful color reproduction

- ## Keyframe animation extensions

  `animate()` and `animateProgress()` gained numeric interpolation, content templates, and CSS-style playback control:

  - **Numeric channels (`numbers`)** — keyframes can carry arbitrary `Record<string, number>` values that interpolate (with easing) between consecutive frames. Unlocks animated counters, degrees, bar widths, and any numeric state:

    ```ts
    animate({
      keyframes: [
        { offset: 0, numbers: { progress: 0, rotation: 0 } },
        { offset: 1, numbers: { progress: 100, rotation: 360 } },
      ],
      duration: 2000,
      easing: "ease-out",
      onFrame: (f) => render(f.numbers!.progress, f.numbers!.rotation),
    });
    ```

    `ResolvedFrame.numbers` is only present when keyframes define numbers; keys on one side of a segment carry through unchanged.

  - **Content templates** — `content` supports `{name}` placeholders filled from the resolved numbers each frame: `content: "Downloading {progress}%"` → `"Downloading 42%"`. Integers render without decimals; floats trim to two.

  - **`direction`** — CSS `animation-direction` on both `animate()` and `animateProgress()`: `normal` (default), `reverse`, `alternate` (ping-pong), `alternate-reverse`. Odd iterations flip for the alternate modes.

  - **`iterations`** — finite repeat count (`iterations: 3`), a superset of `loop` (`loop: true` ≡ `iterations: Infinity`). `handle.progress` reports 0→1 across the whole multi-iteration run; `then()` fires once all iterations complete.

- Native widget set for building CLIs and TUIs à la open-code.

  New primitives:

  - `grid({ columns, width?, gap? })` — column-based layout that wraps each cell independently and zips rows top-down, supporting fixed widths and `"1fr"`/`"2fr"` flex units.
  - `modal({ title?, content, width?, buttons?, style? })` — overlay dialog with title + content + auto-composed `[ label ]` button footer (primary/secondary coloring).
  - `tabs({ items, active, style? })` — segmented control with `underline` / `pill` / `boxed` render modes.
  - `badge({ label, status? })` — status chip with five severity levels (`info` / `success` / `warning` / `error` / `neutral`) and compound `{ fg, bg }` color overrides.
  - `kbd({ keys, separator?, platform? })` — keyboard hint with auto platform detection (`darwin` → Mac glyphs like `⌘ ⌥ ⇧ ⎋`; `win32` → full names).
  - `section({ title, width?, align? })` — single-line labeled divider that truncates titles to preserve strict one-row geometry.

  `BoxBorderStyle` extended with `thick`, `ascii`, `dashed`, and `dotted` — pass straight to `box({ style: "ascii" })` for pure-ASCII log scrapers, or `style: "dashed"`/`"dotted"` for softer visual rhythms.

  Each new widget respects the existing `configure({ theme: { … } })` slot system (`modal.border`, `tabs.active`, `badge.success`, `kbd.text`, `section.line`, etc.) and accepts per-call `colors: { … }` overrides.

- feat: add output batching system for reduced terminal I/O and flicker

  - `createBatch(opts?)` creates a batch buffer with configurable maxSize, flushInterval, stream target, and passthrough mode
  - `batch.write(text)` accumulates text in the internal buffer
  - `batch.writeAndFlush(text)` writes and immediately flushes
  - `batch.flush()` sends the accumulated buffer to the output stream in one write call
  - `batch.defer()` schedules a flush on the next microtask/setImmediate, coalescing multiple sync writes
  - `batch.read()` / `batch.size()` / `batch.clear()` for buffer introspection
  - `batch.setPassthrough(bool)` toggles direct-write mode (bypass batch)
  - `batch.destroy()` stops timers, flushes remaining content, releases resources
  - `getDefaultBatch(opts?)` singleton for simple CLI workflows
  - `resetDefaultBatch()` destroys and resets the singleton
  - Composes with `RenderSurface.flush()` — write the diff string through the batch

- Pagination system for long-form terminal output.

  - `paginate(content, options?)` splits multi-line ANSI text into viewport-sized pages, accounting for wrapped lines via visual-length counting. Returns an array of page strings with optional footer (`▴ 1/3 ▾  [↑↓] scroll  [q] quit`).
  - `paginateInteractive(content, options?)` renders one page at a time with interactive scrolling — ↑/↓, Page Up/Page Down, Home/End, mouse wheel, and `q`/Escape to quit. Non-TTY fallback suggests piping to `less`.
  - `terminalHeight()` returns terminal row count with 24 fallback.

- b6c513d: Add curated theme palette presets — `dracula`, `nord`, `solarized`,
  `catppuccin`, `gruvbox` — exported as `presets` from `@bdocs/dui`.
  Each preset is a `Partial<DuiTheme>` so a single
  `configure({ theme: presets.dracula })` retints every widget
  (`badge`, `modal`, `tabs`, `box`, `section`, `spinner`, `progress`,
  `markdown`, `kbd`) without touching code. The registry is typed as
  `Readonly<Record<PresetName, DuiThemePreset>>` and frozen at
  runtime to prevent accidental palette mutation.

  Highlights:

  - `PresetName` union keeps palette identifiers type-checked so
    misspelled names surface at compile time.
  - Partial cascade + per-slot fallback (each palette only overrides
    the high-impact surfaces; the rest fall through to the built-in
    defaults).
  - Per-call overrides remain on top via standard spread:
    `configure({ theme: { ...presets.dracula, error: "#ff00ff" } })`.
  - `tests/presets.test.ts` exercises the registry shape, palette
    distinctness (no duplicate hexes), cascade correctness into
    `badge`, `modal`, `tabs`, `section`, and resetConfig isolation.
  - `examples/20-presets/index.ts` renders the same composition under
    each of the five palettes for side-by-side comparison.
  - `website/docs/api/presets.mdx` documents each palette with
    swatch tables + extend-on-your-own guidance.

- feat: add `RenderSurface` — virtual terminal canvas with diff-based flushing and overlays

  - `RenderSurface(width, height)` creates a cell grid with per-cell SGR tracking
  - `write(x, y, text, style?)` places content at absolute coordinates
  - `fill(x, y, w, h, char?, style?)` fills a rectangle
  - `flush()` emits minimal ANSI diff (only dirty cells, cursor moves + SGR deltas)
  - `render()` emits the entire surface as a styled ANSI string
  - `createOverlay(x, y, w, h)` creates a viewport overlay for floating panels
  - `flushToTerminal()` / `renderToTerminal()` for direct stdout output
  - Full `resize()` / `clear()` / `invalidate()` lifecycle methods

## 0.6.0-next.2

### Minor Changes

- [`b6c513d`](https://github.com/bolt-docs/dui/commit/b6c513d22458e6dd6b638cb78de515982bfdbc2c) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - New accessibility layer — auto-detected text-only fallback when
  the host signals non-ANSI conditions, with a forced opt-in flag
  orthogonal to theme presets.

  Heuristic overlay (any one triggers plain mode):

  - `NO_COLOR` env var set to a non-empty value ([no-color.org](https://no-color.org)).
  - `TERM=dumb`.
  - `process.stdout?.isTTY === false` (piped-to-file / CI / `tee` / `less`).
  - Screen reader presence — `brltty` (Linux via `pgrep -f brltty`),
    VoiceOver (macOS via `defaults read com.apple.universalaccess voiceOverOn`),
    NVDA / JAWS (Windows via PowerShell `Get-Process`). Probes are
    cached on the first call and run with a 100 ms hard timeout so
    startup stays fast.
  - `PREFERS_REDUCED_MOTION=1` / `REDUCE_MOTION=1` (separate
    `isReducedMotion()` getter — animation cadence only).

  Forced fallback:

  - `configure({ plain: true })` — flips every widget + every notify
    call into text-only output.
  - Composes with presets: `configure({ theme: presets.dracula, plain: true })`
    resolves the Dracula palette (still observable through
    `getConfig().theme`) but renders as text-only.

  Plain-mode output format:

  ```
  box: <title>
    <line>
    <line>
  actions:
    [<id>] <label>
  ```

  Widgets with early-return paths: `box`, `badge`, `section`,
  `divider`. The `box` / `badge` early-returns skip SGR resolution
  entirely so plain-mode `box()` is roughly 6× faster on hot paths
  than the styled variant (no border math, no padding calc, no
  `resolveColor`). `modal`, `tabs`, `kbd` keep their styled paint
  under the standard path; consumers needing them in plain mode
  emit their own multi-line text via `formatModalPlain` /
  `formatTabsPlain` / `formatKbdPlain` from `packages/dui/src/plain.ts`.

  Public API additions:

  ```ts
  import {
    isPlainMode, // opts + config-aware getter
    isReducedMotion, // PREFERS_REDUCED_MOTION + plain-aware
    getAccessibilityInfo, // structured {noColor, dumbTerm, nonTty,
    //             screenReader, reducedMotion,
    //             plainOverride}
    refreshAccessibility, // re-probe (e.g. after env mutation in tests)
    type AccessibilityInfo,
  } from "@bdocs/dui";
  ```

  Tests:

  - `packages/dui/tests/accessibility.test.ts` — each heuristic
    independently + the `plain: true` global override + per-call
    opts-level override + `refreshAccessibility()` cache refresh.
  - `packages/dui/tests/plain-mode.test.ts` — `box`, `badge`,
    `section`, `divider` plain-mode output shape and `prefix:`
    markers, no SGR in body, no box drawing glyphs.
  - `packages/dui-notify/tests/notify.test.ts` — five new cases
    exercising the `notify.plain: true` opt-in: bell text path,
    terminal box-skip, no `notify-send` spawn under `force: "os"`,
    NO_COLOR env auto-detect.

- [`b6c513d`](https://github.com/bolt-docs/dui/commit/b6c513d22458e6dd6b638cb78de515982bfdbc2c) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - Add curated theme palette presets — `dracula`, `nord`, `solarized`,
  `catppuccin`, `gruvbox` — exported as `presets` from `@bdocs/dui`.
  Each preset is a `Partial<DuiTheme>` so a single
  `configure({ theme: presets.dracula })` retints every widget
  (`badge`, `modal`, `tabs`, `box`, `section`, `spinner`, `progress`,
  `markdown`, `kbd`) without touching code. The registry is typed as
  `Readonly<Record<PresetName, DuiThemePreset>>` and frozen at
  runtime to prevent accidental palette mutation.

  Highlights:

  - `PresetName` union keeps palette identifiers type-checked so
    misspelled names surface at compile time.
  - Partial cascade + per-slot fallback (each palette only overrides
    the high-impact surfaces; the rest fall through to the built-in
    defaults).
  - Per-call overrides remain on top via standard spread:
    `configure({ theme: { ...presets.dracula, error: "#ff00ff" } })`.
  - `tests/presets.test.ts` exercises the registry shape, palette
    distinctness (no duplicate hexes), cascade correctness into
    `badge`, `modal`, `tabs`, `section`, and resetConfig isolation.
  - `examples/20-presets/index.ts` renders the same composition under
    each of the five palettes for side-by-side comparison.
  - `website/docs/api/presets.mdx` documents each palette with
    swatch tables + extend-on-your-own guidance.

- [`b6c513d`](https://github.com/bolt-docs/dui/commit/b6c513d22458e6dd6b638cb78de515982bfdbc2c) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - ## v0.6.0-next — Animation and color control

  ### Animation API (`animate()` / `animateProgress()`)

  - **`AnimationHandle.pause()` / `.resume()`** — Pause and resume a running animation. The internal clock tracks accumulated time across pause/resume cycles so the animation continues exactly where it stopped.
  - **`AnimationHandle.seek(progress)`** — Jump to any point in the animation (0..1). Renders the frame at that position immediately. Running animations continue from the new virtual start time.
  - **`AnimationHandle.progress`** — Read the current animation progress (0..1) at any time.
  - **`AnimationHandle.paused`** — Read whether the animation is currently paused.

  ```ts
  const anim = animate({ keyframes, duration: 2000, onFrame });
  anim.pause();
  console.log(anim.progress, anim.paused); // e.g. 0.42, true
  anim.resume();
  anim.seek(0.5); // jump to halfway
  ```

  ### Color parsing

  - **HSL / HSLA color format** — `parseColor()` now accepts `hsl(H, S%, L%)` and `hsla(H, S%, L%, A)` strings. The standard HSL→RGB conversion is used.

  ```ts
  parseColor("hsl(120, 100%, 50%)"); // { r: 0, g: 255, b: 0 }
  parseColor("hsla(0, 100%, 50%, 0.5)"); // { r: 255, g: 0, b: 0, a: 0.5 }
  ```

  ### Gradient presets (`gradient()` / `gradientPresets`)

  - **`gradient(count, stops)`** — Generate N evenly-spaced hex colours by interpolating through `GradientStop` positions. Powers colour ramps for bar charts, sparklines, and progress bars.
  - **`gradientPresets`** — 8 curated presets: `sunset`, `ocean`, `forest`, `royal`, `fire`, `ice`, `rainbow`, `terminal`.

## 0.6.0-next.1

### Minor Changes

- Native widget set for building CLIs and TUIs à la open-code.

  New primitives:

  - `grid({ columns, width?, gap? })` — column-based layout that wraps each cell independently and zips rows top-down, supporting fixed widths and `"1fr"`/`"2fr"` flex units.
  - `modal({ title?, content, width?, buttons?, style? })` — overlay dialog with title + content + auto-composed `[ label ]` button footer (primary/secondary coloring).
  - `tabs({ items, active, style? })` — segmented control with `underline` / `pill` / `boxed` render modes.
  - `badge({ label, status? })` — status chip with five severity levels (`info` / `success` / `warning` / `error` / `neutral`) and compound `{ fg, bg }` color overrides.
  - `kbd({ keys, separator?, platform? })` — keyboard hint with auto platform detection (`darwin` → Mac glyphs like `⌘ ⌥ ⇧ ⎋`; `win32` → full names).
  - `section({ title, width?, align? })` — single-line labeled divider that truncates titles to preserve strict one-row geometry.

  `BoxBorderStyle` extended with `thick`, `ascii`, `dashed`, and `dotted` — pass straight to `box({ style: "ascii" })` for pure-ASCII log scrapers, or `style: "dashed"`/`"dotted"` for softer visual rhythms.

  Each new widget respects the existing `configure({ theme: { … } })` slot system (`modal.border`, `tabs.active`, `badge.success`, `kbd.text`, `section.line`, etc.) and accepts per-call `colors: { … }` overrides.

## 0.6.0-next.0

### Minor Changes

- v0.6.0 — interactive prompts overhaul

  **`@bdocs/dui` core:**

  - **Plugin API v2** — `usePluginAsync(plugin)` is now the canonical register entry point. Plugins can declare metadata (`description`, `tags`, `homepage`, `author`, `dependsOn`); peer-dependency warnings surface on major-version mismatch. Lifecycle is now observable via `awaitPluginsReady([names])` and `isPluginReady(name)`; status (`loading` / `ready` / `error`) is exposed through `getPlugin(name)` and `listPlugins()`.
  - **Wheel scrolling across `select`, `multiselect`, `tree`** — every prompt reads multi-tick SGR bursts correctly (prior implementation only kept the last tick in a chunk). A new `wheelSensitivity?: number` option multiplies the per-burst magnitude — `wheelSensitivity: 3` + two ticks = 6 rows/second rendered.
  - **Plugin wheel hooks** — `PluginEvents` gained `"wheel-up"` and `"wheel-down"` pre-filtered events so dashboards can subscribe via `api.on('wheel-up', handler)` instead of filtering every `MouseEvent`.
  - **Drag-and-drop reordering on `multiselect({ enableDragReorder: true })`** — press-and-drag any enabled row to MOVE (insert, not swap) into a new position with live `multiselect.dragSource` / `multiselect.dropTarget` color previews. Checked state and the cursor both follow their logical row across the splice in **both directions** — `cursor remapIndex` helper makes the cursor visually pinned to its original choice even when row indices shift.
  - **Dropping past `pageSize` boundary** — registered clickable areas extend during an active drag so a release on a row past the visible viewport resolves to the correct logical choice and scrolls the window to show the drop.
  - **`MouseEvent` discriminated union** — `type === "wheel"` narrows to `MouseWheelEvent` and forces reading `event.wheel` instead of `event.button`. `MouseWheelEvent.button` is now `undefined` at runtime and marked `@deprecated` so cross-branch consumers no longer hit the false-positive left-click on wheel-up.
  - **Theme slots** — new slots `multiselect.dragSource` and `multiselect.dropTarget` (defaults in `getDefaultFn`). Wheel-only events no longer leak into `MouseEventBase.button`.

  **`@dui-toolkit/plugin-markdown`:**

  - Headings render without the literal `#` marker; indentation scales with depth (H1 single indent, H2 deeper) and H1/H2 use `bold` for a typographic hierarchy.

  **`@dui-toolkit/plugin-diff`:**

  - Slot key renamed `thunk` → `hunk` (the old name was a typo); the symmetric `diff.hunk` default cyan now resolves correctly via `resolveColor('diff.hunk', theme)` and the test pins the default.

  **Cross-plugin:**

  - All five `@dui-toolkit/plugin-*` packages bumped to align with the DUI 0.6.0 release line.

## 0.5.0

### Minor Changes

- [`dfceb01`](https://github.com/bolt-docs/dui/commit/dfceb0181c85769d66137eac90827f681d988543) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - **Animation engine overhaul** — 25 easing presets, spring physics, custom cubic-bezier easings, CSS-style keyframes, and a progress-only wrapper.

  - **25 easing presets**: linear, ease-in/out/in-out, quad, cubic, quart, quint, sine, expo, circ, back, elastic, bounce
  - **`createEasing(x1, y1, x2, y2)`**: CSS-style cubic-bezier custom easing function
  - **`createSpring(config?)`**: Spring physics animation with stiffness/damping/mass parameters
  - **`SpringConfig`**: Pass `{ stiffness, damping }` directly as the `easing` option for natural motion
  - **`animateProgress(config)`**: Simplified API for animating a progress value (0→1) without keyframes
  - **`createTimeline()`**: Sequence or overlap multiple lazy animations with parallel/sequential control
  - **`fps` option**: Configurable frame rate on both `animate()` and `animateProgress()`
  - **CSS-style keyframes**: Smooth interpolation between any number of keyframes with percentage offsets
  - **`dui-chart`**: Refactored `animateChart()` to use core `animateProgress()`, eliminating code duplication

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

## 0.3.0

### Minor Changes

- [`169abf8`](https://github.com/bolt-docs/dui/commit/169abf8c1d3dd8633d99c49fa6594d13d2f5504f) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - Plugin system + Markdown + Chart packages

  **`@bdocs/dui` core:**

  - Added `plugin.ts` with `usePlugin()`, `DuiPlugin`, `PluginAPI`, and `PluginEvents`
  - Plugins can hook into `register` and `configure` lifecycle events
  - Access core utilities (colors, configure, terminalWidth, etc.) through `api.utils`

  **`@dui-toolkit/plugin-markdown` (new package):**

  - Render markdown to ANSI-colored terminal output with `md()` and `mdRender()`
  - Supports: headings (#), bold (\*_), italic (_), inline code (`), links, images, lists, blockquotes, code blocks with syntax highlighting, tables, and thematic breaks
  - Syntax highlighting via **shiki** with lazy initialization, singleton highlighter, and result caching
  - Includes `markdownPlugin` for future integration with the core plugin system

  **`@dui-toolkit/plugin-chart` (new package):**

  - Bar, column, line, pie, and sparkline chart types
  - Each chart supports `progress` (0–1) for data-driven animation
  - `animateChart()` helper using the same easing/timing engine as core `animate()`
  - Built-in color palette, auto-sizing to terminal width
  - Zero external dependencies beyond `@bdocs/dui`

### Patch Changes

- [`2aba60e`](https://github.com/bolt-docs/dui/commit/2aba60e069a932c82a3c504eace0651a12925970) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - Fix scrolling bug in interactive prompts (select, multiselect, input, tree)

  Two root causes:

  1. **Off-by-one in cursor movement**: `readline.moveCursor(up by -linesRendered)` moved 1 row too many because the cursor was already on the last row of the output. Changed to use ANSI save/restore cursor (`\x1b[s`/`\x1b[u`) instead of relative movement.

  2. **Wrapped lines miscount**: `linesRendered = lines.length` counted logical array elements instead of actual terminal rows. Added `countRenderLines()` that divides visible length by terminal width with `Math.ceil`.

  Also fixed cursor positioning in `input()` — after writing output the cursor now correctly moves to the value line instead of the error line.

## 0.2.0

### Minor Changes

- [`ad49c63`](https://github.com/bolt-docs/dui/commit/ad49c631a403ca3b5eff768612c12e4c51d99777) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - feat: interactive prompt components — Input, Select, Multiselect, Tree

  - **Input**: free text prompt with cursor navigation (←/→/Home/End), Backspace/Delete,
    Ctrl+U/K, placeholder, and validation
  - **Select**: single-select list with arrow keys, disabled items, page scrolling,
    and non-TTY fallback
  - **Multiselect**: multi-select list with Space toggle, required mode (blocks empty
    submission, prevents deselect last), checked initial state, and non-TTY fallback
  - **Tree**: hierarchical prompt with expand/collapse (▶/◀/Space/Enter), ancestor
    collapse on ←, disabled branches, and non-TTY leaf listing
  - **Theme**: new theme slots `input.*`, `select.*`, `multiselect.*`, `tree.*`
    with defaults in `getDefaultFn`
  - **fix**: confirm prompt tests — removed module-level `vi.mock("node:readline")`
    that polluted the vitest process; set `isTTY` correctly so 4 previously broken
    tests now pass

## 0.1.2

### Patch Changes

- [`c4a48b1`](https://github.com/bolt-docs/boltdocs/commit/c4a48b13836f1b33746ab35a2a3bbc4d8536cb32) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - - **Accurate Unicode width rendering**: Replaced naive length checks with `string-width` calculations to prevent box layout misalignment in CLI reporting when emoji or multi-byte characters are displayed.

## 0.1.1

### Patch Changes

- [`a780571`](https://github.com/bolt-docs/boltdocs/commit/a78057165a087b36793ceced3bf5799631b9261a) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - feat(dui): add `configure()`/`getConfig()` for runtime identity — log prefix, server box titles, and update command are now configurable at the CLI entry point instead of hardcoded. fix(dui): default `updateCommand` corrected from `@bdocs/dui` to `boltdocs`. fix(dui): `stripAnsi()` now handles OSC hyperlinks and CSI cursor sequences, not just SGR colors. refactor(dui): `devServer()`/`previewServer()` consolidated via shared `buildServerBox()` helper. chore(dui): `padLeft` renamed to `padRight` for clarity. chore(dui): comprehensive tests added for logger, config, confirm, and formatLog. fix(ssg): missing kolorist-to-dui migration in `build.ts` (`dim`, `cyan`, `green`, `gray`, `red` bare calls) resolved — fixes runtime `ReferenceError: gray is not defined`. fix(core): `dev-server.ts` `console.error('[boltdocs]')` → `dui.error()`; `cli-entry.ts` adds `configure()` call.

- [`375264f`](https://github.com/bolt-docs/boltdocs/commit/375264fb24912fa51da39ccb9fbc78b3a4962b72) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - Remove `ansiCodes` raw ANSI export from `@bdocs/dui`. Core CLI `ui.ts` now re-exports `dui.colors` (picocolors) directly — no more ANSI escape code usage anywhere. `formatLog` and `confirm` use picocolors functions.

- [`b736267`](https://github.com/bolt-docs/boltdocs/commit/b736267f8764ab92f9b4fb3ee1f9f0b0bd07e6e0) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - Fix picocolors usage across `@bdocs/dui` (use function calls instead of template literal interpolation). Add `ansiCodes` export for backward-compatible raw ANSI sequences. Migrate doctor output to use `@bdocs/dui` — replace raw ANSI with picocolors functions and use `dui.box.double()` for diagnosis summary.

- [`f478f53`](https://github.com/bolt-docs/boltdocs/commit/f478f539a6da7a32c9ecef44fda0013b7b478133) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - Complete migration from `ui.ts` wrapper to direct `@bdocs/dui` imports across core. Move `confirm`/`formatLog` into dui. Remove `ui.ts` entirely. Phase 3: migrate changelog generator output to dui logger/box.

- [`f0be317`](https://github.com/bolt-docs/boltdocs/commit/f0be317824d34e6827284a342af946de53396c18) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - Create `@bdocs/dui` terminal UI package with boxes, logger, lists, and dividers. Wire into core CLI (`ui.ts`) and update-check (`update-check.ts`).
