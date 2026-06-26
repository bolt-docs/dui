---
"@bdocs/dui": minor
"@dui-toolkit/plugin-markdown": minor
"@dui-toolkit/plugin-chart": minor
---

Plugin system + Markdown + Chart packages

**`@bdocs/dui` core:**
- Added `plugin.ts` with `usePlugin()`, `DuiPlugin`, `PluginAPI`, and `PluginEvents`
- Plugins can hook into `register` and `configure` lifecycle events
- Access core utilities (colors, configure, terminalWidth, etc.) through `api.utils`

**`@dui-toolkit/plugin-markdown` (new package):**
- Render markdown to ANSI-colored terminal output with `md()` and `mdRender()`
- Supports: headings (#), bold (**), italic (*), inline code (`), links, images, lists, blockquotes, code blocks with syntax highlighting, tables, and thematic breaks
- Syntax highlighting via **shiki** with lazy initialization, singleton highlighter, and result caching
- Includes `markdownPlugin` for future integration with the core plugin system

**`@dui-toolkit/plugin-chart` (new package):**
- Bar, column, line, pie, and sparkline chart types
- Each chart supports `progress` (0–1) for data-driven animation
- `animateChart()` helper using the same easing/timing engine as core `animate()`
- Built-in color palette, auto-sizing to terminal width
- Zero external dependencies beyond `@bdocs/dui`
