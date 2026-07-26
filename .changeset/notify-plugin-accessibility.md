---
"@dui-toolkit/plugin-notify": minor
---

Accessibility-aware routing — every `notify()` call collapses to
multi-line `prefix:` text when plain mode is detected, regardless
of `force: "os" | "osc" | "terminal"`.

What ships:

- `NotifyOptions.plain?: boolean` — per-call opt-in to skip ANSI.
- `chooseBackend()` re-checks `isPlainMode(opts, getConfig())` at
  the top of the dispatcher. Wins over `force`, regardless of
  value. Routes to the `bell` backend so the text path runs.
- `bellNotify()` — when plain mode is on, writes `plainEmit(opts)`
  to stderr instead of emitting `\x07`. The result id switches
  from `bl:<uuid>` to `pln:<uuid>` so log scrapers can grep for
  accessibility-mode notifications explicitly.
- `terminalNotify()` — when plain mode is on, writes `plainEmit(opts)`
  to stderr instead of painting a `box(...)` toast. Skips
  `process.stdin` raw-mode hijack so a screen-reader user can't
  accidentally have their reader's keypress captured by a chip.
  Result backend tag preserves `"terminal"` for log traceability.
- `osNotify()` — when plain mode is on, falls back to
  `bellNotify(...)` so no `notify-send` / `osascript` /
  `powershell.exe` process spawns. Honouring `force: "os"` is not
  the goal in plain mode — accessibility wins.
- `oscNotify()` — same fall-through. OSC 99/9/777 escape sequences
  are themselves ANSI, so plain mode skips them entirely.

Output format:

```text
notify.error: CI failed for PR #1421

  body: Vitest surfaced 3 failing tests.

actions:
  [open-logs] Open logs
  [rerun] Re-run CI
```

`plainEmit(opts)` is exported for direct composition; the result is
identical to what `notify()` writes to stderr internally.

```ts
import { plainEmit } from "@dui-toolkit/plugin-notify";

console.error(plainEmit({
  level: "error",
  title: "CI failed for PR #1421",
  body: "Vitest surfaced 3 failing tests.",
  actions: [
    { id: "open-logs", label: "Open logs" },
    { id: "rerun", label: "Re-run CI" },
  ],
}));
```

Accessibility reference + per-platform capture matrix now rests at
[Accessibility](../overview/accessibility).
