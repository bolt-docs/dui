---
"@bdocs/dui": minor
---

feat: interactive prompt components — Input, Select, Multiselect, Tree

- **Input**: free text prompt with cursor navigation (←/→/Home/End), Backspace/Delete,
  Ctrl+U/K, placeholder, and validation
- **Select**: single-select list with arrow keys, disabled items, page scrolling,
  and non-TTY fallback
- **Multiselect**: multi-select list with Space toggle, required mode (blocks empty
  submission, prevents deselect last), checked initial state, and non-TTY fallback
- **Tree**: hierarchical prompt with expand/collapse (▶/◀/Space/Enter), ancestor
  collapse on ←, disabled branches, and non-TTY leaf listing
- **Theme**: new theme slots `input.*`, `select.*`, `multiselect.*`, `tree.*`
  with defaults in `getDefaultFn`
- **fix**: confirm prompt tests — removed module-level `vi.mock("node:readline")`
  that polluted the vitest process; set `isTTY` correctly so 4 previously broken
  tests now pass
