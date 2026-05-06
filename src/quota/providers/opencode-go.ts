import type { QuotaData, ProviderConfig } from "../types.js";
import { QuotaProvider, resolveEnvVar } from "../provider.js";

interface OpenCodeGoUsage {
  status: string;
  resetInSec: number;
  usagePercent: number;
}

interface OpenCodeGoResponse {
  "server-fn:3": [
    { mine: boolean; useBalance: boolean; rollingUsage: OpenCodeGoUsage },
    { status: string; resetInSec: number; usagePercent: number },
    { status: string; resetInSec: number; usagePercent: number },
    { status: string; resetInSec: number; usagePercent: number }
  ];
}

export class OpenCodeGoQuotaProvider implements QuotaProvider {
  readonly name = "opencode-go";

  private cookie: string | undefined;
  private workspaceId: string | undefined;
  private serviceId = "c7389bd0e731f80f49593e5ee53835475f4e28594dd6bd83eb229bab753498cd";
  private baseUrl = "https://opencode.ai";

  init(config: ProviderConfig, _credentials: Record<string, unknown>): void {
    this.cookie = resolveEnvVar(config.cookie as string | undefined);
    this.workspaceId = resolveEnvVar(config.workspaceId as string | undefined);
  }

  async fetchQuota(): Promise<QuotaData | null> {
    if (!this.cookie || !this.workspaceId) {
      console.warn("[OpenCodeGoQuotaProvider] Missing cookie or workspaceId");
      return null;
    }

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
          "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
          cookie: this.cookie,
          referer: `${this.baseUrl}/workspace/${this.workspaceId}/usage`,
        },
      });

      if (!response.ok) {
        console.error(`[OpenCodeGoQuotaProvider] API error: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as OpenCodeGoResponse;
      const usageData = data["server-fn:3"];

      if (!usageData || usageData.length < 4) {
        console.error("[OpenCodeGoQuotaProvider] Invalid response structure");
        return null;
      }

      const rollingUsage = usageData[0].rollingUsage;
      const weeklyUsage = usageData[1];
      const monthlyUsage = usageData[2];

      return {
        rolling: {
          usage: rollingUsage.usagePercent,
          reset: this.formatDuration(rollingUsage.resetInSec),
        },
        weekly: {
          usage: weeklyUsage.usagePercent,
          reset: this.formatDuration(weeklyUsage.resetInSec),
        },
        monthly: monthlyUsage.status !== "unlimited"
          ? { usage: monthlyUsage.usagePercent, reset: this.formatDuration(monthlyUsage.resetInSec) }
          : undefined,
      };
    } catch (error) {
      console.error("[OpenCodeGoQuotaProvider] Fetch failed:", error);
      return null;
    }
  }

  resolveEnvVar(value: string | undefined): string | undefined {
    return resolveEnvVar(value);
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
  }
}