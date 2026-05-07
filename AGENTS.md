# OpenCode TUI Usage Plugin

OpenCode TUI 插件，在侧边栏显示用量和额度信息，支持多额度 provider。

## 项目结构

```
src/
├── tui.tsx              # 插件入口，注册 sidebar_content slot
├── formatters.ts         # 格式化工具 (formatNumber, formatCost, formatDuration)
├── components.tsx         # 通用 UI 组件 (LabelValue, Title, ProgressBar)
├── usage.tsx             # Usage Quota 组件
├── session-info.tsx     # Session Info 组件
├── context-usage.tsx    # Context 使用组件 (最新消息 tokens / limit)
├── tokens-usage.tsx      # Token 统计组件 (累计 per-model 统计)
├── index.ts             # 重新导出 tui
└── quota/              # 额度服务 (QuotaProvider 架构)
    ├── types.ts
    ├── provider.ts      # QuotaProvider 接口
    ├── service.ts       # QuotaService 管理多 provider
    ├── config.ts
    └── providers/
        ├── minimax.ts
        └── opencode-go.ts
```

## 技术要求

**不是 React，是 Solid.js + `@opentui/solid` 组件。**

### 必读规则

- 每个 `.tsx` 文件顶部必须有 `/** @jsxImportSource @opentui/solid */`
- 使用 `<box>`, `<text>`, `<Show>`, `<For>` 组件（来自 `@opentui/solid`）
- 模块导入需要显式扩展名：`./components.jsx`（不是 `.js`）
- 导出类型来自 `@opencode-ai/plugin/tui`
- package.json 必须包含 `"oc-plugin": ["tui"]`

### Solid.js 响应式要点

- 数据展示组件内使用 `createSignal` + `createEffect` 实现响应式
- UI 渲染放在 `createEffect` 回调外部，依赖 signal 自动更新
- 使用 `<Show>` 控制条件渲染，不要用三元表达式

### Context Tokens 计算方式

```
contextTokens = input + output + reasoning + cache.read + cache.write
```

**重要**：Context 显示使用**最新一条** assistant message 的 tokens，不是累计值。

AI 回复期间 tokens 为 0 时需要跳过，避免覆盖之前有效的值：

```typescript
if (msgContextTokens > 0 && msgTime > latestContextTokensTime) {
  latestContextTokens = msgContextTokens;
}
```

## 开发命令

```bash
npm install   # 安装依赖
npm run lint  # 类型检查 (tsc --noEmit)
npm run build # 构建输出到 dist/
npm run dev   # 监听模式
```

## 组件渲染顺序

```
sidebar_content slot 顺序:
1. UsageView (Usage Quota)
2. SessionInfoView (Session)
3. ContextUsageView (Context)     ← 新会话信息下方
4. TokensUsageView (Usage Tokens)
```

## 添加新 Provider 适配器

1. 在 `src/quota/providers/` 创建 `{name}.ts`
2. 实现 `QuotaProvider` 接口，`name` 必须与 `usage.provider.json` 中的 key 匹配
3. 在 `src/quota/service.ts` 构造函数中注册
4. 配置 `~/.config/opencode/usage.provider.json`

## 调试

```bash
cat ~/.local/share/opencode/log/$(ls -t ~/.local/share/opencode/log/ | head -1) | grep -i "tui.plugin\|error\|QuotaService"
```

常见问题：
- JSX 报错 → 每个 .tsx 需要 `/** @jsxImportSource @opentui/solid */`
- Context 显示 0 → 检查 provider 的 context limit 是否正确配置
- AI 回复期间 Context 归零 → 需跳过 tokens 为 0 的消息

## 版本管理与发版

```bash
npm version patch && git push origin v0.0.x
```

推送 tag 触发 CI/CD，同时发布到 npm 和 GitHub Packages。
