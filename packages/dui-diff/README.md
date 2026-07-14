# @dui-toolkit/plugin-diff

Render text diffs in the terminal — unified, side-by-side, word-level,
multi-file. Fully themed through DUI's `DuiTheme` system.

```ts
import { diff, diffSideBySide, diffFiles } from '@dui-toolkit/plugin-diff'

const r = diff(oldCode, newCode, { filename: 'src/foo.ts' })
console.log(r.output)
```

See [`website/docs/plugins/diff.mdx`](../../website/docs/plugins/diff.mdx) for
the full API reference.
