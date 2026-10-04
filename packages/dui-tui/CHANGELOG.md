# @dui-toolkit/plugin-tui

## 0.1.2

### Patch Changes

- [`104eeb8`](https://github.com/bolt-docs/dui/commit/104eeb8fa73b9aee5b27635cf67b4ef39f1f9eef) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - Resolve each package's version at build time instead of reading
  `package.json` at import time.

  Every package read its own version in a module-level side effect:

  ```ts
  export const DUI_VERSION: string = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  ).version;
  ```

  Correct as a source of truth, but it broke single-file binaries:
  `new URL("../package.json", …)` resolves against the module's file URL, and
  under `bun build --compile`, `node --experimental-sea`, `pkg` or
  `deno compile` there is no such path. The read threw at _import_ time,
  which took down the whole CLI rather than just the plugin. It was also an
  unremovable side effect whose result escaped into an exported binding, so no
  bundler could drop the module, and it dragged `node:fs` into the graph.

  The source still reads `package.json`; the build now rewrites the emitted
  bundle to a literal. The advertised version is still whatever changesets
  wrote to `package.json` — it is just resolved at build time rather than at
  import time. `node:fs` is no longer reachable from any toolkit plugin's
  build output; the core keeps its own because its logger genuinely reads
  files.

- [`104eeb8`](https://github.com/bolt-docs/dui/commit/104eeb8fa73b9aee5b27635cf67b4ef39f1f9eef) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - Allow plugin theme namespaces in `DuiTheme`, so the documented
  `configure({ theme: { diff: { add: "#88ff88" } } })` form typechecks.

  `DuiTheme` declared only the core slots, but `getFromTheme` walks an
  arbitrary dotted path and the plugin API exposes `registerThemeSlot`, so a
  plugin's namespace cannot be known at compile time. The form above worked
  at runtime and is documented on the plugin pages, but was a type error —
  which is why three of the bundled examples failed `tsc --noEmit` with
  `'diff' does not exist in type 'DuiTheme'`.

  Typing is unchanged for anyone who was already correct: it is a permissive
  target that accepts more, never a different result. Built-in slots keep
  their exact types — `theme: { box: { borderr: "red" } }` still fails with
  `TS2561` against `BoxTheme`, since declared properties take precedence over
  an index signature. Only a misspelled _namespace_ is now accepted, which is
  the unavoidable cost of letting plugins contribute namespaces at all.

- [`104eeb8`](https://github.com/bolt-docs/dui/commit/104eeb8fa73b9aee5b27635cf67b4ef39f1f9eef) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - Repository hygiene, no runtime behaviour change.

  - `pnpm test` no longer fails on a fresh clone. The plugin suites import the
    core through its build output, so the turbo `test` task now depends on
    `^build`; previously every plugin suite died with `Failed to resolve entry
for package "@bdocs/dui"` and the CI workflows only hid it by building
    first.
  - `pnpm typecheck` runs `tsc --noEmit` across all 8 packages, and CI gates
    on it. vitest transpiles without typechecking, so a type error could pass
    the entire test suite. The script fails when a package has no
    `tsconfig.json` rather than skipping it, because a package without one is
    silently exempt from the gate — `dui-tui` shipped for several releases in
    that state.
  - Fixed `dui-image`'s `sharp` types (7 errors from one root cause: sharp
    typed as the module namespace where the callable default export was
    needed) and added `dui-tui`'s missing `tsconfig.json`, so both packages
    can be typechecked at all.
  - Fixed 7 type errors in the bundled `examples/`. Four were the
    plugin-namespace issue above; the rest were `tabs()` being given
    `{ value, label }` objects where it takes plain string labels, and an
    array that widened to a non-callable union.

- Updated dependencies [[`104eeb8`](https://github.com/bolt-docs/dui/commit/104eeb8fa73b9aee5b27635cf67b4ef39f1f9eef), [`104eeb8`](https://github.com/bolt-docs/dui/commit/104eeb8fa73b9aee5b27635cf67b4ef39f1f9eef), [`104eeb8`](https://github.com/bolt-docs/dui/commit/104eeb8fa73b9aee5b27635cf67b4ef39f1f9eef), [`104eeb8`](https://github.com/bolt-docs/dui/commit/104eeb8fa73b9aee5b27635cf67b4ef39f1f9eef)]:
  - @bdocs/dui@0.7.1

## 0.1.1

### Patch Changes

- [`fefc85e`](https://github.com/bolt-docs/dui/commit/fefc85edb5a388b636a9d797ea5dffb4c2051ae0) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - **Bug fixes**

  - **`truncateAnsi()` OSC leak** — the TUI helper only handled CSI escape
    sequences (`\x1b[...m`). OSC sequences like hyperlinks
    (`\x1b]8;;url\x1b\\`) were partially consumed: the `\x1b` was
    swallowed as zero-width and the remainder leaked as visible garbage in
    truncated output. Added `escapeLength()` that correctly scans past CSI,
    OSC (BEL and ST terminators), and two-byte escapes.
  - **`SelectList` empty-filter crash** — ArrowUp/Down/Home/End navigation
    called `onSelect` unconditionally, passing `undefined` to the callback
    when the active filter yielded zero results. All navigation paths now
    guard against an empty items list.
  - **`form()` non-interactive textarea default** — the non-interactive
    textarea path always collected fresh input, ignoring `field.default`.
    Submitting an empty first line now falls back to the default value,
    matching the behavior of text and number fields.

- [`45aad3f`](https://github.com/bolt-docs/dui/commit/45aad3f27a7404d1f5e164572236150f15cfbb56) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - Stop the plugin being versioned as 1.0.0, and make its build explicit.

  `@bdocs/dui` was declared in both `dependencies` and `peerDependencies`. A
  duplicated `peerDependency` makes changesets escalate the dependent to a
  **major** bump whenever the dependency takes a minor or major release
  (`onlyUpdatePeerDependentsWhenOutOfRange` defaults to false), so exiting
  pre mode would have published `@dui-toolkit/plugin-tui@1.0.0` — from a
  `0.1.x` prerelease, on a `patch` changeset. That falsely signals a stable
  1.0 API and breaks anyone resolving `^0.1.0`.

  Removing the redundant `peerDependencies` block puts the plugin on the same
  footing as the other six, which declare `@bdocs/dui` only in
  `dependencies`, and yields the intended `0.1.1`.

  Also adds the missing `tsdown.config.ts`, so `@bdocs/dui` is externalized
  explicitly rather than relying on tsdown's defaults — the same way the
  other plugins are configured. Verified byte-identical `dist/` output
  before and after.

- Updated dependencies [[`0204e9c`](https://github.com/bolt-docs/dui/commit/0204e9c806da758b35875b09e6da5154425ea7b6), [`e6e22ff`](https://github.com/bolt-docs/dui/commit/e6e22ffff8a72dc9426dcfa9d336c8118946269c), [`5e185dc`](https://github.com/bolt-docs/dui/commit/5e185dce40d4bbf824743e34aeb4ec2e09b26053), [`d5af9a4`](https://github.com/bolt-docs/dui/commit/d5af9a434882efad4b2e766bfdc07acd4934c24c), [`09d1b68`](https://github.com/bolt-docs/dui/commit/09d1b6863b519a8d123f6eb347fff276a1d41ddb), [`ff65706`](https://github.com/bolt-docs/dui/commit/ff65706732f19f4fc86418ab3267cd4472702c3f), [`7260786`](https://github.com/bolt-docs/dui/commit/72607867c0fadf83b131e668747a9880354b68cc), [`7260786`](https://github.com/bolt-docs/dui/commit/72607867c0fadf83b131e668747a9880354b68cc), [`b496505`](https://github.com/bolt-docs/dui/commit/b496505ba7c599d084a3ef9b9edb8e949f153328), [`41422af`](https://github.com/bolt-docs/dui/commit/41422af5e5ebd94d71b9bcd3705c6b09f8d2c0bc), [`4e6dc1d`](https://github.com/bolt-docs/dui/commit/4e6dc1d1863002bc06841136e89d133bf9b3becf), [`fefc85e`](https://github.com/bolt-docs/dui/commit/fefc85edb5a388b636a9d797ea5dffb4c2051ae0)]:
  - @bdocs/dui@0.7.0

## 0.1.1-next.6

### Patch Changes

- Updated dependencies [[`e6e22ff`](https://github.com/bolt-docs/dui/commit/e6e22ffff8a72dc9426dcfa9d336c8118946269c)]:
  - @bdocs/dui@0.7.0-next.8

## 0.1.1-next.5

### Patch Changes

- Updated dependencies [[`ff65706`](https://github.com/bolt-docs/dui/commit/ff65706732f19f4fc86418ab3267cd4472702c3f), [`41422af`](https://github.com/bolt-docs/dui/commit/41422af5e5ebd94d71b9bcd3705c6b09f8d2c0bc)]:
  - @bdocs/dui@0.7.0-next.7

## 0.1.1-next.4

### Patch Changes

- Updated dependencies [[`4e6dc1d`](https://github.com/bolt-docs/dui/commit/4e6dc1d1863002bc06841136e89d133bf9b3becf)]:
  - @bdocs/dui@0.7.0-next.6

## 0.1.1-next.3

### Patch Changes

- Updated dependencies [[`0204e9c`](https://github.com/bolt-docs/dui/commit/0204e9c806da758b35875b09e6da5154425ea7b6)]:
  - @bdocs/dui@0.7.0-next.5

## 0.1.1-next.2

### Patch Changes

- Updated dependencies [[`d5af9a4`](https://github.com/bolt-docs/dui/commit/d5af9a434882efad4b2e766bfdc07acd4934c24c)]:
  - @bdocs/dui@0.7.0-next.4

## 0.1.1-next.1

### Patch Changes

- Updated dependencies [[`09d1b68`](https://github.com/bolt-docs/dui/commit/09d1b6863b519a8d123f6eb347fff276a1d41ddb)]:
  - @bdocs/dui@0.7.0-next.3

## 0.1.1-next.0

### Patch Changes

- Updated dependencies [[`5e185dc`](https://github.com/bolt-docs/dui/commit/5e185dce40d4bbf824743e34aeb4ec2e09b26053)]:
  - @bdocs/dui@0.7.0-next.2
