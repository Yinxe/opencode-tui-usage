/** @jsxImportSource @opentui/solid */
import type { JSX } from "solid-js";
import { createSignal, createEffect } from "solid-js";
import { Show } from "solid-js";
import { ProgressBar } from "./components.jsx";
import { formatNumber, formatPercent } from "./formatters.js";
import type { TuiPluginApi } from "@opencode-ai/plugin/tui";

export interface ContextUsageViewProps {
  api: TuiPluginApi;
  sessionId: string;
}

export function ContextUsageView(props: ContextUsageViewProps): JSX.Element {
  const [contextData, setContextData] = createSignal<{
    tokens: number;
    limit: number;
    percent: number;
  } | null>(null);

  createEffect(() => {
    const sessionId = props.sessionId;
    const messages = props.api.state.session.messages(sessionId);

    if (!messages || messages.length === 0) {
      setContextData(null);
      return;
    }

    let latestTokens = 0;
    let latestTime = -Infinity;
    let limit = 0;

    for (const msg of messages) {
      if (msg.role !== "assistant" || !msg.tokens) continue;

      const tokens =
        msg.tokens.input +
        msg.tokens.output +
        msg.tokens.reasoning +
        msg.tokens.cache.read +
        msg.tokens.cache.write;

      if (tokens <= 0) continue;

      const time = msg.time.completed ?? msg.time.created;
      if (time > latestTime) {
        latestTime = time;
        latestTokens = tokens;

        const provider = props.api.state.provider.find((p) => p.id === msg.providerID);
        const model = provider?.models[msg.modelID];
        limit = model?.limit?.context ?? 0;
      }
    }

    if (latestTokens === 0 || limit === 0) {
      setContextData(null);
      return;
    }

    const percent = Math.min(100, (latestTokens / limit) * 100);
    setContextData({ tokens: latestTokens, limit, percent });
  });

  return (
    <Show when={contextData()} fallback={<></>}>
      <box flexDirection="column" gap={0}>
        <box flexDirection="row" gap={2}>
          <text fg="#a29bfe">Context:</text>
          <text>
            {formatNumber(contextData()!.tokens)} / {formatNumber(contextData()!.limit)} ({formatPercent(contextData()!.percent)})
          </text>
        </box>
        <ProgressBar value={contextData()!.percent} color="#a29bfe" width={20} />
      </box>
    </Show>
  );
}
