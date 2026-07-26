# Styling & Theme Customization

Boltdocs uses Tailwind CSS with a custom theme defined via `@theme` directives in your CSS file.

## Theme Variables

Define custom theme colors and spacing in your CSS file using `@theme`:

```css
@theme {
  --font-display: "IBM Plex Mono", monospace;
  --color-primary-500: #808080;
  --color-body: #171717;
  /* ... */
}
```

### Key CSS Variables

| Variable | Purpose |
|----------|---------|
| `--color-primary-*` | Primary palette (50–900) for accent, hover states, etc. |
| `--color-neutral-*` | Neutral palette for backgrounds, borders |
| `--color-body` | Main text color |
| `--color-paragraph` | Paragraph text color |
| `--color-muted` | Secondary/muted text |
| `--color-code-bg` | Code block background |
| `--color-main` | Page background |
| `--color-surface` | Surface/card background |
| `--spacing-navbar` | Navbar height |
| `--spacing-sidebar` | Sidebar width |
| `--spacing-content-max` | Max content width |

## Dark Mode

Dark mode uses the `dark` class on the root element. Override light-mode variables:

```css
:root.dark {
  --color-main: #0a0a0a;
  --color-surface: #141414;
  --color-body: #e5e5e5;
  /* ... */
}
```

Use the `@variant dark` directive for custom dark-mode styles:

```css
@variant dark 
(&:where(.dark, .dark *));
```

## Badge Variants

The `<Badge>` component uses semantic color classes. The `warning` variant (used for "next" markers) uses `--color-warning-500` and a yellow background. Customize by overriding:

```css
:root {
  --color-warning-500: oklch(0.78 0.17 75);
}
```

## Terminal Preview Styling

For terminal-style components, define terminal ANSI colors:

```css
--color-terminal-black: #171717;
--color-terminal-green: #3fc972;
--color-terminal-red: #ce4949;
--color-terminal-blue: #367ed5;
/* ... */
```

These map to the standard 16 ANSI terminal colors and are used by `TerminalPreview` for rendering ANSI escape codes.
