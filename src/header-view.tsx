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
