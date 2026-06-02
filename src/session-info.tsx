/** @jsxImportSource @opentui/solid */
import type { TuiPluginApi } from "@opencode-ai/plugin/tui";
import type { JSX } from "solid-js";
import { createSignal, createEffect, Show } from "solid-js";
import { ProgressBar } from "./components.jsx";
import { formatNumber } from "./formatters.js";
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
                </box>
              )}
            </Show>
          </>
        );
      }}
    </Show>
  );
}
