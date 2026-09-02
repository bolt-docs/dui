---
"@bdocs/dui": patch
---

**Bug hunting + TDD fixes**

Fixed 7 bugs found through systematic code analysis and TDD:

- **`computeLinesRendered` off-by-one** — Changed `Math.floor` to
  `Math.ceil` so lines wrapping to an exact terminal-width boundary
  are counted correctly (e.g. 81 chars on an 80-col terminal now
  returns 2 rows). Affects cursor positioning in all interactive
  prompts (form, select, multiselect, palette, tree).
- **`truncateByCells` docstring mismatch** — Now returns `"…"` when
  `maxCells ≤ 0` as the docstring promises, instead of `""`.
- **`paginate` CJK counting** — Uses `visibleLength()` (cells)
  instead of `stripAnsi().length` (codepoints), so CJK content
  that occupies 2 cells per character is paginated correctly.
- **Form `firstLine` dead code** — Removed the unused variable from
  the non-interactive textarea handler.
- **Form number field `-` with negative min** — `finalize()` now
  treats a bare `-` as empty input, falling back to the field's
  default value instead of silently submitting `0`.
- **Form `initState` unreachable condition** — Removed the dead
  `selected < 0` branch that could never execute.
- **Modal dead code** — Removed unused `row` variable that was
  computed then discarded; the button row is now computed once.
