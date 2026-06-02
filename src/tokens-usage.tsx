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
          {(stat) => {
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
