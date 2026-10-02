---
"@bdocs/dui": patch
"@dui-toolkit/plugin-image": patch
"@dui-toolkit/plugin-tui": patch
---

Repository hygiene, no runtime behaviour change.

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
