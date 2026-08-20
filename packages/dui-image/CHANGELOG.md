# @dui-toolkit/plugin-image

## 0.4.0-next.3

### Patch Changes

- Updated dependencies [[`09d1b68`](https://github.com/bolt-docs/dui/commit/09d1b6863b519a8d123f6eb347fff276a1d41ddb)]:
  - @bdocs/dui@0.7.0-next.3

## 0.4.0-next.2

### Patch Changes

- Updated dependencies [[`5e185dc`](https://github.com/bolt-docs/dui/commit/5e185dce40d4bbf824743e34aeb4ec2e09b26053)]:
  - @bdocs/dui@0.7.0-next.2

## 0.4.0-next.1

### Minor Changes

- [`7260786`](https://github.com/bolt-docs/dui/commit/72607867c0fadf83b131e668747a9880354b68cc) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - **v0.7.0 — Sixel and iTerm2 image rendering**

  - **Sixel protocol** — `renderSixel()` / `pixelsToSixel()` / `wrapSixel()`
    render raster images with the Sixel graphics protocol (256-color palette,
    resizing via `SixelRenderOptions`).
  - **iTerm2 inline images** — `renderIterm2()` emits OSC 1337 inline-image
    sequences (base64, width/height control, `Iterm2RenderOptions`).
  - **tmux passthrough** — `isTmux()` detection and `tmuxPassthrough()` wrapping
    so both protocols survive inside tmux panes.
  - **`renderImage()` routing** — high-level renderer now falls back through
    kitty → sixel → iTerm2 → ANSI half-blocks based on detected terminal
    capabilities.

### Patch Changes

- Updated dependencies [[`7260786`](https://github.com/bolt-docs/dui/commit/72607867c0fadf83b131e668747a9880354b68cc), [`7260786`](https://github.com/bolt-docs/dui/commit/72607867c0fadf83b131e668747a9880354b68cc)]:
  - @bdocs/dui@0.7.0-next.1

## 0.4.0-next.0

### Minor Changes

- **v0.7.0 — Sixel and iTerm2 image rendering**

  - **Sixel protocol** — `renderSixel()` / `pixelsToSixel()` / `wrapSixel()`
    render raster images with the Sixel graphics protocol (256-color palette,
    resizing via `SixelRenderOptions`).
  - **iTerm2 inline images** — `renderIterm2()` emits OSC 1337 inline-image
    sequences (base64, width/height control, `Iterm2RenderOptions`).
  - **tmux passthrough** — `isTmux()` detection and `tmuxPassthrough()` wrapping
    so both protocols survive inside tmux panes.
  - **`renderImage()` routing** — high-level renderer now falls back through
    kitty → sixel → iTerm2 → ANSI half-blocks based on detected terminal
    capabilities.

### Patch Changes

- Updated dependencies []:
  - @bdocs/dui@0.7.0-next.0

## 0.3.0

### Minor Changes

- Lighter image loading pipeline — sharp is no longer a hard dependency.

  - `loadPixels(path, width, height, dither?, page?)` loads images using sharp when available (fast, all formats). When sharp is not installed, falls back to a pure-JS PPM/PGM/PBM reader with nearest-neighbor scaling. PNG/JPEG require sharp.
  - `nearestNeighborResize(pixels, srcW, srcH, dstW, dstH)` pure-JS RGBA resizer suitable for pixel art and small images.
  - `hasSharp()` returns whether the native sharp binary is available.
  - Reduces install size from ~35 MB to ~2 MB when sharp is not needed.

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

- feat: enhance Kitty graphics protocol support in image renderer

  - `renderKitty()` rewritten with proper APC encoding (`\x1b_Ga=T,f=100,m=…`)
  - Chunked at 4096 bytes per protocol spec for reliable large-image transfer
  - `placementX`/`placementY`/`placementId` for absolute screen positioning
  - `compression: 1` enables zlib/deflate to reduce payload size
  - `renderImage()` now auto-detects Kitty via core `hasKitty()` when `format: "auto"`
  - `deleteKittyImage(id)` emits delete sequence for animations/overlays
  - `queryKittyCapabilities()` emits query sequence for capability probing
  - `renderKitty` gracefully falls back to ANSI when `sharp` is not installed
  - Zero-size image guard prevents crash on empty metadata

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

## 0.3.0-next.2

### Patch Changes

- Updated dependencies [[`b6c513d`](https://github.com/bolt-docs/dui/commit/b6c513d22458e6dd6b638cb78de515982bfdbc2c), [`b6c513d`](https://github.com/bolt-docs/dui/commit/b6c513d22458e6dd6b638cb78de515982bfdbc2c), [`b6c513d`](https://github.com/bolt-docs/dui/commit/b6c513d22458e6dd6b638cb78de515982bfdbc2c)]:
  - @bdocs/dui@0.6.0-next.2

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

## 0.2.0

### Minor Changes

- [`83316d1`](https://github.com/bolt-docs/dui/commit/83316d1e2fa30f1a05c89f511298771cb680e54d) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - feat: new `@dui-toolkit/plugin-image` — terminal image renderer

  Render images (PNG, JPG, GIF, WebP) directly in the terminal:

  - **ANSI half-block rendering** — packs 2 vertical pixels per character cell
    using the `▀` character for 2× vertical resolution
  - **Floyd-Steinberg dithering** — reduces color banding in gradients
  - **Kitty Graphics Protocol** — high-fidelity rendering when the terminal
    supports it (auto-detected)
  - **GIF animation** — frame extraction via `renderGifFrames()` and
    continuous playback via `animateGif()` async generator
  - **Terminal detection** — `detectTerminal()` returns capabilities
    (truecolor, sixel, kitty, iterm2, columns, rows, bestFormat)
  - Powered by [sharp](https://sharp.pixelplumbing.com/) for image processing
  - Zero `any` types, fully typed with TypeScript strict mode

  ```ts
  import { renderAnsi, animateGif } from "@dui-toolkit/plugin-image";

  const img = await renderAnsi("./logo.png", { width: 40 });
  console.log(img);

  for await (const frame of animateGif("./spin.gif")) {
    renderLine(frame);
  }
  ```

  The package follows the same conventions as `@dui-toolkit/plugin-chart`
  and `@dui-toolkit/plugin-markdown` (ESM-only, tsdown build, vitest tests).

### Patch Changes

- [`0dfe91c`](https://github.com/bolt-docs/dui/commit/0dfe91c93a964dda441a4cdc44135b288b449930) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - fix: prevent buffer overflow when sharp's `withoutEnlargement` prevents full resize

  `pixelsToAnsi` was receiving the **requested** resize dimensions instead of the
  **actual** sharp output dimensions. When `withoutEnlargement: true` prevents
  image enlargement (e.g. source 30×20, target 30×30 → actual output 30×20),
  the function accessed pixel indices beyond the buffer, returning `undefined`
  RGB values and corrupting terminal output with `\x1b[38;2;undefined;...m`.

  **Fixes:**

  - `render.ts` and `gif.ts`: now use `actualWidth`/`actualHeight` from
    `loadResizedPixels` (sharp's actual dimensions) instead of requested dimensions
  - `utils.ts`: removed redundant `new Uint8Array(data.buffer, …)` wrapping since
    `Buffer` already extends `Uint8Array` — avoids potential issues with Node.js
    pooled shared buffers
  - `render.ts`: removed auto-detection of Kitty protocol — now only used when
    explicitly requested via `format: "kitty"` to prevent terminal corruption
    from raw escape sequences on non-Kitty terminals

- Updated dependencies [[`dfceb01`](https://github.com/bolt-docs/dui/commit/dfceb0181c85769d66137eac90827f681d988543), [`2efd8ef`](https://github.com/bolt-docs/dui/commit/2efd8ef81aa5ab7a3ddf828a0a5b10f58024badf)]:
  - @bdocs/dui@0.5.0
