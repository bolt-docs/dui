# @dui-toolkit/plugin-qrcode

## 0.2.0

### Minor Changes

- [`2efd8ef`](https://github.com/bolt-docs/dui/commit/2efd8ef81aa5ab7a3ddf828a0a5b10f58024badf) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - **New plugin: `@dui-toolkit/plugin-qrcode`** — scannable QR codes in the terminal.

  - **`qrcode(text, options?)`** — ANSI full-block cells (`██`/`  ` natural, `█`/` ` when `width` is capped), per-row SGR (BCE-safe `bgColor`)
  - **Colors** via DUI (`toAnsiFg` / `toAnsiBg`): hex, `rgb()`, `oklch()`
  - **Options:** `width`, `errorCorrection` (L|M|Q|H), `color`, `bgColor`, `margin`, `label` (`boolean | string`), `showVersion`
  - **Modular layout:** `types` / `render` / `utils` / `index` with unit-tested helpers
  - **Docs:** EN + ES at `/docs/plugins/qrcode`, example `examples/13-qrcode`

### Patch Changes

- Updated dependencies [[`dfceb01`](https://github.com/bolt-docs/dui/commit/dfceb0181c85769d66137eac90827f681d988543), [`2efd8ef`](https://github.com/bolt-docs/dui/commit/2efd8ef81aa5ab7a3ddf828a0a5b10f58024badf)]:
  - @bdocs/dui@0.5.0
