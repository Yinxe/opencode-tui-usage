/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui";
import { UsageView } from "./usage.jsx";
import { SessionInfoView } from "./session-info.jsx";
import { TokensUsageView } from "./tokens-usage.jsx";
import { QuotaService } from "./quota/service.js";

const id = "opencode-tui-usage-plugin";

const tui: TuiPlugin = async (api) => {
  const quotaService = new QuotaService();

  api.slots.register({
    order: 150,
    slots: {
      sidebar_content(_ctx: unknown, _props: { session_id: string }) {
        return (
          <box gap={0}>
            <UsageView
              quotaService={quotaService}
              api={api}
              sessionId={_props.session_id}
            />
            <SessionInfoView api={api} sessionId={_props.session_id} />
            <TokensUsageView
              api={api}
              sessionId={_props.session_id}
            />
          </box>
        );
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