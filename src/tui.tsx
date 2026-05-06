/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from '@opencode-ai/plugin/tui';
import type { JSX } from 'solid-js';
import { createSignal, createEffect, Show } from 'solid-js';
import { LabelValue, Title, ProgressBar } from './components.jsx';

const id = 'opencode-tui-usage-plugin';

interface SidebarData {
  sessionId: string;
  branch: string | undefined;
  provider: string;
  model: string;
  messageCount: number;
  todoCount: number;
  diffCount: number;
  contextPercent: number;
  contextUsed: number;
  contextLimit: number;
}

function formatPercent(value: number): string {
  return value.toFixed(1) + '%';
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function SessionInfoView(props: { api: TuiPluginApi; sessionId: string }): JSX.Element {
  const [data, setData] = createSignal<SidebarData | null>(null);

  createEffect(() => {
    const sessionId = props.sessionId;

    const messages = props.api.state.session.messages(sessionId);
    const todos = props.api.state.session.todo(sessionId);
    const diff = props.api.state.session.diff(sessionId);
    const vcs = props.api.state.vcs;
    const providers = props.api.state.provider;

    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
    const lastModelInfo = lastAssistantMsg && 'modelID' in lastAssistantMsg
      ? { providerID: lastAssistantMsg.providerID, modelID: lastAssistantMsg.modelID }
      : null;

    let contextPercent = 0;
    let contextUsed = 0;
    let contextLimit = 0;

    if (lastAssistantMsg && 'tokens' in lastAssistantMsg) {
      const tokens = lastAssistantMsg.tokens;
      contextUsed = tokens.input || 0;

      for (const p of providers) {
        const model = p.models[lastModelInfo?.modelID ?? ''];
        if (model) {
          contextLimit = model.limit.context;
          break;
        }
      }

      if (contextLimit > 0) {
        contextPercent = (contextUsed / contextLimit) * 100;
      }
    }

    setData({
      sessionId,
      branch: vcs?.branch,
      provider: lastModelInfo?.providerID ?? 'None',
      model: lastModelInfo?.modelID ?? 'None',
      messageCount: messages.length,
      todoCount: todos.length,
      diffCount: diff.length,
      contextPercent,
      contextUsed,
      contextLimit,
    });
  });

  return (
    <box gap={0}>
      <Title text="Session Info" color="#6bcf7f" />

      <Show when={data()} fallback={<text>Loading...</text>}>
        {() => {
          const d = data()!;
          return (
            <>
              <LabelValue label="Session" value={d.sessionId.slice(0, 8) + '...'} labelColor="#6bcf7f" />
              <LabelValue label="Branch" value={d.branch ?? 'N/A'} labelColor="#ffd93d" />
              <LabelValue label="Provider" value={d.provider} labelColor="#ff6b6b" />
              <LabelValue label="Model" value={d.model} labelColor="#74b9ff" />
              <LabelValue label="Messages" value={d.messageCount} labelColor="#a29bfe" />
              <LabelValue label="TODOs" value={d.todoCount} labelColor="#fd79a8" />
              <LabelValue label="Changes" value={d.diffCount} labelColor="#00cec9" />
              <LabelValue label="Context" value={formatPercent(d.contextPercent)} labelColor="#ff7675" />
              <box flexDirection="row" gap={1}>
                <ProgressBar value={d.contextPercent} color={d.contextPercent > 80 ? '#ff6b6b' : '#6bcf7f'} />
                <text fg="#888">{formatNumber(d.contextUsed)}/{formatNumber(d.contextLimit)}</text>
              </box>
            </>
          );
        }}
      </Show>
    </box>
  );
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 150,
    slots: {
      sidebar_content(_ctx: unknown, _props: { session_id: string }) {
        return <SessionInfoView api={api} sessionId={_props.session_id} />;
      },
    },
  });

  console.log(`[${id}] Plugin registered`);
};

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
};

export default plugin;