# OpenCode TUI Usage Plugin

OpenCode TUI plugin that displays quota and usage information in the sidebar.

## Critical: TUI Plugin Architecture

**This is NOT a React project.** OpenCode TUI uses Solid.js with custom components from `@opentui/solid`.

### Key Technical Requirements

- **Framework**: Solid.js (not React)
- **UI Components**: Use `<box>`, `<text>`, `<Show>`, `<For>` from `@opentui/solid` (not HTML elements)
- **JSX pragma**: Every `.tsx` file must start with `/** @jsxImportSource @opentui/solid */`
- **Export format**: TUI plugins export `.tsx` source files (not compiled `.js`)

### Common Mistakes to Avoid

❌ **Wrong** - Using React/JSX:
```tsx
import React from 'react';
<div style={{ padding: 10 }}>
  <span>Content</span>
</div>
```

✅ **Correct** - Using @opentui/solid:
```tsx
/** @jsxImportSource @opentui/solid */
import { createSignal } from 'solid-js';
<box gap={0}>
  <text>Content</text>
</box>
```

## Project Structure

```
src/
├── tui.tsx         # Main TUI plugin entry (exports to dist/tui.tsx)
├── types.ts        # TypeScript type definitions
├── mock-data.ts    # Mock quota data generator
└── index.ts        # Plugin index (re-exports)
```

## Build & Development

```bash
# Install dependencies
npm install

# Build (compiles src/ → dist/)
npm run build

# Watch mode for development
npm run dev

# Type check without emitting
npm run lint
```

**Note**: After `npm run build`, you must manually copy `src/tui.tsx` to `dist/tui.tsx`. The export in `package.json` points to the `.tsx` source file, not the compiled `.js`.

## Package Configuration

Critical fields in `package.json`:

```json
{
  "type": "module",
  "oc-plugin": ["tui"],
  "exports": {
    "./tui": {
      "types": "./dist/tui.d.ts",
      "default": "./dist/tui.tsx"  // ← Must be .tsx, not .js
    }
  }
}
```

## Local Installation for Testing

Add to `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["/absolute/path/to/opencode-tui-usage-plugin"]
}
```

**Important**: Use `"plugin"` (singular), not `"plugins"`.

## Debugging

Check OpenCode logs for plugin loading errors:

```bash
# Find latest log
cat ~/.local/share/opencode/log/$(ls -t ~/.local/share/opencode/log/ | head -1) | grep -i "tui.plugin\|error"
```

Common issues:
- Missing `"oc-plugin": ["tui"]` in package.json
- Wrong JSX pragma (missing `@opentui/solid` import source)
- Exporting `.js` instead of `.tsx`
- Using `"plugins"` instead of `"plugin"` in tui.json

## References

- OpenCode TUI API types: `@opencode-ai/plugin/tui`
- TUI components: `@opentui/solid` (box, text, Show, For, etc.)
- Solid.js docs: https://www.solidjs.com/
