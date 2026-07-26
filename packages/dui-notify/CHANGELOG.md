# @dui-toolkit/plugin-notify

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
