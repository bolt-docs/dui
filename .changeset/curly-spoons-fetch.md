---
'@bdocs/dui': minor
'@dui-toolkit/plugin-chart': minor
---

**Animation engine overhaul** — 25 easing presets, spring physics, custom cubic-bezier easings, CSS-style keyframes, and a progress-only wrapper.

- **25 easing presets**: linear, ease-in/out/in-out, quad, cubic, quart, quint, sine, expo, circ, back, elastic, bounce
- **`createEasing(x1, y1, x2, y2)`**: CSS-style cubic-bezier custom easing function
- **`createSpring(config?)`**: Spring physics animation with stiffness/damping/mass parameters
- **`SpringConfig`**: Pass `{ stiffness, damping }` directly as the `easing` option for natural motion
- **`animateProgress(config)`**: Simplified API for animating a progress value (0→1) without keyframes
- **`createTimeline()`**: Sequence or overlap multiple lazy animations with parallel/sequential control
- **`fps` option**: Configurable frame rate on both `animate()` and `animateProgress()`
- **CSS-style keyframes**: Smooth interpolation between any number of keyframes with percentage offsets
- **`dui-chart`**: Refactored `animateChart()` to use core `animateProgress()`, eliminating code duplication
