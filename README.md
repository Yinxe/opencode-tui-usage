# OpenCode TUI Usage Plugin

OpenCode TUI 插件，在侧边栏显示用量和额度信息，支持多额度 provider。

![preview](./preview.png)

## 功能特性

- 📊 实时显示 Rolling / Weekly / Monthly 三种维度的额度使用情况
- 🎨 彩色标签：Rolling(绿) / Weekly(黄) / Monthly(蓝)
- 📈 进度条可视化展示使用比例
- 🔄 自动根据当前会话的 provider 切换数据源
- 🛠️ 支持扩展新的 provider 适配器

## 安装

### 本地安装

1. 克隆或下载此项目到本地
2. 在 `~/.config/opencode/tui.json` 中添加插件路径：

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["/absolute/path/to/opencode-tui-usage-plugin"]
}
```

3. 重启 OpenCode 使插件生效

## 配置额度 Provider

插件支持多个额度 provider，会根据当前会话的 `providerID` 自动选择对应的适配器。

### MiniMax-CN

适用于 `providerID` 为 `minimax-cn-coding-plan` 的会话。

创建 `~/.config/opencode/usage.provider.json`：

```json
{
  "providers": {
    "minimax-cn-coding-plan": {
      "apiKey": "${MINIMAX_API_KEY}"
    }
  }
}
```

设置环境变量：

```bash
export MINIMAX_API_KEY="your-api-key-here"
```

### OpenCode-Go

适用于 `providerID` 为 `opencode-go` 的会话。

在 `~/.config/opencode/usage.provider.json` 中添加：

```json
{
  "providers": {
    "opencode-go": {
      "cookie": "${OPENCODE_GO_AUTH_COOKIE}",
      "workspaceId": "${OPENCODE_GO_WORKSPACE_ID}"
    }
  }
}
```

设置环境变量：

```bash
export OPENCODE_GO_AUTH_COOKIE="your-cookie"
export OPENCODE_GO_WORKSPACE_ID="wrk_xxxxxxxxxxxx"
```

### 获取 OpenCode-Go 配置

1. 登录 https://opencode.ai
2. 打开浏览器开发者工具 → Network
3. 访问 `/workspace/{workspaceId}/usage` 页面
4. 找到 `_server` 请求，从 Request Headers 复制完整的 `cookie`
5. workspaceId 从 URL 中获取（格式：`wrk_` 开头）

## 开发

```bash
# 安装依赖
npm install

# 类型检查
npm run lint

# 构建输出到 dist/
npm run build

# 监听模式（开发时使用）
npm run dev
```

## 目录结构

```
src/
├── tui.tsx              # 插件入口，注册 sidebar_content slot
├── usage.tsx            # Usage 组件（彩色标签 + 进度条）
├── session-info.tsx     # Session Info 组件
├── components.tsx       # 可复用组件
└── quota/               # 额度服务
    ├── types.ts         # QuotaData, QuotaResult 类型定义
    ├── provider.ts      # QuotaProvider 接口
    ├── service.ts       # QuotaService 管理多 provider
    ├── config.ts        # 读取 usage.provider.json
    └── providers/      # provider 适配器
        ├── minimax.ts
        └── opencode-go.ts
```

## 添加新的 Provider 适配器

如果需要支持新的额度来源（如其他 AI provider），按以下步骤添加：

### 1. 创建适配器文件

在 `src/quota/providers/` 下创建 `{provider-name}.ts`：

```typescript
import type { QuotaData, ProviderConfig } from "../types.js";
import { QuotaProvider, resolveEnvVar } from "../provider.js";

export class MyQuotaProvider implements QuotaProvider {
  readonly name = "my-provider";  // 与 usage.provider.json 中的 key 对应

  init(config: ProviderConfig, _credentials: Record<string, unknown>): void {
    // 读取 config 并解析环境变量
  }

  async fetchQuota(): Promise<QuotaData | null> {
    // 调用 API 并返回 QuotaData 格式
  }
}
```

### 2. 注册到 QuotaService

在 `src/quota/service.ts` 构造函数中添加：

```typescript
this.registerProvider(new MyQuotaProvider());
```

### 3. 添加配置

在 `~/.config/opencode/usage.provider.json` 中添加 provider 配置：

```json
{
  "providers": {
    "my-provider": {
      "apiKey": "${MY_API_KEY}"
    }
  }
}
```

### 4. 测试

切换到对应 provider 的会话，检查侧边栏是否正常显示额度数据。

## 调试

查看插件日志：

```bash
cat ~/.local/share/opencode/log/$(ls -t ~/.local/share/opencode/log/ | head -1) | grep -i "tui.plugin\|QuotaService\|MiniMaxCN\|OpenCodeGo"
```

常见问题：

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 侧边栏无显示 | 缺少 `"oc-plugin": ["tui"]` | 检查 package.json |
| JSX 报错 | 缺少 pragma | 每个 .tsx 顶部加 `/** @jsxImportSource @opentui/solid */` |
| 显示 "No data" | provider 未注册或配置缺失 | 检查 usage.provider.json 和环境变量 |
| opencode-go 500 错误 | cookie 过期或 headers 不对 | 重新抓包获取最新 cookie |

## 技术栈

- **Solid.js** - 响应式 UI 框架
- **@opentui/solid** - TUI 组件库（`<box>`, `<text>` 等）
- **TypeScript** - 类型安全

## License

MIT