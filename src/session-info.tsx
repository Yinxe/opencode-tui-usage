/** @jsxImportSource @opentui/solid */
import type { TuiPluginApi } from "@opencode-ai/plugin/tui";
import type { JSX } from "solid-js";
import { createSignal, createEffect, Show } from "solid-js";
import { LabelValue } from "./components.jsx";

/** 会话信息数据结构 */
interface SessionData {
  sessionId: string;
  branch: string | undefined;
  provider: string;
  model: string;
  messageCount: number;
  todoCount: number;
  diffCount: number;
}

/**
 * Session Info 视图组件
 * 显示当前会话的基本信息：Session ID、Branch、Provider、Model、消息数等
 */
export function SessionInfoView(props: {
  api: TuiPluginApi;
  sessionId: string;
}): JSX.Element {
  const [data, setData] = createSignal<SessionData | null>(null);

  createEffect(() => {
    const sessionId = props.sessionId;

    const messages = props.api.state.session.messages(sessionId);
    const todos = props.api.state.session.todo(sessionId);
    const diff = props.api.state.session.diff(sessionId);
    const vcs = props.api.state.vcs;

    // 从后向前查找最后一个 assistant 消息以获取 provider 和 model 信息
    let lastAssistantMsg = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        lastAssistantMsg = messages[i];
        break;
      }
    }
    const lastModelInfo =
      lastAssistantMsg && "modelID" in lastAssistantMsg
        ? {
            providerID: lastAssistantMsg.providerID,
            modelID: lastAssistantMsg.modelID,
          }
        : null;

    setData({
      sessionId,
      branch: vcs?.branch,
      provider: lastModelInfo?.providerID ?? "None",
      model: lastModelInfo?.modelID ?? "None",
      messageCount: messages.length,
      todoCount: todos.length,
      diffCount: diff.length,
    });
  });

  return (
    <Show when={data()} fallback={<text>Loading...</text>}>
      {() => {
        const d = data()!;
        return (
          <>
            <LabelValue
              label="Session"
              value={d.sessionId.slice(0, 8) + "..."}
              labelColor="#6bcf7f"
            />
            <LabelValue
              label="Branch"
              value={d.branch ?? "N/A"}
              labelColor="#ffd93d"
            />
            <LabelValue
              label="Provider"
              value={d.provider}
              labelColor="#ff6b6b"
            />
            <LabelValue label="Model" value={d.model} labelColor="#74b9ff" />
            <LabelValue
              label="Messages"
              value={d.messageCount}
              labelColor="#a29bfe"
            />
            <LabelValue
              label="TODOs"
              value={d.todoCount}
              labelColor="#fd79a8"
            />
            <LabelValue
              label="Changes"
              value={d.diffCount}
              labelColor="#00cec9"
            />
          </>
        );
      }}
    </Show>
  );
}
