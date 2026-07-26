# Configuration Guide

The main configuration file is `boltdocs.config.ts` at the project root. Use `defineConfig` from `boltdocs` to get full type-checking.

## Base Configuration

```ts
import { defineConfig } from "boltdocs";

export default defineConfig({
  base: "/docs",
  // ...
});
```

### Key Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `base` | `string` | Yes | Base path for the docs site, e.g. `/docs` |
| `i18n` | `object` | No | Internationalization config with locales, defaultLocale, and localeConfigs |
| `siteUrl` | `string` | Yes | Canonical URL for the deployed site |
| `seo` | `object` | No | SEO settings like `indexing` (`"all"`, `"none"`, or `"noindex"`) |
| `theme` | `object` | Yes | Theme configuration (title, description, navbar, logo, etc.) |
| `robots` | `object` | No | Robots.txt and sitemap configuration |

### Theme Options

| Option | Type | Description |
|--------|------|-------------|
| `title` | `string` | Site title shown in the browser tab and navbar |
| `description` | `string` | Meta description for SEO |
| `navbar` | `NavItem[]` | Array of navigation items with `label` and `href` |
| `codeTheme` | `{ light, dark }` | Shiki code highlighting themes |
| `favicon` | `string` | Path to favicon |
| `logo` | `object` | Dark/light mode logos |
| `editLink` | `string` | GitHub edit link template |
| `githubRepo` | `string` | GitHub repository for edit links |

### i18n

When i18n is enabled, each locale gets its own directory under `docs/`. The navbar labels can be localized:

```ts
navbar: [
  {
    label: { en: "Documentation", es: "Documentación" },
    href: "/docs/overview",
  },
]
```

### Versioning

To indicate content is for the next/unreleased version, use the custom `<Badge>` component:

```mdx
<Badge type="warning">next</Badge>
```

This renders a visible "next" badge next to section headers so developers know the feature hasn't been released yet.
