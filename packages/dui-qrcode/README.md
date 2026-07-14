# @dui-toolkit/plugin-qrcode

Render **scannable QR codes** directly in the terminal with ANSI full-block
cells, custom colors, and optional labels.

```ts
import { qrcode } from '@dui-toolkit/plugin-qrcode'

const art = await qrcode('https://github.com/bolt-docs/dui')
console.log(art)
```

## Install

```bash
pnpm add @dui-toolkit/plugin-qrcode
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `width` | `number` | natural | Cap width; switches to single-char cells when below natural size |
| `errorCorrection` | `"L" \| "M" \| "Q" \| "H"` | `"M"` | Reed-Solomon level |
| `color` | `string` | `"#000000"` | Dark modules (hex / rgb / oklch) |
| `bgColor` | `string` | transparent | Light modules; per-row SGR (BCE-safe) |
| `margin` | `number` | `2` | Quiet zone in modules |
| `label` | `boolean \| string` | `true` | Auto text, off, or custom caption |
| `showVersion` | `boolean` | `false` | Label as `QR v<n> \| <EC>` |

Full API reference: [website docs](../../website/docs/plugins/qrcode.mdx).
