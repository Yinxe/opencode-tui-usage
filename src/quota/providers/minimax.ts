import type { QuotaData, ProviderConfig } from "../types.js";
import { QuotaProvider, resolveEnvVar } from "../provider.js";

interface ModelRemainItem {
  start_time: number;
  end_time: number;
  remains_time: number;
  current_interval_total_count: number;
  current_interval_usage_count: number;
  model_name: string;
  current_weekly_total_count: number;
  current_weekly_usage_count: number;
  weekly_start_time: number;
  weekly_end_time: number;
  weekly_remains_time: number;
}

interface CodingPlanResponse {
  model_remains: ModelRemainItem[];
  base_resp: {
    status_code: number;
    status_msg: string;
  };
}

class MiniMaxQuotaProvider implements QuotaProvider {
  readonly name: string;
  private apiKey: string | undefined;
  private baseUrl: string;
  private logTag: string;

  constructor(name: string, baseUrl: string) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.logTag = `[${name}]`;
  }

  init(config: ProviderConfig, _credentials: Record<string, unknown>): void {
    const apiKeyRaw = config.apiKey as string | undefined;
    this.apiKey = resolveEnvVar(apiKeyRaw) || resolveEnvVar(config.apiKeyEnvVar as string | undefined);
  }

  async fetchQuota(): Promise<QuotaData | null> {
    if (!this.apiKey) {
      console.warn(`${this.logTag} Missing apiKey`);
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/v1/api/openplatform/coding_plan/remains`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error(`${this.logTag} API error: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as CodingPlanResponse;

      if (data.base_resp?.status_code !== 0) {
        console.error(`${this.logTag} API error: ${data.base_resp?.status_msg}`);
        return null;
      }

      const codingPlanModels = data.model_remains.filter((m) =>
        m.model_name.startsWith("MiniMax-M")
      );

      if (codingPlanModels.length === 0) {
        console.warn(`${this.logTag} No coding plan models found`);
        return null;
      }

      return this.mapResponseToQuotaData(codingPlanModels);
    } catch (error) {
      console.error(`${this.logTag} Fetch failed:`, error);
      return null;
    }
  }

  private mapResponseToQuotaData(models: ModelRemainItem[]): QuotaData {
    let totalRollingAvailable = 0;
    let totalRollingLimit = 0;
    let rollingResetMs = 0;
    let totalWeeklyAvailable = 0;
    let totalWeeklyLimit = 0;
    let weeklyResetMs = 0;

    for (const m of models) {
      totalRollingAvailable += m.current_interval_usage_count;
      totalRollingLimit += m.current_interval_total_count;
      totalWeeklyAvailable += m.current_weekly_usage_count;
      totalWeeklyLimit += m.current_weekly_total_count;
      rollingResetMs = Math.max(rollingResetMs, m.end_time);
      weeklyResetMs = Math.max(weeklyResetMs, m.weekly_end_time);
    }

    const rollingUsed = Math.max(0, totalRollingLimit - totalRollingAvailable);
    const weeklyUsed = Math.max(0, totalWeeklyLimit - totalWeeklyAvailable);

    const rollingPercent =
      totalRollingLimit > 0
        ? Math.round((rollingUsed / totalRollingLimit) * 100)
        : 0;
    const weeklyPercent =
      totalWeeklyLimit > 0
        ? Math.round((weeklyUsed / totalWeeklyLimit) * 100)
        : 0;

    const now = Date.now();
    const rollingResetSec = Math.max(0, Math.floor((rollingResetMs - now) / 1000));
    const weeklyResetSec = Math.max(0, Math.floor((weeklyResetMs - now) / 1000));

    return {
      rolling: {
        usage: rollingPercent,
        reset: this.formatDuration(rollingResetSec),
      },
      weekly: {
        usage: weeklyPercent,
        reset: this.formatDuration(weeklyResetSec),
      },
      monthly: undefined,
    };
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
  }
}

export class MiniMaxCNQuotaProvider extends MiniMaxQuotaProvider {
  constructor() {
    super("minimax-cn-coding-plan", "https://www.minimaxi.com");
  }
}

export class MiniMaxIOQuotaProvider extends MiniMaxQuotaProvider {
  constructor() {
    super("minimax-coding-plan", "https://api.minimax.io");
  }
}
