/** @jsxImportSource @opentui/solid */
import type { JSX } from "solid-js";
import { createSignal, createEffect } from "solid-js";
import { Title, ProgressBar } from "./components.jsx";
import type { TuiPluginApi } from "@opencode-ai/plugin/tui";
import type { QuotaResult } from "./quota/types.js";

export interface UsageViewProps {
  quotaService: {
    fetchQuota(): Promise<QuotaResult | null>;
    setActiveProvider(providerName: string): boolean;
  };
  api: TuiPluginApi;
  sessionId: string;
}

export function UsageView(props: UsageViewProps): JSX.Element {
  const [result, setResult] = createSignal<QuotaResult | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [currentProvider, setCurrentProvider] = createSignal<string | null>(null);
  const [currentModel, setCurrentModel] = createSignal<string | null>(null);

  createEffect(() => {
    const sessionId = props.sessionId;
    const messages = props.api.state.session.messages(sessionId);

    if (!messages || messages.length === 0) {
      setCurrentProvider(null);
      setCurrentModel(null);
      return;
    }

    const lastAssistantMsg = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");

    if (!lastAssistantMsg) {
      setCurrentProvider(null);
      setCurrentModel(null);
      return;
    }

    if (!("providerID" in lastAssistantMsg)) {
      setCurrentProvider(null);
      setCurrentModel(null);
      return;
    }

    const providerID = lastAssistantMsg.providerID as string;
    const modelID = "modelID" in lastAssistantMsg
      ? (lastAssistantMsg.modelID as string)
      : "";

    setCurrentProvider(providerID);
    setCurrentModel(modelID);
  });

  createEffect(() => {
    const providerID = currentProvider();
    const modelID = currentModel();

    if (!providerID) {
      setResult(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    props.quotaService.setActiveProvider(providerID);

    props.quotaService.fetchQuota().then((data) => {
      if (data && data.quota) {
        setResult(data);
      } else {
        setResult(null);
      }
      setLoading(false);
    }).catch((error) => {
      console.error("[UsageView] Failed to fetch quota:", error);
      setResult(null);
      setLoading(false);
    });
  });

  return (
    <box gap={0}>
      <Title text="Usage" color="#6bcf7f" />
      {loading() ? (
        <text>Loading...</text>
      ) : result() && result()!.quota ? (
        <>
          <text fg="#888">Provider: {result()!.provider}</text>
          {result()!.quota.rolling ? (
            <>
              <box flexDirection="row" gap={1}>
                <text>Rolling:</text>
                <text>{result()!.quota.rolling!.usage}%</text>
                <text fg="#888">reset {result()!.quota.rolling!.reset}</text>
              </box>
              <ProgressBar
                value={result()!.quota.rolling!.usage}
                color="#6bcf7f"
              />
            </>
          ) : (
            <text fg="#888">Rolling: N/A</text>
          )}
          {result()!.quota.weekly ? (
            <>
              <box flexDirection="row" gap={1}>
                <text>Weekly:</text>
                <text>{result()!.quota.weekly!.usage}%</text>
                <text fg="#888">reset {result()!.quota.weekly!.reset}</text>
              </box>
              <ProgressBar
                value={result()!.quota.weekly!.usage}
                color="#6bcf7f"
              />
            </>
          ) : (
            <text fg="#888">Weekly: N/A</text>
          )}
          {result()!.quota.monthly ? (
            <>
              <box flexDirection="row" gap={1}>
                <text>Monthly:</text>
                <text>{result()!.quota.monthly!.usage}%</text>
                <text fg="#888">reset {result()!.quota.monthly!.reset}</text>
              </box>
              <ProgressBar
                value={result()!.quota.monthly!.usage}
                color="#6bcf7f"
              />
            </>
          ) : null}
          <text fg="#666">Refresh #{result()!.refreshCount}</text>
        </>
      ) : (
        <text>No data</text>
      )}
    </box>
  );
}