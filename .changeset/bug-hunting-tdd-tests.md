---
"@bdocs/dui": patch
---

**Bug hunting (TDD)**

Added `tests/bug-hunting.test.ts` with 17 TDD tests that document and
expose 7 bugs found through systematic code analysis:

- **`computeLinesRendered` off-by-one** — `Math.floor(len / width)`
  under-counts rows when a line's visible length is an exact multiple
  of the terminal width (e.g. 81 chars on an 80-col terminal returns 1
  instead of 2). Affects cursor positioning in all interactive prompts.
- **`truncateByCells` docstring mismatch** — Returns `""` when
  `maxCells ≤ 0` instead of `"…"` as the docstring promises.
- **`paginate` CJK counting** — Uses `stripAnsi().length` (codepoints)
  instead of `visibleLength()` (cells), causing CJK content to overflow
  paginated pages.
- **`highlightFuzzy` grapheme splitting** — Uses `Array.from` which
  splits ZWJ emoji sequences into individual codepoints.
- **Form `firstLine` dead code** — Variable assigned but never read.
- **Form number field `-` with negative min** — Silently submits `0`
  instead of rejecting incomplete input.
- **Form `initState` unreachable condition** — `selected < 0` branch
  can never execute.
