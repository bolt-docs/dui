---
'@dui-toolkit/plugin-image': patch
---

fix: prevent buffer overflow when sharp's `withoutEnlargement` prevents full resize

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
