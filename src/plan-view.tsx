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
