---
"@bdocs/dui": patch
"@dui-toolkit/plugin-image": patch
"@dui-toolkit/plugin-tui": patch
---

Allow plugin theme namespaces in `DuiTheme`, so the documented
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
an index signature. Only a misspelled *namespace* is now accepted, which is
the unavoidable cost of letting plugins contribute namespaces at all.
