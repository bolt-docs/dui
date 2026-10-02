---
"@bdocs/dui": patch
"@dui-toolkit/plugin-chart": patch
"@dui-toolkit/plugin-diff": patch
"@dui-toolkit/plugin-image": patch
"@dui-toolkit/plugin-markdown": patch
"@dui-toolkit/plugin-notify": patch
"@dui-toolkit/plugin-qrcode": patch
"@dui-toolkit/plugin-tui": patch
---

Resolve each package's version at build time instead of reading
`package.json` at import time.

Every package read its own version in a module-level side effect:

```ts
export const DUI_VERSION: string = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;
```

Correct as a source of truth, but it broke single-file binaries:
`new URL("../package.json", …)` resolves against the module's file URL, and
under `bun build --compile`, `node --experimental-sea`, `pkg` or
`deno compile` there is no such path. The read threw at *import* time,
which took down the whole CLI rather than just the plugin. It was also an
unremovable side effect whose result escaped into an exported binding, so no
bundler could drop the module, and it dragged `node:fs` into the graph.

The source still reads `package.json`; the build now rewrites the emitted
bundle to a literal. The advertised version is still whatever changesets
wrote to `package.json` — it is just resolved at build time rather than at
import time. `node:fs` is no longer reachable from any toolkit plugin's
build output; the core keeps its own because its logger genuinely reads
files.
