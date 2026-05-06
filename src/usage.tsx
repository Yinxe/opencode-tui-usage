/** @jsxImportSource @opentui/solid */
import type { JSX } from "solid-js";
import { createSignal, createEffect, onCleanup } from "solid-js";
import { Title, ProgressBar } from "./components.jsx";
import type { TuiPluginApi } from "@opencode-ai/plugin/tui";
import type { QuotaResult } from "./quota/types.js";

const REFRESH_INTERVAL = 10;

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  if (totalSeconds < 3600) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

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
  const [refreshCountdown, setRefreshCountdown] = createSignal(REFRESH_INTERVAL);

  const doRefresh = () => {
    const providerID = currentProvider();
    if (!providerID) return;
    setLoading(true);
    props.quotaService.setActiveProvider(providerID);
    props.quotaService.fetchQuota().then((data) => {
      if (data && data.quota) {
        setResult(data);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  };

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

  createEffect(() => {
    setRefreshCountdown(REFRESH_INTERVAL);
    const id = setInterval(() => {
      setRefreshCountdown((r) => {
        if (r <= 1) {
          doRefresh();
          return REFRESH_INTERVAL;
        }
        return r - 1;
      });
    }, 1000);

    onCleanup(() => clearInterval(id));
  });

  return (
    <box flexDirection="column" gap={0}>
      <Title text="Usage" color="#6bcf7f" />
      <text fg="#888">Provider: {currentProvider() ?? "Unknown"}</text>
      {loading() ? (
        <>
          <box flexDirection="column" gap={0}>
            <box flexDirection="row" gap={1}>
              <text fg="#6bcf7f">Rolling:</text>
              <text fg="#888">Loading...</text>
            </box>
            <ProgressBar value={0} color="#6bcf7f" />
          </box>
          <box flexDirection="column" gap={0}>
            <box flexDirection="row" gap={1}>
              <text fg="#ffd93d">Weekly:</text>
              <text fg="#888">Loading...</text>
            </box>
            <ProgressBar value={0} color="#ffd93d" />
          </box>
          <box flexDirection="column" gap={0}>
            <box flexDirection="row" gap={1}>
              <text fg="#4da6ff">Monthly:</text>
              <text fg="#888">Loading...</text>
            </box>
            <ProgressBar value={0} color="#4da6ff" />
          </box>
        </>
      ) : result() && result()!.quota ? (
        <>
          {result()!.quota.rolling ? (
            <box flexDirection="column" gap={0}>
              <box flexDirection="row" gap={1}>
                <text fg="#6bcf7f">Rolling:</text>
                <text>{result()!.quota.rolling!.usage}%</text>
                <text fg="#888">reset {result()!.quota.rolling!.reset}</text>
              </box>
              <ProgressBar
                value={result()!.quota.rolling!.usage}
                color="#6bcf7f"
              />
            </box>
          ) : (
            <text fg="#888">Rolling: N/A</text>
          )}
          {result()!.quota.weekly ? (
            <box flexDirection="column" gap={0}>
              <box flexDirection="row" gap={1}>
                <text fg="#ffd93d">Weekly:</text>
                <text>{result()!.quota.weekly!.usage}%</text>
                <text fg="#888">reset {result()!.quota.weekly!.reset}</text>
              </box>
              <ProgressBar
                value={result()!.quota.weekly!.usage}
                color="#ffd93d"
              />
            </box>
          ) : (
            <text fg="#888">Weekly: N/A</text>
          )}
          <box flexDirection="column" gap={0}>
            <box flexDirection="row" gap={1}>
              <text fg="#4da6ff">Monthly:</text>
              {result()!.quota.monthly ? (
                <>
                  <text>{result()!.quota.monthly!.usage}%</text>
                  <text fg="#888">reset {result()!.quota.monthly!.reset}</text>
                </>
              ) : (
                <>
                  <text fg="#888">0%</text>
                  <text fg="#888">reset ∞</text>
                </>
              )}
            </box>
            <ProgressBar
              value={result()!.quota.monthly?.usage ?? 0}
              color="#4da6ff"
            />
          </box>
          <text fg="#888">{formatDuration(refreshCountdown())} Refresh #{result()!.refreshCount}</text>
        </>
      ) : (
        <text>No data</text>
      )}
    </box>
  );
}