---
"@bdocs/dui": patch
---

Stop `input()`, `select()`, `multiselect()`, `tree()`, `palette()` and
`form()` from deadlocking when stdin is not a TTY.

Each of those prompts falls back to a readline question when stdin or
stdout is not a TTY, so a CLI stays usable in a pipeline or in CI. Every
fallback was built on `rl.question()` with no `close` handler.

readline invokes the `question` callback only when a full line arrives. On
stdin EOF it emits `close` and never calls the callback, so the promise
around it never settled and the process hung with no output and no error:

```bash
printf '' | mycli
# hangs forever
```

`confirm()` was unaffected — it resolves its default without reading.

The six fallbacks now share one EOF-safe helper, so the path cannot drift
apart again. A textarea keeps the lines it already received when stdin
closes instead of discarding a half-typed value for the default, and the
non-TTY interface is created with `terminal: false` so readline cannot emit
line-editor escapes into a captured stream.

A pipe that stays open and later delivers a line still reads that line, so
interactive use is untouched.
