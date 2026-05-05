/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from '@opencode-ai/plugin/tui';
import { createSignal, createEffect, onCleanup, For, Show } from 'solid-js';
import type { QuotaInfo } from './types.js';
import { getMockQuotaData, formatNumber, formatCost } from './mock-data.js';

const id = 'opencode-tui-usage-plugin';

function getProgressBarColor(percent: number): string {
  if (percent > 80) return '#ff6b6b';
  if (percent > 50) return '#ffd93d';
  return '#6bcf7f';
}

function SidebarContentView(props: { api: TuiPluginApi }) {
  const [quota, setQuota] = createSignal<QuotaInfo | null>(null);

  const refreshQuota = () => {
    const quotaData = getMockQuotaData();
    setQuota(quotaData);
  };

  createEffect(() => {
    refreshQuota();

    const interval = setInterval(() => {
      refreshQuota();
    }, 30000);

    onCleanup(() => clearInterval(interval));
  });

  const quotaData = () => quota();

  return (
    <box gap={0}>
      {/* Header */}
      <box flexDirection="row" gap={1}>
        <text>💰 Quota Usage</text>
      </box>

      <Show when={quotaData()}>
        {() => {
          const q = quotaData()!;
          return (
            <>
              {/* Main quota card */}
              <box gap={0}>
                <box flexDirection="row" gap={1}>
                  <text>
                    <b>{formatCost(q.usedQuota)}</b>
                  </text>
                  <text fg={props.api.theme.current.textMuted}>
                    of {formatCost(q.totalQuota)}
                  </text>
                </box>

                {/* Progress bar */}
                <box>
                  <text fg={getProgressBarColor(q.usagePercent)}>
                    {'█'.repeat(Math.round(q.usagePercent / 5))}
                    {'▒'.repeat(20 - Math.round(q.usagePercent / 5))}
                  </text>
                </box>

                {/* Details */}
                <box flexDirection="row" gap={2}>
                  <text>
                    剩余: {formatCost(q.remainingQuota)}
                  </text>
                  <text>
                    使用率: {q.usagePercent.toFixed(1)}%
                  </text>
                  <text>
                    今日: {formatCost(q.todayUsage)}
                  </text>
                </box>
              </box>

              {/* Model breakdown */}
              <Show when={q.modelBreakdown.length > 0}>
                <box gap={0}>
                  <text>🤖 Model Usage</text>
                  <For each={q.modelBreakdown.slice(0, 5)}>
                    {(model) => (
                      <box flexDirection="row" gap={1}>
                        <text>{model.name}</text>
                        <text fg={props.api.theme.current.textMuted}>
                          {model.count}次 · {formatNumber(model.tokens)}t · {formatCost(model.cost)}
                        </text>
                      </box>
                    )}
                  </For>
                </box>
              </Show>

              {/* Cycle info */}
              <box>
                <text fg={props.api.theme.current.textMuted}>
                  周期: {q.cycleStart} ~ {q.cycleEnd}
                </text>
              </box>
            </>
          );
        }}
      </Show>

      <Show when={!quotaData()}>
        <text>Loading quota...</text>
      </Show>
    </box>
  );
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 150,
    slots: {
      sidebar_content(_ctx: unknown, _props: { session_id: string }) {
        return <SidebarContentView api={api} />;
      },
    },
  });

  console.log(`[${id}] Quota plugin registered`);
};

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
};

export default plugin;
