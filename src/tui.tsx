/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui";
import { UsageView } from "./usage.jsx";
import { SessionInfoView } from "./session-info.jsx";

const id = "opencode-tui-usage-plugin";

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 150,
    slots: {
      sidebar_content(_ctx: unknown, _props: { session_id: string }) {
        return (
          <box gap={0}>
            <UsageView />
            <SessionInfoView api={api} sessionId={_props.session_id} />
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
