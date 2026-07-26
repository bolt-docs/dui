---
"@dui-toolkit/plugin-notify": minor
---

OS-level notification action capture now lives in the platform backends, not just the terminal toast.

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
    { id: "rerun",     label: "Re-run CI" },
  ],
});
const id = await r.action; // "open-logs" | "rerun" | undefined
```
