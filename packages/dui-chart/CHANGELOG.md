# @dui-toolkit/plugin-chart

## 0.4.1-next.2

### Patch Changes

- Updated dependencies [[`5e185dc`](https://github.com/bolt-docs/dui/commit/5e185dce40d4bbf824743e34aeb4ec2e09b26053)]:
  - @bdocs/dui@0.7.0-next.2

## 0.4.1-next.1

### Patch Changes

- Updated dependencies [[`7260786`](https://github.com/bolt-docs/dui/commit/72607867c0fadf83b131e668747a9880354b68cc), [`7260786`](https://github.com/bolt-docs/dui/commit/72607867c0fadf83b131e668747a9880354b68cc)]:
  - @bdocs/dui@0.7.0-next.1

## 0.4.1-next.0

### Patch Changes

- Updated dependencies []:
  - @bdocs/dui@0.7.0-next.0

## 0.4.0

### Minor Changes

- ## Chart value axes — explicit `min`/`max` and negative data

  `bar()` and `pie()` now accept `min` / `max` options to pin the value axis, and handle negative data without crashing:

  - **`bar({ min, max })`** — Bars scale against `[min, max]`: a value at `min` renders as an empty bar, one at `max` as a full bar. Defaults are `Math.min(0, ...data)` / `Math.max(0, ...data)`, so mixed-sign data renders from a zero baseline. Values outside the range are clamped instead of overflowing (previously a negative fill made `"█".repeat(n)` throw a RangeError).
  - **`pie({ min, max })`** — Each slice is its fraction of `[min, max]`, clamped to `[0, 1]`. `max` defaults to the sum of the slice values (share of total), so an explicit `max` rescales the chart — e.g. compare against a target: `pie([{ label: "done", value: 70 }], { max: 100 })` → `70.0%`. Negative slices clamp to empty instead of overflowing the bar.

  Both charts keep `progress` (0–1) working with negative data — it scales the revealed fill and the reported percentage.

  ```ts
  bar([-5, 10, -2, 7], { labels: ["A", "B", "C", "D"], min: -10, max: 10 });
  pie([{ label: "done", value: 70 }], { max: 100 }); // 70.0%
  ```

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

### Patch Changes

- Updated dependencies [b6c513d]
- Updated dependencies
- Updated dependencies
- Updated dependencies [b6c513d]
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies [b6c513d]
- Updated dependencies
  - @bdocs/dui@0.6.0

## 0.4.0-next.2

### Patch Changes

- Updated dependencies [[`b6c513d`](https://github.com/bolt-docs/dui/commit/b6c513d22458e6dd6b638cb78de515982bfdbc2c), [`b6c513d`](https://github.com/bolt-docs/dui/commit/b6c513d22458e6dd6b638cb78de515982bfdbc2c), [`b6c513d`](https://github.com/bolt-docs/dui/commit/b6c513d22458e6dd6b638cb78de515982bfdbc2c)]:
  - @bdocs/dui@0.6.0-next.2

## 0.4.0-next.1

### Patch Changes

- Updated dependencies []:
  - @bdocs/dui@0.6.0-next.1

## 0.4.0-next.0

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

### Patch Changes

- Updated dependencies []:
  - @bdocs/dui@0.6.0-next.0

## 0.3.0

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

### Patch Changes

- Updated dependencies [[`dfceb01`](https://github.com/bolt-docs/dui/commit/dfceb0181c85769d66137eac90827f681d988543), [`2efd8ef`](https://github.com/bolt-docs/dui/commit/2efd8ef81aa5ab7a3ddf828a0a5b10f58024badf)]:
  - @bdocs/dui@0.5.0

## 0.2.0

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

- Updated dependencies [[`2aba60e`](https://github.com/bolt-docs/dui/commit/2aba60e069a932c82a3c504eace0651a12925970), [`169abf8`](https://github.com/bolt-docs/dui/commit/169abf8c1d3dd8633d99c49fa6594d13d2f5504f)]:
  - @bdocs/dui@0.3.0
