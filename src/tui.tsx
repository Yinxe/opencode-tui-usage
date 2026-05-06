/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from '@opencode-ai/plugin/tui';
import { LabelValue, Title, ProgressBar } from './components.js';

const id = 'opencode-tui-usage-plugin';

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 150,
    slots: {
      sidebar_content(_ctx: unknown, _props: { session_id: string }) {
        return (
          <box gap={0}>
            <Title text="My Plugin" color="#6bcf7f" />
            <ProgressBar value={65} color="#6bcf7f" />
            <LabelValue label="Status" value="Active" labelColor="#6bcf7f" />
            <LabelValue label="Credits" value={100} labelColor="#ffd93d" />
            <LabelValue label="Version" value="1.0.0" />
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