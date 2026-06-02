/** @jsxImportSource @opentui/solid */
import { Show, createSignal, createEffect } from "solid-js";
import type { JSX } from "solid-js";
import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui";
import { HeaderView } from "./header-view.jsx";
import { BalanceView } from "./balance-view.jsx";
import { PlanView } from "./plan-view.jsx";
import { SessionInfoView } from "./session-info.jsx";
import { TokensUsageView } from "./tokens-usage.jsx";
import { QuotaService } from "./quota/service.js";
import { findLastAssistantMessage } from "./utils.js";

const id = "opencode-tui-usage-plugin";

const tui: TuiPlugin = async (api) => {
  const quotaService = new QuotaService();

  api.slots.register({
    order: 150,
    slots: {
      sidebar_content(_ctx: unknown, _props: { session_id: string }) {
        return (
          <box gap={0}>
            <HeaderView api={api} sessionId={_props.session_id} />
            <text fg="#333">═══════════════════════════════════════</text>
            <BalanceSection
              quotaService={quotaService}
              api={api}
              sessionId={_props.session_id}
            />
            <PlanSection
              quotaService={quotaService}
              api={api}
              sessionId={_props.session_id}
            />
            <text fg="#333">─────────────────────────────────────</text>
            <SessionInfoView api={api} sessionId={_props.session_id} />
            <text fg="#333">─────────────────────────────────────</text>
            <TokensUsageView api={api} sessionId={_props.session_id} />
          </box>
        );
      },
    },
  });
};

/**
 * Balance 区域 — 仅按量计费 provider 显示
 */
function BalanceSection(props: {
  quotaService: QuotaService;
  api: Parameters<typeof BalanceView>[0]["api"];
  sessionId: string;
}): JSX.Element {
  const [show, setShow] = createSignal(false);

  createEffect(() => {
    const messages = props.api.state.session.messages(props.sessionId);
    const lastMsg = findLastAssistantMessage(messages);
    if (lastMsg) {
      props.quotaService.setActiveProvider(lastMsg.providerID);
      setShow(props.quotaService.supportsBalance());
    } else {
      setShow(false);
    }
  });

  return (
    <Show when={show()}>
      <BalanceView
        quotaService={props.quotaService}
        api={props.api}
        sessionId={props.sessionId}
      />
    </Show>
  );
}

/**
 * Plan 区域 — 仅 plan 型 provider 显示
 */
function PlanSection(props: {
  quotaService: QuotaService;
  api: Parameters<typeof PlanView>[0]["api"];
  sessionId: string;
}): JSX.Element {
  const [show, setShow] = createSignal(false);

  createEffect(() => {
    const messages = props.api.state.session.messages(props.sessionId);
    const lastMsg = findLastAssistantMessage(messages);
    if (lastMsg) {
      props.quotaService.setActiveProvider(lastMsg.providerID);
      setShow(!props.quotaService.supportsBalance());
    } else {
      setShow(false);
    }
  });

  return (
    <Show when={show()}>
      <PlanView
        quotaService={props.quotaService}
        api={props.api}
        sessionId={props.sessionId}
      />
    </Show>
  );
}

const plugin: TuiPluginModule & { id: string } = { id, tui };
export default plugin;
