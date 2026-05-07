/** @jsxImportSource @opentui/solid */
import type { JSX } from "solid-js";
import { createSignal, createEffect, onCleanup } from "solid-js";
import { Title, ProgressBar } from "./components.jsx";
import { formatDuration } from "./formatters.js";
import type { TuiPluginApi } from "@opencode-ai/plugin/tui";
import type { QuotaResult } from "./quota/types.js";
import { findLastAssistantMessage } from "./utils.js";

/** 额度刷新间隔（秒） */
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

/** 空状态显示的属性 */
interface EmptyStateProps {
  provider: string | null;
  supported: boolean;
  error: string | null;
  registeredProviders: string[];
  configuredProviders: string[];
}

/**
 * 空状态组件
 * 根据不同情况显示对应的提示信息
 */
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

/**
 * Usage Quota 视图组件
 * 显示 Rolling/Weekly/Monthly 三种维度的额度使用情况
 */
export function UsageView(props: UsageViewProps): JSX.Element {
  const [result, setResult] = createSignal<QuotaResult | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [currentProvider, setCurrentProvider] = createSignal<string | null>(null);
  const [currentModel, setCurrentModel] = createSignal<string | null>(null);
  const [refreshCountdown, setRefreshCountdown] = createSignal(REFRESH_INTERVAL);
  const [providerSupported, setProviderSupported] = createSignal(true);
  const [fetchError, setFetchError] = createSignal<string | null>(null);

  // 请求 ID 计数器，用于处理竞态条件
  let currentRequestId = 0;

  // 从 v1.0.0 恢复的刷新逻辑：只在 provider/model 组合变化时刷新
  const doRefresh = () => {
    const providerID = currentProvider();
    if (!providerID) return;

    const requestId = ++currentRequestId;

    setLoading(true);
    setFetchError(null);
    const supported = props.quotaService.setActiveProvider(providerID);
    setProviderSupported(supported);

    if (!supported) {
      setResult(null);
      setLoading(false);
      return;
    }

    props.quotaService.fetchQuota().then((data) => {
      if (requestId !== currentRequestId) return;
      if (data && data.quota) {
        setResult(data);
      } else {
        setResult(null);
      }
      setLoading(false);
    }).catch((error) => {
      if (requestId !== currentRequestId) return;
      console.error("[UsageView] Failed to fetch quota:", error);
      setFetchError(String(error));
      setResult(null);
      setLoading(false);
    });
  };

  // Effect 1: 检测 session 消息，提取 provider/model
  createEffect(() => {
    const sessionId = props.sessionId;
    const messages = props.api.state.session.messages(sessionId);

    if (!messages || messages.length === 0) {
      setCurrentProvider(null);
      setCurrentModel(null);
      setFetchError(null);
      setProviderSupported(false);
      return;
    }

    const lastMsg = findLastAssistantMessage(messages);
    if (!lastMsg) {
      setCurrentProvider(null);
      setCurrentModel(null);
      setFetchError(null);
      setProviderSupported(false);
      return;
    }

    const { providerID, modelID } = lastMsg;

    // 检查是否真的发生了变化
    if (providerID !== currentProvider() || modelID !== currentModel()) {
      setCurrentProvider(providerID);
      setCurrentModel(modelID);
    }
  });

  // Effect 2: 监听 provider 变化，触发额度获取
  createEffect(() => {
    const providerID = currentProvider();

    if (!providerID) {
      setResult(null);
      setLoading(false);
      setProviderSupported(false);
      return;
    }

    doRefresh();
  });

  // Effect 3: 倒计时定时器，归零时触发刷新
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
          <text fg="#888">Refreshing...</text>
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
