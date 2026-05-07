# OpenCode TUI Usage Plugin

OpenCode TUI 插件，在侧边栏显示用量和额度信息，支持多额度 provider。

## 项目结构

```
src/
├── tui.tsx              # 插件入口，注册 sidebar_content slot
├── usage.tsx            # Usage 组件（含自动刷新倒计时、loading 骨架屏）
├── session-info.tsx     # Session Info 组件
├── components.tsx       # 可复用组件（LabelValue, Title, ProgressBar）
├── index.ts             # 重新导出 tui
└── quota/               # 额度服务（QuotaProvider 架构）
    ├── types.ts         # QuotaData, QuotaResult, ProviderConfig
    ├── provider.ts      # QuotaProvider 抽象接口 + resolveEnvVar
    ├── service.ts       # QuotaService 管理多 provider
    ├── config.ts        # 读取 ~/.config/opencode/usage.provider.json
    └── providers/       # provider 适配器
        ├── minimax.ts       # MiniMax-CN provider
        └── opencode-go.ts  # OpenCode-Go provider
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

## 添加新 Provider 适配器工作流

### 1. 获取 API

1. 在浏览器开发者工具 Network 面板抓包
2. 找到额度请求，复制为 cURL
3. 用 cURL 调试，确认能获取响应数据

### 2. 分析 cURL

```
curl 'https://api.example.com/quota' \
  -H 'Authorization: Bearer xxx' \
  -H 'Content-Type: application/json'
```

**可变配置（放入 usage.provider.json）**：
- 认证信息（Authorization header、Bearer token、cookie 等）
- 特殊参数（workspaceId 等）

**固定配置（写在适配器中）**：
- Base URL
- 请求路径
- 其他固定 headers

### 3. 实现适配器

在 `src/quota/providers/` 创建 `{name}.ts`：

```typescript
import type { QuotaData, ProviderConfig } from "../types.js";
import { QuotaProvider, resolveEnvVar } from "../provider.js";

export class XXXQuotaProvider implements QuotaProvider {
  readonly name = "xxx-provider-id";  // 必须与 usage.provider.json 中的 key 匹配

  init(config: ProviderConfig, _credentials: Record<string, unknown>): void {
    // config 中读取认证相关字段
    // 使用 resolveEnvVar() 处理 ${VAR_NAME} 环境变量占位符
  }

  async fetchQuota(): Promise<QuotaData | null> {
    // 调用 API 获取数据
    // 解析响应，映射到 QuotaData 格式：
    // {
    //   rolling: { usage: 0-100, reset: "3h15m" } | undefined,
    //   weekly: { usage: 0-100, reset: "5d" } | undefined,
    //   monthly: { usage: 0-100, reset: "29d" } | undefined,
    // }
  }
}
```

### 4. 注册适配器

在 `src/quota/service.ts` 构造函数中注册：

```typescript
this.registerProvider(new XXXQuotaProvider());
```

### 5. 添加配置

在 `~/.config/opencode/usage.provider.json` 中添加：

```json
{
  "providers": {
    "xxx-provider-id": {
      "authField": "${AUTH_ENV_VAR}"
    }
  }
}
```

## 本地测试

从 GitHub Packages 安装：
```bash
npm config set @yinx-in:registry https://npm.pkg.github.com
npm install @yinx-in/opencode-tui-usage
```

或使用本地路径：
```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["/absolute/path/to/opencode-tui-usage-plugin"]
}
```

## 版本管理与发版

```bash
npm version patch  # 0.0.1 → 0.0.2（自动创建 tag）
git push origin v0.0.2  # 推送 tag 触发 CI/CD
```

推送 tag 触发 CI/CD，**同时发布到 npm 和 GitHub Packages**：
- `publish-npm` → npmjs.org（需配置 `npm_token` secret）
- `publish-github` → GitHub Packages（使用内置 `GITHUB_TOKEN`）

## 调试

查看日志：
```bash
cat ~/.local/share/opencode/log/$(ls -t ~/.local/share/opencode/log/ | head -1) | grep -i "tui.plugin\|error\|QuotaService"
```

常见错误：
- 侧边栏无显示 → 缺少 `"oc-plugin": ["tui"]` 在 package.json
- JSX 报错 → 每个 .tsx 需要 `/** @jsxImportSource @opentui/solid */`
- 显示 "No data" → provider 未注册或 usage.provider.json 配置缺失
