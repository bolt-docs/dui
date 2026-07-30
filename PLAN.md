# Plan: xterm.js-powered DUI Homepage Demos

## Current Problem

The homepage `ShowcasePreviews` uses hand-crafted ANSI strings rendered through a
custom `ansiToReact` parser (`website/components/TerminalPreview/ansi.tsx`). This
causes:

- Broken layout when ANSI sequences don't match expected patterns
- No real terminal cell-grid rendering — text doesn't wrap/cursor properly
- Animations are fake frame-cycling (`useCycle`) instead of real terminal output
- Scrollable containers (`max-h-[320px] overflow-auto`) break the visual flow

## Solution: xterm.js Real Terminal Emulator

Replace every `<TerminalPreview>` demo in the homepage grid with a thin wrapper
around **xterm.js** — the same engine powering VS Code's integrated terminal.

### Architecture

```
┌─────────────────────────────────────────────┐
│  XtermDemo (React component)                │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  xterm.js Terminal instance          │   │
│  │  (fit addon → auto-resize to parent) │   │
│  │                                      │   │
│  │  Terminal.write(preRecordedAnsi)     │   │
│  │  + WebGL renderer for 60fps          │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  Optional: live-replay via TypeWriter       │
│  effect (write char-by-char from           │
│  pre-recorded JSON sequences)              │
└─────────────────────────────────────────────┘
```

### Component: `XtermDemo`

Props-based terminal demo that renders real ANSI output:

```tsx
<XtermDemo
  title="dui — colors"
  command="node colorize.js"
  lines={[
    "\u001b[38;2;248;113;113mcolors.red('Error')\u001b[0m",
    "\u001b[38;2;74;222;128mcolors.green('Success')\u001b[0m",
  ]}
  columns={48}
  rows={8}
  typewriterMs={15} // optional char-by-char replay
/>
```

### How It Works

1. **xterm.js Terminal** created in a React `useEffect` with `cols` × `rows`.
2. **FitAddon** keeps the terminal sized to the parent container.
3. **WebglAddon** enables GPU-accelerated rendering when available (falls back to
   canvas renderer automatically).
4. On mount, the pre-recorded ANSI content is written via `Terminal.write()`.
5. If `typewriterMs > 0`, a `setInterval` writes characters one at a time for a
   live-coding feel, then loops/repeats.
6. CSS theming via xterm.js `theme` option — maps to our `--color-terminal-*`
   CSS variables so light/dark mode works.

### Demo Content Sources

Each demo's ANSI content comes from one of two sources:

- **Static capture** — Node.js script runs the real DUI command, captures stdout
  + stderr, saves as a `.json` file in `website/public/demos/`. The website
  fetches and replays it.
- **Inline string** — Same hand-crafted ANSI strings as today, but rendered
  through xterm.js's proper parser instead of our buggy `ansiToReact`.

### Performance Optimizations

| Technique | What | Impact |
|-----------|------|--------|
| WebGL renderer | GPU-accelerated terminal drawing | 60fps even with heavy ANSI |
| CSS `content-visibility: auto` | Skip layout for off-screen demos | 0ms paint cost when hidden |
| Dynamic import `lazy()` | xterm.js chunks only loaded when demo section is scrolled into view | -300KB initial bundle |
| `useIdlePrefetch` | Preload xterm chunks after hero section renders | No perceived delay |
| XtermDemo `shouldComponentUpdate` via `useMemo` | No re-render if ANSI content hasn't changed | 0 React reconciliation cost |
| Resize debouncing (100ms) | Avoid layout thrashing when resizing window | Smooth responsive behavior |

### Migration Steps

1. **Create `XtermDemo`** — React wrapper around xterm.js Terminal + FitAddon
2. **Create `useTerminalWriter`** — hook that writes ANSI char-by-char for
   typewriter effect, then loops
3. **Replace 6 demo containers** in homepage grid:
   - `<ListsDemo>` → `<XtermDemo title="dui — lists" .../>`
   - `<ColorsDemo>` → `<XtermDemo title="dui — true color" .../>`
   - `<GridDemo>` → `<XtermDemo title="dui — grid & layout" .../>`
   - `<AnimationDemo>` → `<XtermDemo title="dui — animation" .../>`
   - `<BoxesDemo>` → `<XtermDemo title="dui — boxes" .../>`
   - `<DiffDemo>` → `<XtermDemo title="dui — diff" .../>`
4. **Remove `ShowcasePreviews`** if no other page imports it
5. **Add capture script** `scripts/capture-demo.mjs` that runs DUI and saves ANSI

### File Changes

```
NEW  website/components/XtermDemo.tsx          # xterm.js wrapper component
NEW  website/hooks/useTerminalWriter.ts         # typewriter replay hook
NEW  website/public/demos/*.json               # captured ANSI recordings
MOD  website/docs/pages-external/home.tsx       # replace demo imports
DEL  website/components/ShowcasePreviews.tsx    # (optional) remove old demos
MOD  website/index.css                          # xterm.js CSS overrides
MOD  website/terminal-theme.css                  # xterm theme variables
```
