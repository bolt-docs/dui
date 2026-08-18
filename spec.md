# DUI — Specification

> **DUI** is a terminal UI component library for Node.js.
> It provides boxes, colors, animations, interactive prompts, plugins,
> and a theme system — all zero-dependency, all ANSI-native.

This document defines what DUI is and the rules
that every contribution must follow.

---

## 1. What DUI Is

| Property | Definition |
|----------|-----------|
| **Type** | UI component library (not a framework, not an app) |
| **Runtime** | Node.js (>=18), ESM-only |
| **Interface** | Pure functions that return ANSI strings |
| **Dependencies** | Zero runtime deps (dev deps only: vitest, biome, tsdown) |
| **Scope** | Terminal output — boxes, colors, text, animation, prompts, plugins |

### Core Principles

1. **Pure functions first.** Every component is a function that takes
   input and returns a string. No side effects, no global state mutation,
   no hidden I/O. The only exceptions are `configure()` (global config)
   and the plugin registry (one global map).

2. **ANSI strings, not DOM.** Output is always a string with ANSI escape
   codes. No VT100 sequences, no cursor movement, no alternate screen
   unless explicitly requested. This makes output pipeable and testable.

3. **Zero runtime dependencies.** Every dependency adds maintenance
   burden and attack surface. If a feature needs a library, it probably
   doesn't belong in DUI. Write it yourself or find another project.

4. **Accessibility by default.** Every component must detect `NO_COLOR`,
   `TERM=dumb`, and `--plain` mode. When detected, output degrades
   gracefully to plain text. No ANSI, no colors, no escape codes.

5. **Plugin-extensible.** New components should be plugins, not core
   additions. The plugin system exists so DUI stays small and focused.
   If it can be a plugin, it should be a plugin.

---

## 3. Architecture

### Monorepo Structure

```
dui/
├── packages/
│   ├── dui/                  # Core library (@bdocs/dui)
│   ├── dui-chart/            # Charts plugin
│   ├── dui-markdown/         # Markdown renderer plugin
│   ├── dui-diff/             # Diff viewer plugin
│   ├── dui-image/            # Image/ANSI art plugin
│   ├── dui-notify/           # Notification plugin
│   ├── dui-qrcode/           # QR code plugin
│   └── dui-pty/              # PTY/process management plugin
├── examples/                 # Runnable demos (npx tsx)
├── website/                  # Documentation site
└── spec.md                   # This file
```

### Package Naming

| Scope | Pattern | Example |
|-------|---------|---------|
| Core | `@bdocs/dui` | `@bdocs/dui` |
| Plugins | `@dui-toolkit/plugin-{name}` | `@dui-toolkit/plugin-chart` |

### Plugin Structure

Every plugin follows this pattern:

```
dui-{name}/
├── src/
│   ├── index.ts        # Public exports
│   ├── plugin.ts       # DuiPlugin definition + setup()
│   └── ...             # Implementation files
├── tests/
│   └── plugin.test.ts  # Version parity test (required)
├── package.json
└── tsconfig.json
```

### Plugin Registration

```typescript
// plugin.ts
import type { DuiPlugin } from "@bdocs/dui";

export const myPlugin: DuiPlugin = {
  name: "@dui-toolkit/plugin-my-plugin",
  version: pkgVersion,           // from package.json
  description: "...",
  tags: ["renderer", "my-tag"],
  peerDependencies: { dui: "^0.6.0" },
  setup(api) {
    // Register theme slots
    api.registerThemeSlot("my.color", "#ff0000");
    // Register renderers
    api.registerRenderer("my", async (input) => renderMy(input));
    // Return cleanup
    return () => { /* cleanup */ };
  },
};
```

---

## 4. Code Rules

### Formatting (enforced by Biome)

| Rule | Value |
|------|-------|
| Indent | Tabs (not spaces) |
| Quotes | Double quotes |
| Semicolons | Always |
| Line width | 100 chars |
| Trailing commas | All |

### TypeScript

- **Strict mode** — `strict: true` in tsconfig
- **No `any`** — Use `unknown` and narrow
- **No `enum`** — Use string unions + maps
- **No default exports** — Named exports only
- **No barrel re-exports in core** — Explicit exports in `index.ts`

### File Organization

- One concern per file
- Filename = primary export name (e.g., `box.ts` exports `box()`)
- Types in the same file as the function (unless shared)
- Tests in `tests/` directory, one file per source file

### Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Functions | camelCase | `box()`, `formatTable()` |
| Types | PascalCase | `BoxOptions`, `PluginMeta` |
| Constants | camelCase | `DUI_VERSION` (acronym exception) |
| Files | kebab-case | `plugin.ts`, `alt-screen.ts` |
| Theme slots | dot-separated | `markdown.heading1` |

### Exports

```typescript
// ✅ Good — explicit named exports
export { box, formatBox } from "./box";
export type { BoxOptions } from "./box";

// ❌ Bad — barrel re-exports hide what's exported
export * from "./box";
```

---

## 5. Testing Rules

### Framework: Vitest

```bash
pnpm test          # run all tests
pnpm test -- watch # watch mode
```

### Test Structure

```typescript
import { describe, expect, it } from "vitest";
import { box } from "../src/box";

describe("box", () => {
  it("renders a single-line box", () => {
    const result = box(["hello"]);
    expect(result).toContain("hello");
    expect(result).toContain("─");
  });
});
```

### Requirements

1. **Every public function** must have at least one test
2. **Version parity test** — every plugin must verify its version matches package.json:

```typescript
it("exposes plugin version matching package.json", () => {
  const pkgVersion = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ).version;
  expect(myPlugin.version).toBe(pkgVersion);
});
```

3. **No snapshot tests** for ANSI output — they break across terminals
4. **Test the string output**, not the escape codes
5. **Each test file** should be independent (no shared mutable state)

### What to Test

- Correct output structure (box borders, table alignment)
- Edge cases (empty input, very long strings, unicode)
- Accessibility mode (plain text fallback)
- Theme slot resolution

### What Not to Test

- ANSI color codes (implementation detail)
- Performance (benchmark separately)
- Third-party integration (integration tests, not unit)

---

## 6. Accessibility

### Mandatory Detection

Every component MUST check:

```typescript
import { isPlainMode, isReducedMotion } from "@bdocs/dui";

// Skip ANSI when in plain mode
if (isPlainMode()) return plainText;

// Skip animations when reduced motion
if (isReducedMotion()) return staticVersion;
```

### Environment Variables

| Variable | Effect |
|----------|--------|
| `NO_COLOR` | Disable all colors |
| `TERM=dumb` | Disable all formatting |
| `--plain` flag | Disable colors + animations |

### Fallback Behavior

- Colors → plain text (no escape codes)
- Boxes → plain text with borders removed
- Animations → final frame only
- Spinners → "loading..." text
- Tables → tab-separated values

---

## 7. Theming

### Theme Slots

Plugins register theme slots with defaults:

```typescript
api.registerThemeSlot("my.color", "#ff0000");
api.registerThemeSlot("my.bg", { fg: "#fff", bg: "#333" });
```

### Resolution

```typescript
import { resolveColor } from "@bdocs/dui";

const { apply, bg } = resolveColor("my.color", getConfig().theme);
console.log(apply("hello"));  // colored string
```

### User Override

```typescript
configure({
  theme: {
    my: { color: "#00ff00" },  // override slot
  },
});
```

---

## 8. Plugin Lifecycle

```
usePluginAsync(plugin)
  → checkPeerDeps(plugin)     # warn on version mismatch
  → checkDependants(plugin)    # warn on missing deps
  → plugin.setup(api)          # register slots, hooks, renderers
  → emit("register")           # notify listeners
  → return cleanup function    # called on unregister
```

### Hook Priority

| Priority | Runs |
|----------|------|
| `"first"` | First (MAX_SAFE_INTEGER) |
| `10` | Before default |
| `0` (default) | Middle |
| `-10` | After default |
| `"last"` | Last (MIN_SAFE_INTEGER) |

### Shared State

Plugins communicate through `api.shared`:

```typescript
// Plugin A
api.shared.set("highlightedLine", 42);

// Plugin B
const line = api.shared.get<number>("highlightedLine");
```

---

## 9. Build

### Tools

| Tool | Purpose |
|------|---------|
| `tsdown` | Bundle TypeScript → ESM (.mjs) |
| `turbo` | Orchestrate monorepo builds |
| `vitest` | Test runner |
| `biome` | Linter + formatter |
| `changeset` | Version management |

### Build Command

```bash
pnpm build    # build all packages (turbo orchestrates)
pnpm test     # test all packages
pnpm format   # format with biome
pnpm lint     # lint with biome
```

### Output

Every package outputs:
- `dist/index.mjs` — ESM bundle
- `dist/index.d.mts` — TypeScript declarations

No CJS output. No UMD. ESM only.

---

## 10. Versioning

### Changesets

```bash
pnpm changeset          # create a changeset
pnpm changeset version  # bump versions
pnpm changeset publish  # publish to npm
```

### Version Rules

- **Patch** (0.1.x): Bug fixes, internal refactors
- **Minor** (0.x.0): New features, new plugins, new theme slots
- **Major** (x.0.0): Breaking API changes, removing exports

### Pre-release

```bash
pnpm changeset pre enter next  # enter pre-release mode
pnpm changeset version         # bump to 0.x.y-next.N
```

---

## 11. Contribution Checklist

Before merging any PR:

- [ ] Code follows formatting rules (biome)
- [ ] TypeScript compiles without errors
- [ ] All existing tests pass
- [ ] New code has tests
- [ ] Public functions have JSDoc
- [ ] Plugin has version parity test
- [ ] Accessibility mode works
- [ ] No new runtime dependencies added
- [ ] Changeset created (if user-facing)

---

*Last updated: 2026-08-18*
