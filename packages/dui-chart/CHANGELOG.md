# @dui-toolkit/plugin-chart

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
