/** @jsxImportSource @opentui/solid */
import type { JSX } from "solid-js";
import { createSignal, createEffect, onCleanup, For } from "solid-js";
import { Title, ProgressBar } from "./components.jsx";
import { formatDuration } from "./formatters.js";
import type { TuiPluginApi } from "@opencode-ai/plugin/tui";
import type { QuotaResult } from "./quota/types.js";

const REFRESH_INTERVAL = 60;

export interface UsageViewProps {
  quotaService: {
    fetchQuota(): Promise<QuotaResult | null>;
    setActiveProvider(providerName: string): boolean;
    isProviderSupported(providerName: string): boolean;
    getRegisteredProviderNames(): string[];
    getConfiguredProviderNames(): string[];
  };
  api: TuiPluginApi;
  sessionId: string;
}

interface EmptyStateProps {
  provider: string | null;
  supported: boolean;
  error: string | null;
  registeredProviders: string[];
  configuredProviders: string[];
}

function EmptyState(props: EmptyStateProps): JSX.Element {
  if (!props.provider) {
    return <text fg="#888">No LLM activity detected</text>;
  }

  if (!props.supported) {
    return (
      <box flexDirection="column" gap={0}>
        <text fg="#ff6b6b">not support provider: {props.provider}</text>
        <text fg="#74b9ff">github.com/Yinxe/opencode-tui-usage</text>
      </box>
    );
  }

  if (props.error) {
    return (
      <box flexDirection="column" gap={0}>
        <text fg="#ff6666">Error fetching quota</text>
        <text fg="#888">{props.error}</text>
      </box>
    );
  }

  return <text fg="#888">No quota data available</text>;
}

export function UsageView(props: UsageViewProps): JSX.Element {
  const [result, setResult] = createSignal<QuotaResult | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [currentProvider, setCurrentProvider] = createSignal<string | null>(null);
  const [currentModel, setCurrentModel] = createSignal<string | null>(null);
  const [refreshCountdown, setRefreshCountdown] = createSignal(REFRESH_INTERVAL);
  const [providerSupported, setProviderSupported] = createSignal(true);
  const [fetchError, setFetchError] = createSignal<string | null>(null);

  // Track current request to handle race conditions
  let currentRequestId = 0;

  // Single effect that handles provider detection and quota fetching
  createEffect(() => {
    const sessionId = props.sessionId;
    const messages = props.api.state.session.messages(sessionId);
    const requestId = ++currentRequestId;

    // Reset state when no messages
    if (!messages || messages.length === 0) {
      setCurrentProvider(null);
      setCurrentModel(null);
      setFetchError(null);
      setProviderSupported(false);
      setResult(null);
      setLoading(false);
      return;
    }

    // Find last assistant message (iterate backwards to avoid array copy)
    let lastAssistantMsg = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        lastAssistantMsg = messages[i];
        break;
      }
    }

    if (!lastAssistantMsg) {
      setCurrentProvider(null);
      setCurrentModel(null);
      setFetchError(null);
      setProviderSupported(false);
      setResult(null);
      setLoading(false);
      return;
    }

    // Check for providerID with proper type guard
    if (!("providerID" in lastAssistantMsg) || typeof lastAssistantMsg.providerID !== "string") {
      setCurrentProvider(null);
      setCurrentModel(null);
      setFetchError(null);
      setProviderSupported(false);
      setResult(null);
      setLoading(false);
      return;
    }

    const providerID = lastAssistantMsg.providerID as string;
    const modelID = "modelID" in lastAssistantMsg && typeof lastAssistantMsg.modelID === "string"
      ? lastAssistantMsg.modelID
      : "";

    setCurrentProvider(providerID);
    setCurrentModel(modelID);

    // Fetch quota
    setLoading(true);
    setFetchError(null);
    const supported = props.quotaService.setActiveProvider(providerID);
    setProviderSupported(supported);

    if (!supported) {
      setResult(null);
      setLoading(false);
      return;
    }

    props.quotaService.fetchQuota()
      .then((data) => {
        // Ignore stale responses
        if (requestId !== currentRequestId) return;
        if (data && data.quota) {
          setResult(data);
        } else {
          setResult(null);
        }
        setLoading(false);
      })
      .catch((error) => {
        if (requestId !== currentRequestId) return;
        console.error("[UsageView] Failed to fetch quota:", error);
        setFetchError(String(error));
        setResult(null);
        setLoading(false);
      });
  });

  // Interval for countdown display
  createEffect(() => {
    setRefreshCountdown(REFRESH_INTERVAL);
    const id = setInterval(() => {
      setRefreshCountdown((r) => (r <= 1 ? REFRESH_INTERVAL : r - 1));
    }, 1000);

    onCleanup(() => clearInterval(id));
  });

  return (
    <box flexDirection="column" gap={0}>
      <Title text="Usage Quota" color="#6bcf7f" />
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
        <EmptyState
          provider={currentProvider()}
          supported={providerSupported()}
          error={fetchError()}
          registeredProviders={props.quotaService.getRegisteredProviderNames()}
          configuredProviders={props.quotaService.getConfiguredProviderNames()}
        />
      )}
    </box>
  );
}