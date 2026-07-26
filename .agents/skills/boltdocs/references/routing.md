# Routing & Directories

Boltdocs uses file-system based routing. Pages are discovered automatically from the `docs/` directory.

## Directory Structure

```
docs/
├── overview/
│   ├── meta.json        ← Sidebar ordering, icon, and title
│   ├── index.mdx         ← Overview landing page
│   ├── getting-started.mdx
│   └── llm.mdx
├── api/
│   ├── meta.json
│   ├── index.md
│   ├── config.md
│   ├── prompt.md
│   └── ...
├── plugins/
│   ├── meta.json
│   ├── index.mdx
│   └── ...
└── layout.tsx            ← Page layout wrapper
```

## meta.json

Each directory should have a `meta.json` file that configures the sidebar:

```json
{
  "title": "API Reference",
  "icon": "Code2",
  "order": 2
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Group title in the sidebar |
| `icon` | `string` | Lucide icon name (e.g., `Code2`, `BookOpen`, `Terminal`) |
| `order` | `number` | Display order in the sidebar (lower = earlier) |

## Individual Page Metadata

Each page can have frontmatter:

```mdx
---
title: Config
sidebarPosition: 1
description: Configure DUI's identity — prefix, server titles, and update command.
---
```

### Frontmatter Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Page title (required) |
| `sidebarPosition` | `number` | Position in sidebar relative to siblings |
| `description` | `string` | Meta description for SEO |
| `keywords` | `string[]` | SEO keywords |

## i18n Routing

When i18n is enabled, each locale gets its own mirror directory:

```
docs/
├── overview/
│   ├── getting-started.mdx    ← English version
│   └── ...
├── es/
│   └── overview/
│       ├── getting-started.mdx ← Spanish translation
│       └── ...
```

The `layout.tsx` and `mdx-components.tsx` at the root of `docs/` apply to all locales. Place locale-specific layouts in the locale directory if needed.
