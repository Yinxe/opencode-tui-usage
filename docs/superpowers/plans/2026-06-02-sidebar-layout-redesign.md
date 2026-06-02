# Sidebar Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace vertical stacked Collapsible panels with a compact single-column flat layout that fits ~35 character sidebar width.

**Architecture:** Seven sequential tasks: update shared component defaults → create HeaderView → simplify BalanceView → rename/rewrite UsageView→PlanView → rewrite SessionInfoView → rewrite TokensUsageView → restructure tui.tsx entry. No new data sources or providers; pure layout/skin changes.

**Tech Stack:** Solid.js + @opentui/solid, TypeScript

---

### Task 1: Update ProgressBar default width

**Files:**
- Modify: `src/components.tsx:126`

- [ ] **Step 1: Change default width from 20 to 12**

```typescript
// line 126 — change default
const width = props.width ?? 12;
```

- [ ] **Step 2: Verify**

Run: `npm run lint`
Expected: No errors. (Collapsible kept for safety but no longer used anywhere.)

- [ ] **Step 3: Commit**

```bash
git add src/components.tsx
git commit -m "refactor: reduce ProgressBar default width 20→12"
```

---

### Task 2: Create HeaderView component

**Files:**
- Create: `src/header-view.tsx`

- [ ] **Step 1: Create src/header-view.tsx**

```typescript
/** @jsxImportSource @opentui/solid */
import type { JSX } from "solid-js";
import { createSignal, createEffect, Show } from "solid-js";
import type { TuiPluginApi } from "@opencode-ai/plugin/tui";
import { findLastAssistantMessage } from "./utils.js";

export interface HeaderViewProps {
  api: TuiPluginApi;
  sessionId: string;
}

export function HeaderView(props: HeaderViewProps): JSX.Element {
  const [provider, setProvider] = createSignal<string | null>(null);
  const [model, setModel] = createSignal<string | null>(null);

  createEffect(() => {
    const messages = props.api.state.session.messages(props.sessionId);
    if (!messages || messages.length === 0) {
      setProvider(null);
      setModel(null);
      return;
    }
    const lastMsg = findLastAssistantMessage(messages);
    if (!lastMsg) {
      setProvider(null);
      setModel(null);
      return;
    }
    setProvider(lastMsg.providerID);
    setModel(lastMsg.modelID || "");
  });

  return (
    <Show when={provider()} fallback={<text fg="#888">● No session</text>}>
      <box flexDirection="row" gap={0}>
        <text fg="#6bcf7f">● </text>
        <text fg="#e0e0e0">{provider()}</text>
        <Show when={model()}>
          <text fg="#888"> · </text>
          <text fg="#aaa">{model()}</text>
        </Show>
      </box>
    </Show>
  );
}
```

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/header-view.tsx
git commit -m "feat: add HeaderView for provider/model display"
```

---

### Task 3: Simplify BalanceView

**Files:**
- Modify: `src/balance-view.tsx`

Keep all data fetching logic. Replace the render block with a single-line `Balance  ¥{amount}`.

- [ ] **Step 1: Replace render return (lines 137-156)**

New minimal return:

```typescript
  return (
    <Show when={hasBalance() && balance()} keyed>
      {(data: BalanceData) => (
        <box flexDirection="row" gap={0}>
          <text fg="#4da6ff">Balance</text>
          <text>  ¥{data.totalBalance.toFixed(2)}</text>
        </box>
      )}
    </Show>
  );
```

- [ ] **Step 2: Remove unused imports**

Remove `formatDuration` from formatters import (line 6). Remove `onCleanup` from solid-js import (line 3). Remove unused `<Show>` from imports if the first `<Show>` is no longer needed — actually `Show` IS still used by the return.

Imports should become:
```typescript
import { createSignal, createEffect, Show } from "solid-js";
```

- [ ] **Step 3: Lint check**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/balance-view.tsx
git commit -m "refactor: simplify BalanceView to single-line format"
```

---

### Task 4: Create PlanView (replace UsageView)

**Files:**
- Create: `src/plan-view.tsx`
- Delete: `src/usage.tsx`

- [ ] **Step 1: Create src/plan-view.tsx**

```typescript
/** @jsxImportSource @opentui/solid */
import type { JSX } from "solid-js";
import { createSignal, createEffect, onCleanup, Show } from "solid-js";
import { ProgressBar } from "./components.jsx";
import type { TuiPluginApi } from "@opencode-ai/plugin/tui";
import type { QuotaResult, QuotaData, QuotaUsage } from "./quota/types.js";
import { cachedSignal, findLastAssistantMessage } from "./utils.js";

const REFRESH_INTERVAL = 60;
let lastRefreshTime = 0;

export interface PlanViewProps {
  quotaService: {
    fetchQuota(): Promise<QuotaResult | null>;
    setActiveProvider(providerName: string): boolean;
    isProviderSupported(providerName: string): boolean;
    supportsBalance(): boolean;
    getRegisteredProviderNames(): string[];
    getConfiguredProviderNames(): string[];
  };
  api: TuiPluginApi;
  sessionId: string;
}

function barColor(pct: number): string {
  if (pct > 80) return "#ff6b6b";
  if (pct > 60) return "#ffd93d";
  return "#6bcf7f";
}

export function PlanView(props: PlanViewProps): JSX.Element {
  const [result, setResult] = cachedSignal<QuotaResult | null>("plan.result", null);
  const [loading, setLoading] = createSignal(!result());
  const [currentProvider, setCurrentProvider] = createSignal<string | null>(null);
  const [currentModel, setCurrentModel] = createSignal<string | null>(null);
  const [providerSupported, setProviderSupported] = createSignal(true);
  const [fetchError, setFetchError] = createSignal<string | null>(null);
  const [isBalanceOnly, setIsBalanceOnly] = createSignal(false);
  let currentRequestId = 0;

  const doRefresh = () => {
    const providerID = currentProvider();
    if (!providerID) return;
    lastRefreshTime = Date.now();
    const requestId = ++currentRequestId;
    setLoading(true);
    setFetchError(null);
    setIsBalanceOnly(false);
    const supported = props.quotaService.setActiveProvider(providerID);
    setProviderSupported(supported);
    if (!supported) { setResult(null); setLoading(false); return; }
    if (props.quotaService.supportsBalance()) { setIsBalanceOnly(true); setResult(null); setLoading(false); return; }
    props.quotaService.fetchQuota().then((data) => {
      if (requestId !== currentRequestId) return;
      if (data && data.quota) { setResult(data); setFetchError(null); }
      else { setResult(null); setFetchError("No quota data"); }
      setLoading(false);
    }).catch((error) => {
      if (requestId !== currentRequestId) return;
      console.error("[PlanView] Fetch failed:", error);
      setFetchError(String(error)); setResult(null); setLoading(false);
    });
  };

  createEffect(() => {
    const messages = props.api.state.session.messages(props.sessionId);
    if (!messages || messages.length === 0) { setCurrentProvider(null); setCurrentModel(null); setFetchError(null); setProviderSupported(false); return; }
    const lastMsg = findLastAssistantMessage(messages);
    if (!lastMsg) { setCurrentProvider(null); setCurrentModel(null); setFetchError(null); setProviderSupported(false); return; }
    if (lastMsg.providerID !== currentProvider() || lastMsg.modelID !== currentModel()) {
      setCurrentProvider(lastMsg.providerID); setCurrentModel(lastMsg.modelID);
    }
  });

  createEffect(() => {
    const providerID = currentProvider();
    if (!providerID) { setResult(null); setLoading(false); setFetchError(null); setProviderSupported(false); return; }
    if (Date.now() - lastRefreshTime < REFRESH_INTERVAL * 1000) return;
    doRefresh();
  });

  createEffect(() => {
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastRefreshTime) / 1000);
      if (elapsed >= REFRESH_INTERVAL) doRefresh();
    }, 1000);
    onCleanup(() => clearInterval(id));
  });

  return (
    <Show when={!isBalanceOnly()}>
      <Show when={loading() && !result()}><text fg="#888">Loading...</text></Show>
      <Show when={!loading() && result()?.quota} keyed>
        {(quota: QuotaData) => (
          <>
            <Show when={quota.rolling} keyed>
              {(r: QuotaUsage) => (
                <box flexDirection="row" gap={0}>
                  <text fg="#aaa">Rll </text>
                  <text fg="#e0e0e0">{r.usage}% </text>
                  <ProgressBar value={r.usage} color={barColor(r.usage)} />
                  <text fg="#888"> {r.reset}</text>
                </box>
              )}
            </Show>
            <Show when={quota.weekly} keyed>
              {(w: QuotaUsage) => (
                <box flexDirection="row" gap={0}>
                  <text fg="#aaa">Wkly </text>
                  <text fg="#e0e0e0">{w.usage}% </text>
                  <ProgressBar value={w.usage} color={barColor(w.usage)} />
                  <text fg="#888"> {w.reset}</text>
                </box>
              )}
            </Show>
            <box flexDirection="row" gap={0}>
              <text fg="#aaa">Mth </text>
              {quota.monthly ? (
                <><text fg="#e0e0e0">{quota.monthly.usage}% </text><ProgressBar value={quota.monthly.usage} color={barColor(quota.monthly.usage)} /><text fg="#888"> {quota.monthly.reset}</text></>
              ) : (
                <><text fg="#e0e0e0">0% </text><ProgressBar value={0} color="#6bcf7f" /><text fg="#888"> ∞</text></>
              )}
            </box>
          </>
        )}
      </Show>
      <Show when={!loading() && (!result() || !result()?.quota)}>
        <text fg="#888">No plan data</text>
      </Show>
    </Show>
  );
}
```

- [ ] **Step 2: Remove old usage.tsx**

Run: `rm src/usage.tsx`

- [ ] **Step 3: Lint check**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/plan-view.tsx
git rm src/usage.tsx
git commit -m "feat: create PlanView with Rll/Wkly/Mth and color-coded bars"
```

---

### Task 5: Rewrite SessionInfoView

**Files:**
- Modify: `src/session-info.tsx`

Remove Provider/Model. New flat layout: `ID: xxx  Messages: N`, `TODOs: N  Changes: N`, `Branch: xxx`, `Context: N/N ████ %`.

- [ ] **Step 1: Rewrite src/session-info.tsx**

```typescript
/** @jsxImportSource @opentui/solid */
import type { TuiPluginApi } from "@opencode-ai/plugin/tui";
import type { JSX } from "solid-js";
import { createSignal, createEffect, Show } from "solid-js";
import { ProgressBar } from "./components.jsx";
import { formatNumber, formatPercent } from "./formatters.js";
import { cachedSignal, findLastAssistantMessage } from "./utils.js";

interface SessionData {
  sessionId: string;
  branch: string | undefined;
  messageCount: number;
  todoCount: number;
  diffCount: number;
}

interface ContextInfo {
  tokens: number;
  limit: number;
  percent: number;
}

export function SessionInfoView(props: {
  api: TuiPluginApi;
  sessionId: string;
}): JSX.Element {
  const [data, setData] = cachedSignal<SessionData | null>("session.data", null);
  const [contextInfo, setContextInfo] = cachedSignal<ContextInfo | null>("session.context", null);

  createEffect(() => {
    const messages = props.api.state.session.messages(props.sessionId);
    const todos = props.api.state.session.todo(props.sessionId);
    const diff = props.api.state.session.diff(props.sessionId);
    const vcs = props.api.state.vcs;
    setData({
      sessionId: props.sessionId,
      branch: vcs?.branch,
      messageCount: messages.length,
      todoCount: todos.length,
      diffCount: diff.length,
    });
  });

  createEffect(() => {
    const messages = props.api.state.session.messages(props.sessionId);
    if (!messages || messages.length === 0) { setContextInfo(null); return; }
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role !== "assistant" || !msg.tokens) continue;
      const tokens = msg.tokens.input + msg.tokens.output + msg.tokens.reasoning + msg.tokens.cache.read + msg.tokens.cache.write;
      if (tokens <= 0) continue;
      const provider = props.api.state.provider.find((p) => p.id === msg.providerID);
      if (!provider) continue;
      const model = provider.models[msg.modelID];
      const limit = model?.limit?.context ?? 0;
      if (limit === 0) continue;
      setContextInfo({ tokens, limit, percent: Math.min(100, (tokens / limit) * 100) });
      return;
    }
    setContextInfo(null);
  });

  return (
    <Show when={data()} fallback={<text fg="#888">Loading...</text>}>
      {() => {
        const d = data()!;
        return (
          <>
            <box flexDirection="row" gap={0}>
              <text fg="#888">ID: </text><text fg="#e0e0e0">{d.sessionId.slice(0, 8)}</text>
              <text fg="#aaa">  Messages: </text><text fg="#e0e0e0">{d.messageCount}</text>
            </box>
            <box flexDirection="row" gap={0}>
              <text fg="#888">TODOs: </text><text fg="#e0e0e0">{d.todoCount}</text>
              <text fg="#aaa">  Changes: </text><text fg="#e0e0e0">{d.diffCount}</text>
            </box>
            <box flexDirection="row" gap={0}>
              <text fg="#888">Branch: </text><text fg="#e0e0e0">{d.branch ?? "N/A"}</text>
            </box>
            <Show when={contextInfo()} keyed>
              {(ctx: ContextInfo) => (
                <box flexDirection="row" gap={0}>
                  <text fg="#888">Context: </text>
                  <text fg="#e0e0e0">{formatNumber(ctx.tokens)}/{formatNumber(ctx.limit)} </text>
                  <ProgressBar value={ctx.percent} color="#a29bfe" />
                  <text fg="#aaa"> {formatPercent(ctx.percent)}</text>
                </box>
              )}
            </Show>
          </>
        );
      }}
    </Show>
  );
}
```

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/session-info.tsx
git commit -m "refactor: rewrite SessionInfoView flat layout, drop Provider/Model"
```

---

### Task 6: Rewrite TokensUsageView

**Files:**
- Modify: `src/tokens-usage.tsx`

Use I/O/R abbreviations, compact per-model with tree lines.

- [ ] **Step 1: Rewrite src/tokens-usage.tsx**

```typescript
/** @jsxImportSource @opentui/solid */
import type { JSX } from "solid-js";
import { createSignal, createEffect, Show, For } from "solid-js";
import { formatNumber, formatCost } from "./formatters.js";
import { cachedSignal } from "./utils.js";
import type { TuiPluginApi } from "@opencode-ai/plugin/tui";
import type { AssistantMessage } from "@opencode-ai/sdk/v2";

interface TokenStats {
  providerID: string;
  modelID: string;
  totalCost: number;
  input: number;
  output: number;
  reasoning: number;
  cacheRead: number;
  cacheWrite: number;
  messageCount: number;
}

export interface TokensUsageViewProps {
  api: TuiPluginApi;
  sessionId: string;
}

export function TokensUsageView(props: TokensUsageViewProps): JSX.Element {
  const [stats, setStats] = cachedSignal<TokenStats[]>("tokens.stats", []);
  const [totals, setTotals] = cachedSignal<{
    input: number; output: number; reasoning: number;
    cacheRead: number; cacheWrite: number; cost: number;
  } | null>("tokens.totals", null);
  const [isLoading, setIsLoading] = cachedSignal<boolean>("tokens.loading", true);

  createEffect(() => {
    const messages = props.api.state.session.messages(props.sessionId);
    if (!messages || messages.length === 0) { setStats([]); setTotals(null); setIsLoading(false); return; }

    const grouped = new Map<string, TokenStats>();
    messages.forEach((msg) => {
      if (msg.role !== "assistant") return;
      const m = msg as AssistantMessage;
      if (!m.tokens) return;
      const key = `${m.providerID || "unknown"}::${m.modelID || "unknown"}`;
      if (!grouped.has(key)) {
        grouped.set(key, { providerID: m.providerID || "unknown", modelID: m.modelID || "unknown", totalCost: 0, input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, messageCount: 0 });
      }
      const s = grouped.get(key)!;
      s.totalCost += m.cost || 0;
      s.input += m.tokens.input || 0;
      s.output += m.tokens.output || 0;
      s.reasoning += m.tokens.reasoning || 0;
      s.cacheRead += m.tokens.cache?.read || 0;
      s.cacheWrite += m.tokens.cache?.write || 0;
      s.messageCount += 1;
    });

    let ti = 0, to = 0, tr = 0, tcr = 0, tcw = 0, tcost = 0;
    grouped.forEach((s) => { ti += s.input; to += s.output; tr += s.reasoning; tcr += s.cacheRead; tcw += s.cacheWrite; tcost += s.totalCost; });
    setStats(Array.from(grouped.values()));
    setTotals({ input: ti, output: to, reasoning: tr, cacheRead: tcr, cacheWrite: tcw, cost: tcost });
    setIsLoading(false);
  });

  return (
    <box flexDirection="column" gap={0}>
      <Show when={isLoading()}><text fg="#888">...</text></Show>
      <Show when={!isLoading() && stats().length === 0}><text fg="#888">-</text></Show>
      <Show when={!isLoading() && stats().length > 0 && totals()}>
        {() => {
          const t = totals()!;
          return (
            <>
              <box flexDirection="row" gap={0}>
                <text fg="#6bcf7f">I: </text><text>{formatNumber(t.input)}</text>
                <text fg="#aaa">  </text>
                <text fg="#fd79a8">O: </text><text>{formatNumber(t.output)}</text>
                <text fg="#aaa">  </text>
                <text fg="#fdcb6e">R: </text><text>{formatNumber(t.reasoning)}</text>
              </box>
              <box flexDirection="row" gap={0}>
                <text fg="#00cec9">Cache: </text><text>R:{formatNumber(t.cacheRead)} W:{formatNumber(t.cacheWrite)}</text>
                <text fg="#aaa">  </text>
                <text fg="#ffd93d">Cost: </text><text>{formatCost(t.cost)}</text>
              </box>
            </>
          );
        }}
      </Show>
      <Show when={!isLoading() && stats().length > 0}>
        <For each={stats()}>
          {(stat, index) => {
            const items = [
              { label: "I", value: formatNumber(stat.input), color: "#6bcf7f" },
              { label: "O", value: formatNumber(stat.output), color: "#fd79a8" },
              { label: "R", value: formatNumber(stat.reasoning), color: "#fdcb6e" },
              { label: "Cache", value: formatNumber(stat.cacheRead + stat.cacheWrite), color: "#00cec9" },
              { label: "Cost", value: `${formatCost(stat.totalCost)} (${stat.messageCount} msg)`, color: "#ffd93d" },
            ];
            return (
              <box flexDirection="column" gap={0}>
                <text fg="#74b9ff">{stat.modelID || "unknown"}:</text>
                <For each={items}>
                  {(item, iIdx) => (
                    <box flexDirection="row" gap={0}>
                      <text fg="#555">  {iIdx() === items.length - 1 ? "└─" : "├─"} </text>
                      <text fg={item.color}>{item.label}: </text><text>{item.value}</text>
                    </box>
                  )}
                </For>
              </box>
            );
          }}
        </For>
      </Show>
    </box>
  );
}
```

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/tokens-usage.tsx
git commit -m "refactor: rewrite TokensUsageView with I/O/R/Cache abbreviations"
```

---

### Task 7: Restructure tui.tsx — root layout

**Files:**
- Modify: `src/tui.tsx`

Remove Collapsible wrappers, QuotaSection helper. Add HeaderView + PlanView. Flat layout with separators.

- [ ] **Step 1: Rewrite src/tui.tsx**

```typescript
/** @jsxImportSource @opentui/solid */
import { Show, createSignal, createEffect } from "solid-js";
import type { JSX } from "solid-js";
import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui";
import { HeaderView } from "./header-view.jsx";
import { BalanceView } from "./balance-view.jsx";
import { PlanView } from "./plan-view.jsx";
import { SessionInfoView } from "./session-info.jsx";
import { TokensUsageView } from "./tokens-usage.jsx";
import { QuotaService } from "./quota/service.js";
import { findLastAssistantMessage } from "./utils.js";

const id = "opencode-tui-usage-plugin";

const tui: TuiPlugin = async (api) => {
  const quotaService = new QuotaService();

  api.slots.register({
    order: 150,
    slots: {
      sidebar_content(_ctx: unknown, _props: { session_id: string }) {
        return (
          <box gap={0}>
            <HeaderView api={api} sessionId={_props.session_id} />
            <text fg="#333">═══════════════════════════════════════</text>
            <BalanceSection
              quotaService={quotaService}
              api={api}
              sessionId={_props.session_id}
            />
            <PlanSection
              quotaService={quotaService}
              api={api}
              sessionId={_props.session_id}
            />
            <text fg="#333">─────────────────────────────────────</text>
            <SessionInfoView api={api} sessionId={_props.session_id} />
            <text fg="#333">─────────────────────────────────────</text>
            <TokensUsageView api={api} sessionId={_props.session_id} />
          </box>
        );
      },
    },
  });
};

/**
 * Balance 区域 — 仅按量计费 provider 显示
 */
function BalanceSection(props: {
  quotaService: QuotaService;
  api: Parameters<typeof BalanceView>[0]["api"];
  sessionId: string;
}): JSX.Element {
  const [show, setShow] = createSignal(false);

  createEffect(() => {
    const messages = props.api.state.session.messages(props.sessionId);
    const lastMsg = findLastAssistantMessage(messages);
    if (lastMsg) {
      props.quotaService.setActiveProvider(lastMsg.providerID);
      setShow(props.quotaService.supportsBalance());
    } else {
      setShow(false);
    }
  });

  return (
    <Show when={show()}>
      <BalanceView
        quotaService={props.quotaService}
        api={props.api}
        sessionId={props.sessionId}
      />
    </Show>
  );
}

/**
 * Plan 区域 — 仅 plan 型 provider 显示
 */
function PlanSection(props: {
  quotaService: QuotaService;
  api: Parameters<typeof PlanView>[0]["api"];
  sessionId: string;
}): JSX.Element {
  const [show, setShow] = createSignal(false);

  createEffect(() => {
    const messages = props.api.state.session.messages(props.sessionId);
    const lastMsg = findLastAssistantMessage(messages);
    if (lastMsg) {
      props.quotaService.setActiveProvider(lastMsg.providerID);
      setShow(!props.quotaService.supportsBalance());
    } else {
      setShow(false);
    }
  });

  return (
    <Show when={show()}>
      <PlanView
        quotaService={props.quotaService}
        api={props.api}
        sessionId={props.sessionId}
      />
    </Show>
  );
}

const plugin: TuiPluginModule & { id: string } = { id, tui };
export default plugin;
```

- [ ] **Step 2: Lint check**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/tui.tsx
git commit -m "refactor: restructure sidebar layout - flat, no Collapsible"
```

---

### Verification

- [ ] **Final build check**

Run: `npm run build`
Expected: Build succeeds with no errors.
