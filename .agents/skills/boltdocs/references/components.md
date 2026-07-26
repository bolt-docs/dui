# Built-in & Custom Components

Boltdocs provides premium React components for MDX content. All components are registered in `docs/mdx-components.tsx`.

## Available Components

### Callout

Colored callout box for tips, warnings, and notes:

```mdx
<Callout variant="info">
  Mouse features require SGR 1006 protocol support (most modern terminals).
</Callout>

<Callout variant="warning">
  This API is experimental and may change.
</Callout>

<Callout variant="error">
  This configuration is required, not optional.
</Callout>

<Callout variant="note">
  In non-TTY environments, type comma-separated numbers.
</Callout>
```

### Field

Documentation field with name, type, default, and description:

```mdx
<Field name="prefix" type="string" default="'dui'">Prefix shown in log lines.</Field>
<Field name="theme" type="DuiTheme">Global theme overrides.</Field>
```

### Card / Cards

Card grid for feature showcases:

```mdx
<Cards>
  <Card title="Getting Started" href="/docs/overview/getting-started" icon="Rocket">
    Quick start guide for DUI.
  </Card>
  <Card title="API Reference" href="/docs/api" icon="Code2">
    Complete API documentation.
  </Card>
  <Card title="Plugins" href="/docs/plugins" icon="Puzzle">
    Extend DUI with official plugins.
  </Card>
</Cards>
```

### TerminalPreview

Live terminal preview with ANSI rendering:

```mdx
<TerminalPreview command="node prompt.js">
{`\x1b[33m?\x1b[0m \x1b[1mAre you sure?\x1b[0m (Y/n)
\x1b[1m[dui]\x1b[0m Custom message`}
</TerminalPreview>
```

### PackageManager

Package manager tabs (npm, yarn, pnpm, bun):

```mdx
<PackageManager>
  <PackageManager.Tab id="npm">npm install @bdocs/dui</PackageManager.Tab>
  <PackageManager.Tab id="yarn">yarn add @bdocs/dui</PackageManager.Tab>
  <PackageManager.Tab id="pnpm">pnpm add @bdocs/dui</PackageManager.Tab>
</PackageManager>
```

### Badge

Version or status badge for next/unreleased features:

```mdx
<Badge type="warning">next</Badge>
<Badge type="info">stable</Badge>
<Badge type="success">new</Badge>
```

## MDX Components Registration

Components are exported from `docs/mdx-components.tsx`:

```tsx
import Callout from "../components/mdx/Callout";
import { Card } from "../components/mdx/Card";
import { Cards } from "../components/mdx/Cards";

export default {
  Callout,
  Card,
  Cards,
  // ... more components
};
```

## Custom Tag Overrides

You can override HTML tags by adding keys to the default export:

```tsx
export default {
  TerminalPreview,
  Callout,
  Card,
  Cards,
  // Override HTML tags:
  h1: CustomH1,
  table: CustomTable,
};
```
