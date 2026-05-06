# OpenCode TUI Usage Plugin

OpenCode TUI 插件，在侧边栏显示用量和额度信息。

## 项目结构

```
src/
├── tui.tsx              # 插件入口，注册 sidebar_content slot
├── usage.tsx            # Usage 组件（Rolling/Weekly/Monthly）
├── session-info.tsx     # Session Info 组件
├── components.tsx       # 可复用组件（LabelValue, Title, ProgressBar）
├── index.ts             # 重新导出 tui
└── quota/               # 额度服务（QuotaProvider 架构）
    ├── types.ts         # QuotaData, QuotaResult, ProviderConfig 类型
    ├── provider.ts       # QuotaProvider 抽象接口
    ├── service.ts        # QuotaService 管理多 provider
    ├── config.ts         # 读取 usage.provider.json
    └── providers/        # provider 实现
        └── minimax.ts    # MiniMax 额度 API 实现
```

## 技术要求

**这不是 React 项目**，使用 Solid.js + `@opentui/solid` 组件。

### 必读规则

- 每个 `.tsx` 文件顶部必须有 `/** @jsxImportSource @opentui/solid */`（即使 tsconfig 已配置，IDE 仍需要此 pragma）
- 使用 `<box>`, `<text>`, `<Show>`, `<For>` 组件（来自 `@opentui/solid`）
- 导出类型来自 `@opencode-ai/plugin/tui`
- 插件注册后允许直接提交代码
- 模块解析需要显式扩展名：`./components.jsx`（不是 `.js`）

## 插件注册

**package.json 中必须包含**：
```json
"oc-plugin": ["tui"]
```
这使得 OpenCode 能够识别并加载此插件。

## 常用组件

### LabelValue - 显示 label:value 对

```tsx
<LabelValue label="Status" value="Active" labelColor="#6bcf7f" />
```

### Title - 标题

```tsx
<Title text="My Plugin" color="#6bcf7f" />
```

### ProgressBar - 进度条

```tsx
<ProgressBar value={65} color="#ffd93d" />
<ProgressBar value={80} width={15} />
```

## 额度数据结构

### QuotaData（Provider 返回）
```ts
{
  rolling: { usage: 20, reset: "4h32m" } | undefined,  // usage 是 0-100 数字
  weekly: { usage: 10, reset: "5d" } | undefined,
  monthly: undefined  // undefined 表示无限制
}
```

### QuotaResult（QuotaService 返回给 TUI）
```ts
{
  provider: "minimax-cn-coding-plan",
  quota: QuotaData,
  refreshCount: 23  // 累计刷新次数
}
```

## 获取会话数据

通过 `api.state` 获取：

```tsx
api.state.session.messages(sessionId)  // 消息列表
api.state.session.todo(sessionId)     // TODO 列表
api.state.session.diff(sessionId)      // 变更文件
api.state.vcs?.branch                 // Git 分支
```

## Slot 注册

```tsx
api.slots.register({
  order: 150,  // 影响侧边栏显示顺序
  slots: {
    sidebar_content(_ctx, _props) { ... }
  }
});
```

## 开发命令

```bash
npm install   # 安装依赖
npm run lint  # 类型检查（tsc --noEmit）
npm run build # 构建输出到 dist/
npm run dev   # 监听模式
```

## 本地测试

在 `~/.config/opencode/tui.json` 中添加（注意用 `plugin` 单数）：

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["/absolute/path/to/opencode-tui-usage-plugin"]
}
```

## 调试

查看日志：
```bash
cat ~/.local/share/opencode/log/$(ls -t ~/.local/share/opencode/log/ | head -1) | grep -i "tui.plugin\|error\|QuotaService\|MiniMaxCN"
```

常见错误：
- 缺少 `"oc-plugin": ["tui"]` 在 package.json
- JSX pragma 错误（每个 .tsx 需要 `/** @jsxImportSource @opentui/solid */`）
- tui.json 中用了 `"plugins"` 而不是 `"plugin"`
- 导入路径缺少扩展名（需要 `.jsx`）

## 配置

额度配置读取 `~/.config/opencode/usage.provider.json`：

```json
{
  "providers": {
    "minimax-cn-coding-plan": {
      "apiKey": "${MINIMAX_API_KEY}"
    }
  }
}
```

支持环境变量占位符 `${VAR_NAME}`，会自动从 `process.env` 解析。