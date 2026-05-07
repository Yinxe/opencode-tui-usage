import type { QuotaData, ProviderConfig } from "../types.js";
import { QuotaProvider, resolveEnvVar } from "../provider.js";

/**
 * OpenCode Go 额度 Provider
 * 通过 opencode.ai 网页 API 获取用户额度信息
 */
export class OpenCodeGoQuotaProvider implements QuotaProvider {
  readonly name = "opencode-go";

  private cookie: string | undefined;
  private workspaceId: string | undefined;
  // 服务端点 ID，用于调用 opencode.ai 的内部 RPC 服务
  private serviceId = "c7389bd0e731f80f49593e5ee53835475f4e28594dd6bd83eb229bab753498cd";
  private baseUrl = "https://opencode.ai";

  init(config: ProviderConfig, _credentials: Record<string, unknown>): void {
    // 从配置中读取 cookie 和 workspaceId，支持 ${ENV_VAR} 格式
    this.cookie = resolveEnvVar(config.cookie as string | undefined);
    this.workspaceId = resolveEnvVar(config.workspaceId as string | undefined);
  }

  async fetchQuota(): Promise<QuotaData | null> {
    if (!this.cookie || !this.workspaceId) {
      console.warn("[OpenCodeGoQuotaProvider] Missing cookie or workspaceId");
      return null;
    }

    // 构建 RPC 调用参数
    const args = JSON.stringify({
      t: { t: 9, i: 0, l: 1, a: [{ t: 1, s: this.workspaceId }], o: 0 },
      f: 31,
      m: [],
    });

    const url = `${this.baseUrl}/_server?id=${this.serviceId}&args=${encodeURIComponent(args)}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          accept: "*/*",
          "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6,pt;q=0.5,pl;q=0.4",
          cookie: this.cookie,
          referer: `${this.baseUrl}/workspace/${this.workspaceId}/usage`,
          "x-server-id": this.serviceId,
          "x-server-instance": "server-fn:3",
          priority: "u=1, i",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0",
        },
      });

      if (!response.ok) {
        console.error(`[OpenCodeGoQuotaProvider] API error: ${response.status}`);
        return null;
      }

      const text = await response.text();

      // 从响应文本中用正则提取 rolling/weekly/monthly 额度数据
      // 响应格式如: rollingUsage:$R[1]={status:"active",resetInSec:3600,usagePercent:45}
      const rollingMatch = text.match(/rollingUsage:\$R\[1\]=\{status:"([^"]+)",resetInSec:(\d+),usagePercent:(\d+)\}/);
      const weeklyMatch = text.match(/weeklyUsage:\$R\[2\]=\{status:"([^"]+)",resetInSec:(\d+),usagePercent:(\d+)\}/);
      const monthlyMatch = text.match(/monthlyUsage:\$R\[3\]=\{status:"([^"]+)",resetInSec:(\d+),usagePercent:(\d+)\}/);

      if (!rollingMatch || !weeklyMatch || !monthlyMatch) {
        console.error("[OpenCodeGoQuotaProvider] Failed to parse response:", text.substring(0, 200));
        return null;
      }

      const rollingUsage = { status: rollingMatch[1], resetInSec: parseInt(rollingMatch[2], 10), usagePercent: parseInt(rollingMatch[3], 10) };
      const weeklyUsage = { status: weeklyMatch[1], resetInSec: parseInt(weeklyMatch[2], 10), usagePercent: parseInt(weeklyMatch[3], 10) };
      const monthlyUsage = { status: monthlyMatch[1], resetInSec: parseInt(monthlyMatch[2], 10), usagePercent: parseInt(monthlyMatch[3], 10) };

      return {
        rolling: {
          usage: rollingUsage.usagePercent,
          reset: this.formatDuration(rollingUsage.resetInSec),
        },
        weekly: {
          usage: weeklyUsage.usagePercent,
          reset: this.formatDuration(weeklyUsage.resetInSec),
        },
        // 如果 monthly 状态是 "unlimited" 则不显示
        monthly: monthlyUsage.status !== "unlimited"
          ? { usage: monthlyUsage.usagePercent, reset: this.formatDuration(monthlyUsage.resetInSec) }
          : undefined,
      };
    } catch (error) {
      console.error("[OpenCodeGoQuotaProvider] Fetch failed:", error);
      return null;
    }
  }

  /** 格式化时间间隔为人类可读字符串 */
  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
  }
}
