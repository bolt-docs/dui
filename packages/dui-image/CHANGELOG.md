# @dui-toolkit/plugin-image

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
