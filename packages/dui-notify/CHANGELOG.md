# @dui-toolkit/plugin-notify

## 0.1.1-next.5

### Patch Changes

- Updated dependencies [[`0204e9c`](https://github.com/bolt-docs/dui/commit/0204e9c806da758b35875b09e6da5154425ea7b6)]:
  - @bdocs/dui@0.7.0-next.5

## 0.1.1-next.4

### Patch Changes

- Updated dependencies [[`d5af9a4`](https://github.com/bolt-docs/dui/commit/d5af9a434882efad4b2e766bfdc07acd4934c24c)]:
  - @bdocs/dui@0.7.0-next.4

## 0.1.1-next.3

### Patch Changes

- Updated dependencies [[`09d1b68`](https://github.com/bolt-docs/dui/commit/09d1b6863b519a8d123f6eb347fff276a1d41ddb)]:
  - @bdocs/dui@0.7.0-next.3

## 0.1.1-next.2

### Patch Changes

- Updated dependencies [[`5e185dc`](https://github.com/bolt-docs/dui/commit/5e185dce40d4bbf824743e34aeb4ec2e09b26053)]:
  - @bdocs/dui@0.7.0-next.2

## 0.1.1-next.1

### Patch Changes

- Updated dependencies [[`7260786`](https://github.com/bolt-docs/dui/commit/72607867c0fadf83b131e668747a9880354b68cc), [`7260786`](https://github.com/bolt-docs/dui/commit/72607867c0fadf83b131e668747a9880354b68cc)]:
  - @bdocs/dui@0.7.0-next.1

## 0.1.1-next.0

### Patch Changes

- Updated dependencies []:
  - @bdocs/dui@0.7.0-next.0

## 0.1.0

### Minor Changes

- b6c513d: Accessibility-aware routing — every `notify()` call collapses to
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

  console.error(
    plainEmit({
      level: "error",
      title: "CI failed for PR #1421",
      body: "Vitest surfaced 3 failing tests.",
      actions: [
        { id: "open-logs", label: "Open logs" },
        { id: "rerun", label: "Re-run CI" },
      ],
    })
  );
  ```

  Accessibility reference + per-platform capture matrix now rests at
  [Accessibility](../overview/accessibility).

- b6c513d: OS-level notification action capture now lives in the platform backends, not just the terminal toast.

  When `notify({ ..., actions: [{ id, label }, ...] })` is fired and the dispatcher picks the `os` backend, the action IDs now flow back to `result.action` and `notify.subscribe` handlers:

  - **Linux** — `notify-send -A "id:label"` (libnotify ≥ 0.7.9) emits one arg pair per action and `-w` so the proc blocks until the toast is dismissed or an action fires. The chosen action id is parsed from stdout (first non-empty trimmed line) and mapped onto `result.action`.
  - **Windows** — PowerShell `MessageBox` is invoked with the `OK` / `OKCancel` / `YesNo` button style chosen from `actions.length`, and the `DialogResult` is captured from stdout (`OK` → first action, `Cancel` → `undefined`, `Yes` → first action, `No` → last action).
  - **macOS** — `result.action` resolves to `undefined` (Apple removed AppleScript click-capture). The inline TUI toast's keyboard-chip capture (`force: "terminal"`) is the cross-platform fallback for click → action parity on Mac.

  The dispatcher's `os` branch wraps each call in `try` / `catch` so a missing `notify-send`, a closed OSC pipe, or an unexpected `DialogResult` falls back to `bellNotify` instead of throwing. `result.dismissed` always resolves across the toast's actual on-screen lifetime.

  ```ts
  const r = await notify.error("CI failed for PR #1421", {
    title: "bolt-docs/dui",
    actions: [
      { id: "open-logs", label: "Open logs" },
      { id: "rerun", label: "Re-run CI" },
    ],
  });
  const id = await r.action; // "open-logs" | "rerun" | undefined
  ```

- b6c513d: New `@dui-toolkit/plugin-notify` package — cross-platform desktop notifications and inline TUI toasts for `@bdocs/dui` v0.6+.

  Auto-routes between four backends based on host environment:

  - **OS spawn** (`osascript` / `notify-send` / `powershell.exe`) — real desktop notification center.
  - **OSC escape** (`\x1b]99;…` Kitty · `\x1b]9;…` iTerm2 · `\x1b]777;notify;…` WezTerm/foot/Ghostty) — emulator-native toasts without child-process overhead.
  - **Inline TUI toast** — `box({ style: "round" })` rendered through the existing widget layer.
  - **Bell** (`BEL`/0x07) — silent fallback for CI / non-TTY / disconnected environments.

  ```ts
  import { notify } from "@dui-toolkit/plugin-notify";

  await notify.success("Build complete");
  await notify.error("CI failed: 3 errors", {
    title: "bolt-docs/dui",
    sound: true,
  });
  ```

  25 theme slots (`notify.<level>.{border, bg, fg, icon}` × 5 levels + `notify.ttl`) plus a `notify` render hook + `notify` renderer for `renderWith("notify", payload)`.

  Severity shorthands: `notify.success · .info · .warning · .error · .neutral(text, opts?)`.

- feat: add notification queue with debounce, priority, batching, and throttle

  - `createNotifyQueue(backend, opts?)` wraps any `NotifyApi` with a managed queue
  - Debounce: same `(title, body)` pair within `debounceMs` (default 200ms) collapses into one notification; highest severity level wins
  - Priority drain: `error` > `warning` > `info` > `success` > `neutral`; higher-priority notifications fire before lower-priority ones regardless of arrival order
  - Throttle: minimum `throttleMs` (default 300ms) between backend dispatches prevents process-table explosion from rapid `notify-send` spawns
  - Terminal batching: multiple queued notifications destined for the terminal backend are merged into a single grouped toast with a summary header and per-item body lines
  - Overflow protection: `maxQueueSize` (default 100) drops the lowest-priority notification when exceeded; `onDropped` callback for overflow monitoring
  - `queue.flush()` bypasses throttle timing and dispatches all pending items immediately
  - `queue.depth()` returns the current queue size
  - `queue.configure(opts)` updates runtime parameters (debounce, throttle, max size, etc.)
  - `queue.destroy()` cancels pending items, clears the debounce map, rejects unresolved promises with `QueueDestroyedError`
  - `QueueDestroyedError` class for distinguishing deliberate cancellation from backend failures
  - Graceful process-exit drain via `beforeExit` hook

### Patch Changes

- Updated dependencies [b6c513d]
- Updated dependencies
- Updated dependencies
- Updated dependencies [b6c513d]
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies [b6c513d]
- Updated dependencies
  - @bdocs/dui@0.6.0

## 0.1.0-next.2

### Minor Changes

- [`b6c513d`](https://github.com/bolt-docs/dui/commit/b6c513d22458e6dd6b638cb78de515982bfdbc2c) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - Accessibility-aware routing — every `notify()` call collapses to
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
  notify.error: CI failed for PR [#1421](https://github.com/bolt-docs/dui/issues/1421)

    body: Vitest surfaced 3 failing tests.

  actions:
    [open-logs] Open logs
    [rerun] Re-run CI
  ```

  `plainEmit(opts)` is exported for direct composition; the result is
  identical to what `notify()` writes to stderr internally.

  ```ts
  import { plainEmit } from "@dui-toolkit/plugin-notify";

  console.error(
    plainEmit({
      level: "error",
      title:
        "CI failed for PR [#1421](https://github.com/bolt-docs/dui/issues/1421)",
      body: "Vitest surfaced 3 failing tests.",
      actions: [
        { id: "open-logs", label: "Open logs" },
        { id: "rerun", label: "Re-run CI" },
      ],
    })
  );
  ```

  Accessibility reference + per-platform capture matrix now rests at
  [Accessibility](../overview/accessibility).

- [`b6c513d`](https://github.com/bolt-docs/dui/commit/b6c513d22458e6dd6b638cb78de515982bfdbc2c) Thanks [@jesusalcaladev](https://github.com/jesusalcaladev)! - OS-level notification action capture now lives in the platform backends, not just the terminal toast.

  When `notify({ ..., actions: [{ id, label }, ...] })` is fired and the dispatcher picks the `os` backend, the action IDs now flow back to `result.action` and `notify.subscribe` handlers:

  - **Linux** — `notify-send -A "id:label"` (libnotify ≥ 0.7.9) emits one arg pair per action and `-w` so the proc blocks until the toast is dismissed or an action fires. The chosen action id is parsed from stdout (first non-empty trimmed line) and mapped onto `result.action`.
  - **Windows** — PowerShell `MessageBox` is invoked with the `OK` / `OKCancel` / `YesNo` button style chosen from `actions.length`, and the `DialogResult` is captured from stdout (`OK` → first action, `Cancel` → `undefined`, `Yes` → first action, `No` → last action).
  - **macOS** — `result.action` resolves to `undefined` (Apple removed AppleScript click-capture). The inline TUI toast's keyboard-chip capture (`force: "terminal"`) is the cross-platform fallback for click → action parity on Mac.

  The dispatcher's `os` branch wraps each call in `try` / `catch` so a missing `notify-send`, a closed OSC pipe, or an unexpected `DialogResult` falls back to `bellNotify` instead of throwing. `result.dismissed` always resolves across the toast's actual on-screen lifetime.

  ```ts
  const r = await notify.error(
    "CI failed for PR [#1421](https://github.com/bolt-docs/dui/issues/1421)",
    {
      title: "bolt-docs/dui",
      actions: [
        { id: "open-logs", label: "Open logs" },
        { id: "rerun", label: "Re-run CI" },
      ],
    }
  );
  const id = await r.action; // "open-logs" | "rerun" | undefined
  ```

### Patch Changes

- Updated dependencies [[`b6c513d`](https://github.com/bolt-docs/dui/commit/b6c513d22458e6dd6b638cb78de515982bfdbc2c), [`b6c513d`](https://github.com/bolt-docs/dui/commit/b6c513d22458e6dd6b638cb78de515982bfdbc2c), [`b6c513d`](https://github.com/bolt-docs/dui/commit/b6c513d22458e6dd6b638cb78de515982bfdbc2c)]:
  - @bdocs/dui@0.6.0-next.2

## 0.1.0-next.1

### Minor Changes

- New `@dui-toolkit/plugin-notify` package — cross-platform desktop notifications and inline TUI toasts for `@bdocs/dui` v0.6+.

  Auto-routes between four backends based on host environment:

  - **OS spawn** (`osascript` / `notify-send` / `powershell.exe`) — real desktop notification center.
  - **OSC escape** (`\x1b]99;…` Kitty · `\x1b]9;…` iTerm2 · `\x1b]777;notify;…` WezTerm/foot/Ghostty) — emulator-native toasts without child-process overhead.
  - **Inline TUI toast** — `box({ style: "round" })` rendered through the existing widget layer.
  - **Bell** (`BEL`/0x07) — silent fallback for CI / non-TTY / disconnected environments.

  ```ts
  import { notify } from "@dui-toolkit/plugin-notify";

  await notify.success("Build complete");
  await notify.error("CI failed: 3 errors", {
    title: "bolt-docs/dui",
    sound: true,
  });
  ```

  25 theme slots (`notify.<level>.{border, bg, fg, icon}` × 5 levels + `notify.ttl`) plus a `notify` render hook + `notify` renderer for `renderWith("notify", payload)`.

  Severity shorthands: `notify.success · .info · .warning · .error · .neutral(text, opts?)`.
