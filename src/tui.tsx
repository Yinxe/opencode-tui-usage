/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from '@opencode-ai/plugin/tui';

const id = 'opencode-tui-usage-plugin';

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 150,
    slots: {
      sidebar_content(_ctx: unknown, _props: { session_id: string }) {
        return (
          <box gap={0}>
            <text>Hello from TUI Plugin!</text>
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