---
"@bdocs/dui": patch
---

Fix scrolling bug in interactive prompts (select, multiselect, input, tree)

Two root causes:
1. **Off-by-one in cursor movement**: `readline.moveCursor(up by -linesRendered)` moved 1 row too many because the cursor was already on the last row of the output. Changed to use ANSI save/restore cursor (`\x1b[s`/`\x1b[u`) instead of relative movement.

2. **Wrapped lines miscount**: `linesRendered = lines.length` counted logical array elements instead of actual terminal rows. Added `countRenderLines()` that divides visible length by terminal width with `Math.ceil`.

Also fixed cursor positioning in `input()` — after writing output the cursor now correctly moves to the value line instead of the error line.
