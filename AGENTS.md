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

### 1. 抓包获取 API

在浏览器中打开目标网站的额度页面，开发者工具 → Network，找到获取额度数据的请求，Copy as cURL。

### 2. 调试 curl，精简参数

```bash
# 逐步删除不需要的 headers，保留最小可复现的请求
# 移除浏览器特有 headers：sec-fetch-*, user-agent, referer, accept-language 等
# 保留核心：认证信息 + Content-Type
curl -s 'https://example.com/api/quota' \
  -H 'Authorization: Bearer xxx' \
  | jq .
```

目标：得到一个**稳定可复现**、**参数最少**的 curl 命令。

### 3. 分析响应结构

运行精简后的 curl，将响应字段映射到 `QuotaData`：

| 响应字段 | QuotaData 字段 | 说明 |
|----------|---------------|------|
| `xxx.total` / `xxx.used` | `rolling.usage` | 计算百分比 |
| `xxx.reset_time` | `rolling.reset` | 用 `formatDurationCompact()` 格式化 |

### 4. 编写适配器

在 `src/quota/providers/` 创建 `{name}.ts`，实现 `QuotaProvider` 接口，`name` 必须与 `usage.provider.json` 中的 key 匹配。参考已有适配器 `minimax.ts`、`opencode-go.ts`。

### 5. 注册到 QuotaService

在 `src/quota/service.ts` 构造函数中注册：

```typescript
import { MyQuotaProvider } from "./providers/my-provider.js";
this.registerProvider(new MyQuotaProvider());
```

### 6. 配置

在 `~/.config/opencode/usage.provider.json` 中添加配置。

### 7. 测试

构建并重启 OpenCode，切换到对应 provider 的会话，检查侧边栏额度显示。

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

## 编码规范

### TypeScript 规范

**类型安全**
- 避免使用 `as any`、`@ts-ignore`、`@ts-expect-error`
- 使用类型守卫替代类型断言：
  ```typescript
  // ❌ 错误
  const providerID = lastAssistantMsg.providerID as string;

  // ✅ 正确
  if (!("providerID" in lastAssistantMsg) || typeof lastAssistantMsg.providerID !== "string") {
    return;
  }
  const providerID = lastAssistantMsg.providerID as string;
  ```
- 优先使用 `interface` 而非 `type` 来定义对象结构

**空值处理**
- 使用 `??` 或 `?.` 代替 `!` 断言：
  ```typescript
  // ❌ 危险
  return { quota: quota! };

  // ✅ 安全
  if (!quota) return null;
  return { quota };
  ```

### Solid.js 规范

**信号与响应**
- 组件顶层使用 `createSignal` 定义状态
- `createEffect` 用于副作用（数据获取、订阅）
- 使用 `onCleanup` 清理副作用（如 setInterval）：
  ```typescript
  createEffect(() => {
    const id = setInterval(() => { ... }, 1000);
    onCleanup(() => clearInterval(id));
  });
  ```

**竞态条件处理**
- 使用请求 ID 计数器忽略过期响应：
  ```typescript
  let currentRequestId = 0;
  createEffect(() => {
    const requestId = ++currentRequestId;
    fetchData().then(data => {
      if (requestId !== currentRequestId) return; // 忽略过期
      setData(data);
    });
  });
  ```

**组件渲染**
- 使用 `<Show>` 代替三元表达式做条件渲染
- 使用 `<For>` 代替 `.map()` 渲染列表
- 避免在 JSX 中直接调用方法，使用 signal 依赖自动更新

**性能优化**
- 避免不必要的数组拷贝：
  ```typescript
  // ❌ 创建新数组
  const last = [...messages].reverse().find(m => m.role === "assistant");

  // ✅ 反向迭代
  let last = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      last = messages[i];
      break;
    }
  }
  ```

### 错误处理规范

**Provider 错误处理**
- API 错误应记录日志并返回 `null`
- 不要抛出异常，让调用方处理
- 区分不同类型的错误（网络错误、业务错误、解析错误）

**日志规范**
- 只使用 `console.warn` 和 `console.error`
- 生产代码禁止 `console.log`（调试日志）
- 错误日志包含足够的上下文信息

### 代码组织

**模块职责**
- `formatters.ts` - 纯函数，不依赖外部状态
- `components.tsx` - 可复用 UI 组件
- `quota/providers/` - 特定 API 的数据获取逻辑

**导入规范**
- 显式文件扩展名：`.js`、`.jsx`
- 公共 API 在 `index.ts` 统一导出

**Provider 接口设计**
- 最小接口：`name` + `init()` + `fetchQuota()`
- `name` 必须与配置 key 匹配
- `init()` 接收配置，存储认证信息
- `fetchQuota()` 返回 `QuotaData | null`

**环境变量引用**
- 配置文件的值支持两种环境变量格式，推荐使用 `{env:VAR}` 与 OpenCode 配置语法保持一致：
  ```json
  {
    "providers": {
      "my-provider": {
        "apiKey": "{env:MY_API_KEY}"
      }
    }
  }
  ```
- 旧写法 `${MY_API_KEY}` 同样支持，但不推荐新项目使用
- 适配器中通过 `resolveEnvVar()` 解析配置值，自动处理两种格式：
  ```typescript
  this.apiKey = resolveEnvVar(config.apiKey as string | undefined);
  ```

### 命名规范

**组件函数**
- 使用 PascalCase：`UsageView`、`SessionInfoView`
- 辅助函数使用 camelCase：`formatNumber`、`formatDurationCompact`

**类型命名**
- 接口使用 PascalCase：`QuotaProvider`、`ProviderConfig`
- 数据结构使用 PascalCase：`QuotaResult`、`TokenStats`

**常量命名**
- 使用 UPPER_SNAKE_CASE：`REFRESH_INTERVAL = 60`

### 代码风格

**注释规范**
- 为公开 API、复杂逻辑添加注释
- 使用中文注释解释业务逻辑
- 避免显而易见的注释（如 `// 累加`）

**代码重复**
- 重复超过 2 处应提取为公共函数
- `formatDurationCompact` 等工具函数放在 `formatters.ts`

**函数长度**
- 函数应保持简短（建议 < 50 行）
- 过长函数应拆分为更小的辅助函数
