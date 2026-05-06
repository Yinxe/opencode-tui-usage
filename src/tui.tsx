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
}

function SessionInfoView(props: { api: TuiPluginApi; sessionId: string }): JSX.Element {
  const [data, setData] = createSignal<SidebarData | null>(null);

  createEffect(() => {
    const sessionId = props.sessionId;

    const messages = props.api.state.session.messages(sessionId);
    const todos = props.api.state.session.todo(sessionId);
    const diff = props.api.state.session.diff(sessionId);
    const vcs = props.api.state.vcs;

    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
    const lastModelInfo = lastAssistantMsg && 'modelID' in lastAssistantMsg
      ? { providerID: lastAssistantMsg.providerID, modelID: lastAssistantMsg.modelID }
      : null;

    setData({
      sessionId,
      branch: vcs?.branch,
      provider: lastModelInfo?.providerID ?? 'None',
      model: lastModelInfo?.modelID ?? 'None',
      messageCount: messages.length,
      todoCount: todos.length,
      diffCount: diff.length,
    });
  });

  return (
    <box gap={0}>
      <Title text="Session Info" color="#6bcf7f" />
      <ProgressBar value={65} color="#6bcf7f" />

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