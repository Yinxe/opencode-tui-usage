# OpenCode TUI Usage Plugin

OpenCode TUI 插件，在侧边栏显示用量和额度信息，支持多额度 provider。

## 项目结构

```
src/
├── tui.tsx              # 插件入口，注册 sidebar_content slot
├── usage.tsx            # Usage 组件（Rolling/Weekly/Monthly 彩色标签）
├── session-info.tsx    # Session Info 组件
├── components.tsx       # 可复用组件（LabelValue, Title, ProgressBar）
├── index.ts             # 重新导出 tui
└── quota/               # 额度服务（QuotaProvider 架构）
    ├── types.ts         # QuotaData, QuotaResult, ProviderConfig
    ├── provider.ts      # QuotaProvider 抽象接口 + resolveEnvVar
    ├── service.ts       # QuotaService 管理多 provider
    ├── config.ts        # 读取 ~/.config/opencode/usage.provider.json
    └── providers/
        ├── minimax.ts       # MiniMax-CN provider
        └── opencode-go.ts   # OpenCode-Go provider
```

## 技术要求

**不是 React，是 Solid.js + `@opentui/solid` 组件。**

### 必读规则

- 每个 `.tsx` 文件顶部必须有 `/** @jsxImportSource @opentui/solid */`
- 使用 `<box>`, `<text>`, `<Show>`, `<For>` 组件（来自 `@opentui/solid`）
- 模块导入需要显式扩展名：`./components.jsx`（不是 `.js`）
- 导出类型来自 `@opencode-ai/plugin/tui`
- package.json 必须包含 `"oc-plugin": ["tui"]`

## 开发命令

```bash
npm install   # 安装依赖
npm run lint  # 类型检查（tsc --noEmit）
npm run build # 构建输出到 dist/
npm run dev   # 监听模式
```

## 本地测试

在 `~/.config/opencode/tui.json` 中添加：

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["/absolute/path/to/opencode-tui-usage-plugin"]
}
```

## 配置额度 Provider

插件会自动根据当前会话的 `providerID` 选择对应的 provider。

在 `~/.config/opencode/usage.provider.json` 中配置（注意是 `usage.provider.json`，不是 `usage.plugin.json`）：

```json
{
  "providers": {
    "minimax-cn-coding-plan": {
      "apiKey": "${MINIMAX_API_KEY}"
    },
    "opencode-go": {
      "cookie": "${OPENCODE_GO_AUTH_COOKIE}",
      "workspaceId": "${OPENCODE_GO_WORKSPACE_ID}"
    }
  }
}
```

支持环境变量占位符 `${VAR_NAME}`，会自动从 `process.env` 解析。

### 获取 opencode-go 配置

从浏览器开发者工具抓包获取：
1. 登录 https://opencode.ai
2. 打开开发者工具 → Network
3. 访问 `/workspace/{workspaceId}/usage` 页面
4. 找到 `_server` 请求，从 Request Headers 复制 `cookie`
5. workspaceId 从 URL 中获取（如 `wrk_01KMJ4XGDJGY2DM2ZW0MGA2XKV`）

## 新增 Provider 适配器

1. 在 `src/quota/providers/` 创建 `{name}.ts`
2. 实现 `QuotaProvider` 接口：

```typescript
import type { QuotaData, ProviderConfig } from "../types.js";
import { QuotaProvider, resolveEnvVar } from "../provider.js";

export class XXXQuotaProvider implements QuotaProvider {
  readonly name = "xxx-provider-id";  // 必须与 usage.provider.json 中的 key 匹配

  init(config: ProviderConfig, _credentials: Record<string, unknown>): void {
    // 读取 config 中的字段
    // 使用 resolveEnvVar() 处理环境变量占位符
  }

  async fetchQuota(): Promise<QuotaData | null> {
    // 调用外部 API 获取额度数据
    // 返回格式：
    // {
    //   rolling: { usage: 0-100, reset: "3h15m" } | undefined,
    //   weekly: { usage: 0-100, reset: "5d" } | undefined,
    //   monthly: { usage: 0-100, reset: "29d" } | undefined | null (表示无限制)
    // }
  }
}
```

3. 在 `src/quota/service.ts` 的构造函数中注册：

```typescript
this.registerProvider(new XXXQuotaProvider());
```

### opencode-go 适配器特殊说明

API 响应是 **JavaScript 代码**（不是 JSON），需要用正则解析：

```
self.$R=["server-fn:3"],($R=>$R[0]={mine:!0,useBalance:!1,rollingUsage:$R[1]={status:"ok",resetInSec:336,usagePercent:0},weeklyUsage:$R[2]={...},monthlyUsage:$R[3]={...}})(...)
```

关键 headers：
- `x-server-id`: service ID
- `x-server-instance: server-fn:3`
- `sec-fetch-mode: cors`
- `sec-fetch-site: same-origin`

## 调试

查看日志：
```bash
cat ~/.local/share/opencode/log/$(ls -t ~/.local/share/opencode/log/ | head -1) | grep -i "tui.plugin\|error\|QuotaService\|MiniMaxCN\|OpenCodeGo"
```

常见错误：
- 缺少 `"oc-plugin": ["tui"]` 在 package.json
- JSX pragma 错误（每个 .tsx 需要 `/** @jsxImportSource @opentui/solid */`）
- tui.json 中用了 `"plugins"` 而不是 `"plugin"`
- 导入路径缺少扩展名（需要 `.jsx`）
- opencode-go 返回 500：检查 cookie 是否过期或缺失 `x-server-id` / `x-server-instance` headers