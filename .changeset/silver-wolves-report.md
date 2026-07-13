---
'@dui-toolkit/plugin-image': minor
---

feat: new `@dui-toolkit/plugin-image` — terminal image renderer

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
import { renderAnsi, animateGif } from '@dui-toolkit/plugin-image'

const img = await renderAnsi('./logo.png', { width: 40 })
console.log(img)

for await (const frame of animateGif('./spin.gif')) {
  renderLine(frame)
}
```

The package follows the same conventions as `@dui-toolkit/plugin-chart`
and `@dui-toolkit/plugin-markdown` (ESM-only, tsdown build, vitest tests).
