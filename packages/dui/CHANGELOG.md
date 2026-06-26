# @bdocs/dui

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
