# OpenCode TUI Usage Plugin

OpenCode TUI 用量额度显示插件，在侧边栏显示用量和额度信息。

## 功能特性

- 📊 实时显示当前额度使用情况
- 🎯 显示各模型用量统计
- 💰 显示费用信息
- 📈 可视化进度条展示额度使用比例
- 🔄 支持手动刷新数据

## 安装

### 本地安装

1. 克隆或下载此项目
2. 在 `~/.config/opencode/tui.json` 中添加插件路径：

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["/path/to/opencode-tui-usage-plugin"]
}
```

### npm 安装 (发布后可使用)

```bash
opencode plugin add opencode-tui-usage-plugin
```

## 配置

在 `~/.config/opencode/opencode.json` 或项目根目录的 `opencode.json` 中添加配置：

```json
{
  "pluginConfig": {
    "opencode-tui-usage-plugin": {
      "refreshInterval": 30000,
      "showProgressBar": true,
      "showModelBreakdown": true
    }
  }
}
```

### 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `refreshInterval` | number | 30000 | 自动刷新间隔（毫秒） |
| `showProgressBar` | boolean | true | 是否显示进度条 |
| `showModelBreakdown` | boolean | true | 是否显示各模型用量细分 |

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 类型检查
npm run lint
```

## 截图

![Quota Plugin Screenshot](./screenshot.png)

## 许可证

MIT