# @dui-toolkit/plugin-markdown

## 0.3.0-next.1

### Patch Changes

- Updated dependencies []:
  - @bdocs/dui@0.6.0-next.1

## 0.3.0-next.0

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

## 0.2.1

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
