/** @jsxImportSource @opentui/solid */
import type { JSX } from "solid-js";
import { createSignal, createEffect, Show, For } from "solid-js";
import { Title } from "./components.jsx";
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

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

function formatCost(cost: number): string {
  if (cost === 0) return "$0";
  const formatted = cost.toFixed(6).replace(/\.?0+$/, "");
  return "$" + formatted;
}

function InlineMetric(props: { label: string; value: string; color: string }) {
  return (
    <box flexDirection="row" gap={0}>
      <text fg={props.color}>{props.label}</text>
      <text fg="#888">:</text>
      <text>{props.value}</text>
    </box>
  );
}

export interface TokensUsageViewProps {
  api: TuiPluginApi;
  sessionId: string;
}

export function TokensUsageView(props: TokensUsageViewProps): JSX.Element {
  const [stats, setStats] = createSignal<TokenStats[]>([]);
  const [totals, setTotals] = createSignal<{
    input: number;
    output: number;
    reasoning: number;
    cacheRead: number;
    cacheWrite: number;
    cost: number;
    currentInput: number;
  } | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);

  createEffect(() => {
    const sessionId = props.sessionId;
    const messages = props.api.state.session.messages(sessionId);

    if (!messages || messages.length === 0) {
      setStats([]);
      setTotals(null);
      setIsLoading(false);
      return;
    }

    const grouped = new Map<string, TokenStats>();
    let lastInput = 0;

    messages.forEach((msg) => {
      if (msg.role !== "assistant") return;

      const assistantMsg = msg as AssistantMessage;
      if (!assistantMsg.tokens) return;

      const key = `${assistantMsg.providerID || "unknown"}::${assistantMsg.modelID || "unknown"}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          providerID: assistantMsg.providerID || "unknown",
          modelID: assistantMsg.modelID || "unknown",
          totalCost: 0,
          input: 0,
          output: 0,
          reasoning: 0,
          cacheRead: 0,
          cacheWrite: 0,
          messageCount: 0,
        });
      }

      const stat = grouped.get(key)!;
      stat.totalCost += assistantMsg.cost || 0;
      stat.input += assistantMsg.tokens.input || 0;
      stat.output += assistantMsg.tokens.output || 0;
      stat.reasoning += assistantMsg.tokens.reasoning || 0;
      stat.cacheRead += assistantMsg.tokens.cache?.read || 0;
      stat.cacheWrite += assistantMsg.tokens.cache?.write || 0;
      stat.messageCount += 1;
      lastInput = assistantMsg.tokens.input || 0;
    });

    let totalInput = 0,
      totalOutput = 0,
      totalReasoning = 0;
    let totalCacheRead = 0,
      totalCacheWrite = 0,
      totalCost = 0;

    grouped.forEach((stat) => {
      totalInput += stat.input;
      totalOutput += stat.output;
      totalReasoning += stat.reasoning;
      totalCacheRead += stat.cacheRead;
      totalCacheWrite += stat.cacheWrite;
      totalCost += stat.totalCost;
    });

    setStats(Array.from(grouped.values()));
    setTotals({
      input: totalInput,
      output: totalOutput,
      reasoning: totalReasoning,
      cacheRead: totalCacheRead,
      cacheWrite: totalCacheWrite,
      cost: totalCost,
      currentInput: lastInput,
    });
    setIsLoading(false);
  });

  return (
    <box flexDirection="column" gap={0}>
      <Title text="Usage Tokens" color="#a29bfe" />

      <Show when={isLoading()}>
        <text fg="#888">...</text>
      </Show>

      <Show when={!isLoading() && stats().length === 0}>
        <text fg="#888">-</text>
      </Show>

      <Show when={!isLoading() && stats().length > 0}>
        <box flexDirection="column" gap={0}>
          <box flexDirection="row" gap={2}>
            <InlineMetric label="In" value={formatNumber(totals()?.input ?? 0)} color="#6bcf7f" />
            <InlineMetric label="Out" value={formatNumber(totals()?.output ?? 0)} color="#fd79a8" />
            <InlineMetric label="Rea" value={formatNumber(totals()?.reasoning ?? 0)} color="#fdcb6e" />
          </box>
          <box flexDirection="row" gap={2}>
            <InlineMetric label="Cache" value={`R:${formatNumber(totals()?.cacheRead ?? 0)} W:${formatNumber(totals()?.cacheWrite ?? 0)}`} color="#00cec9" />
          </box>
          <box flexDirection="row" gap={2}>
            <InlineMetric label="Cost" value={formatCost(totals()?.cost ?? 0)} color="#ffd93d" />
          </box>
        </box>
      </Show>

      <Show when={!isLoading() && stats().length > 0}>
        <For each={stats()}>
          {(stat) => (
            <box flexDirection="column" gap={0}>
              <box flexDirection="row" gap={1}>
                <text fg="#74b9ff">{stat.modelID || "unknown"}</text>
                <text fg="#ffd93d">· {formatCost(stat.totalCost)}</text>
              </box>
              <text fg="#888">
                I:{formatNumber(stat.input)} O:{formatNumber(stat.output)} R:{formatNumber(stat.reasoning)} C:{formatNumber(stat.cacheRead + stat.cacheWrite)}({stat.messageCount})
              </text>
            </box>
          )}
        </For>
      </Show>
    </box>
  );
}
