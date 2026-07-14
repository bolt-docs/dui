---
"@dui-toolkit/plugin-qrcode": minor
---

**New plugin: `@dui-toolkit/plugin-qrcode`** — scannable QR codes in the terminal.

- **`qrcode(text, options?)`** — ANSI full-block cells (`██`/`  ` natural, `█`/` ` when `width` is capped), per-row SGR (BCE-safe `bgColor`)
- **Colors** via DUI (`toAnsiFg` / `toAnsiBg`): hex, `rgb()`, `oklch()`
- **Options:** `width`, `errorCorrection` (L|M|Q|H), `color`, `bgColor`, `margin`, `label` (`boolean | string`), `showVersion`
- **Modular layout:** `types` / `render` / `utils` / `index` with unit-tested helpers
- **Docs:** EN + ES at `/docs/plugins/qrcode`, example `examples/13-qrcode`
