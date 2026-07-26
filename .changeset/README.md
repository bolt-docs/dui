# Changesets

This directory contains changeset files that describe changes to packages in this monorepo.

To create a new changeset, run:

```bash
pnpm changeset
```

This will prompt you to select which packages have changed and what kind of version bump they need. The generated markdown file should be committed alongside your code changes.

## Pre-release mode (currently active)

A `.changeset/pre.json` is committed, putting every published release into a `@next` npm dist-tag until you exit pre-release mode and cut stable. While pre-release is active:

- `pnpm exec changeset version` produces versions like `X.Y.Z-next.N` instead of `X.Y.Z`.
- `pnpm exec changeset publish` (run by the `release` script in the root `package.json`) uploads every bumped package with `--tag next` so `pnpm add @bdocs/dui@next` works.
- The `DUI_VERSION` constant in `packages/dui/src/plugin.ts` and the `version:` field in each plugin's `src/plugin.ts` should match the bumped `package.json` value — `versions/<pkg>/CHANGELOG.md` and `getPlugin(name).version` both surface this number, so a mismatch is a public-API bug.
- `peerDependencies.dui` on each plugin widens to `">=X.Y.Z-next.0 <X.(Y+1).0"` during pre-release (an explicit range works on both npm and pnpm — `^` + pre-release is rejected by some resolvers) and reverts to `^X.Y.Z` after stable. Without that widening, `pnpm add @dui-toolkit/<plugin>@next` fails peer-dep resolution for downstream consumers.

### Cutting stable from pre-release

When the next release is ready to ship to the default `latest` dist-tag:

1. `pnpm exec changeset pre exit` — removes `.changeset/pre.json`.
2. `pnpm exec changeset version` — drops the `-next.N` suffix on every package, regenerates CHANGELOGs by condensing all the pre-release entries into the clean stable headers.
3. `pnpm exec changeset publish` — publishes to `latest`.

The `release` script in the root `package.json` chains `build` then `pnpm changeset publish` for CI; the `pre exit` step is a one-time maintenance command run manually before tagging.

#### Files `changeset version` does NOT auto-update (manual checklist)

`changeset version` only edits `package.json` files and `CHANGELOG.md`. It does NOT touch any string literal in source. Before publishing the stable cut, manually walk this list — they're part of the public API surface:

| File | Edit |
|---|---|
| `packages/dui/src/plugin.ts` | Strip `-next.0` so `DUI_VERSION` reads `"0.6.0"` |
| `packages/dui-chart/src/plugin.ts` | `version:` from `"0.4.0-next.0"` → `"0.4.0"`; `peerDependencies.dui` from the explicit `">=0.6.0-next.0 <0.7.0"` range → `"^0.6.0"` |
| `packages/dui-diff/src/plugin.ts` | `version:` from `"0.3.0-next.0"` → `"0.3.0"`; `peerDependencies.dui` → `"^0.6.0"` |
| `packages/dui-image/src/plugin.ts` | same pattern as above |
| `packages/dui-markdown/src/plugin.ts` | same pattern as above |
| `packages/dui-qrcode/src/plugin.ts` | same pattern as above |
| `website/docs/overview/index.mdx` | Remove the `<Callout variant="info">` `@next` banner |
| `website/docs/es/overview/index.mdx` | Remove the ES equivalent `<Callout variant="info">` `@next` banner |

Note: regardless of which peer-range format is in the file during pre-release (`">=…<…"`, `^…-next.0`, etc.), the **post-stable target is always the plain `^X.Y.Z` caret**. The explicit `>=… <…` range is a pre-release-only workaround; once `0.6.0` ships to `latest`, the standard `^0.6.0` is the right range.

`packages/dui/tests/plugin.test.ts` is self-updating: it reads `package.json` at runtime via `import.meta.url` and asserts the major matches `DUI_VERSION`. No manual edit needed there.
