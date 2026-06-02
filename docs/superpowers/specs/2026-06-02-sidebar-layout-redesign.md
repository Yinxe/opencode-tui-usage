# Sidebar Layout Redesign

## Overview

Redesign the `opencode-tui-usage` plugin sidebar layout for `sidebar_content` slot.
Goal: compact single-column layout that fits ~35 character width, no scrollable sections,
all content visible at once.

## Layout

```
● DeepSeek · deepseek-r1          60s
═══════════════════════════════════════
 Balance  ¥100.00
─────────────────────────────────────
 Plan
 Rll  76% ████████░░ 2h
 Wkly 42% ████░░░░░░ 4d
 Mth  15% ██░░░░░░░░ 12d
─────────────────────────────────────
 Session
 ID: abc12  Messages: 23
 TODOs: 4  Changes: 5
 Branch: feat/x
 Context: 45K/128K ████████░░░░ 35%
─────────────────────────────────────
 Tokens
 I: 169.3K  O: 5.4K  R: 8.8K
 Cache: R:902K W:0  Cost: $0.030
 deepseek-v4-flash:
   ├─ I: 169.3K
   ├─ O: 5.4K
   ├─ R: 8.8K
   ├─ Cache: 902K
   └─ Cost: $0.030 (21 msg)
```

## Sections

### 1. Header
- Format: `● {Provider} · {Model}           {refresh}s`
- Right-aligned countdown timer

### 2. Balance (conditional)
- Only shown when provider supports `fetchBalance()`
- Single line: `Balance  ¥{amount}`
- Currency symbol determined by provider data

### 3. Plan (conditional)
- Only shown when provider returns quota data (not balance-only)
- Labels: `Rll` (Rolling), `Wkly` (Weekly), `Mth` (Monthly)
- Each line: `{label} {pct}% ████████░░ {resetTime}`
- Progress bar width: 12 chars
- Color coding: <60% green, 60-80% yellow, >80% red

### 4. Session
- Always visible
- Lines:
  - `ID: {shortId}  Messages: {count}`
  - `TODOs: {n}  Changes: {n}`
  - `Branch: {name}`
  - `Context: {used}/{limit} ████████░░░░ {pct}%`
- Context progress bar: 12 chars width

### 5. Tokens
- Always visible
- Aggregate: `I: {in}  O: {out}  R: {reason}`
- Second line: `Cache: R:{read} W:{write}  Cost: ${cost}`
- Per-model breakdown (indented with `├─`/`└─`):
  - `{shortModelName}:`
  - `├─ I: {in}`
  - `├─ O: {out}`
  - `├─ R: {reason}`
  - `├─ Cache: {cache}`
  - `└─ Cost: ${cost} ({n} msg)`

## Design Constraints

- **Max line width**: 35 characters
- **No scrollable sections**: all content must fit vertically
- **No collapsible sections**: info visible at a glance
- **No abbreviations in Session**: labels like `ID`, `Messages`, `TODOs`, `Changes`
- **Abbreviations in Tokens**: `I:` (Input), `O:` (Output), `R:` (Reasoning)
- **Abbreviations in Plan**: `Rll` (Rolling), `Wkly` (Weekly), `Mth` (Monthly)

## Separators

- Header separator: `═════════` (double line, 35 chars)
- Section separators: `─────────` (single line, 35 chars)
- Sections separated visually by full-width horizontal rules

## Removed from Old Layout

- Collapsible panels → flat layout
- `Collapsible` component no longer needed
- `ScrollBox` no longer needed
- Progress bar width reduced from 20 to 12
- `SessionInfoView` no longer shows `Provider` and `Model` (already in header)
- Token labels use abbreviations (I/O/R instead of Input/Output/Reasoning)
- Per-model cost detail includes message count

## Files to Change

1. **`src/tui.tsx`** — Remove `Collapsible` wrappers, restructure layout, remove `QuotaSection` helper
2. **`src/balance-view.tsx`** — Compact single-line format
3. **`src/usage.tsx`** → **`src/plan-view.tsx`** — Rename, restructure with short labels, 12-char progress bar
4. **`src/session-info.tsx`** — Remove Provider/Model lines, add Branch/Changes, shorten labels
5. **`src/tokens-usage.tsx`** — Use I/O/R/Cache abbreviations, compact per-model format
6. **`src/components.tsx`** — Consider removing `Collapsible` if no longer used; adjust `ProgressBar` default width to 12

## Future Considerations

None. This is a focused layout-only change. No new providers, no new data sources.
