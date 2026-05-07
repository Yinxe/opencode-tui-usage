import type { QuotaData, ProviderConfig } from "../types.js";
import { QuotaProvider, resolveEnvVar } from "../provider.js";
import { formatDurationCompact } from "../../formatters.js";

/** MiniMax API 返回的模型额度项 */
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

/** MiniMax 额度 API 响应格式 */
interface CodingPlanResponse {
  model_remains: ModelRemainItem[];
  base_resp: {
    status_code: number;
    status_msg: string;
  };
}

/**
 * MiniMax 额度 Provider 基类
 * 用于处理 MiniMax 的 coding plan 额度数据
 */
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
    this.apiKey = resolveEnvVar(apiKeyRaw);
  }

  async fetchQuota(): Promise<QuotaData | null> {
    if (!this.apiKey) {
      console.warn(`${this.logTag} Missing apiKey`);
      return null;
    }

    try {
      // 调用 MiniMax 额度查询 API
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

      // 检查业务状态码
      if (data.base_resp?.status_code !== 0) {
        console.error(`${this.logTag} API error: ${data.base_resp?.status_msg}`);
        return null;
      }

      // 只保留 MiniMax-M 开头的模型（coding plan 模型）
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

  /** 将 API 响应映射为 QuotaData 格式 */
  private mapResponseToQuotaData(models: ModelRemainItem[]): QuotaData {
    let totalRollingAvailable = 0;
    let totalRollingLimit = 0;
    let rollingResetMs = 0;
    let totalWeeklyAvailable = 0;
    let totalWeeklyLimit = 0;
    let weeklyResetMs = 0;

    // 累加所有模型的额度
    for (const m of models) {
      totalRollingAvailable += m.current_interval_usage_count;
      totalRollingLimit += m.current_interval_total_count;
      totalWeeklyAvailable += m.current_weekly_usage_count;
      totalWeeklyLimit += m.current_weekly_total_count;
      rollingResetMs = Math.max(rollingResetMs, m.end_time);
      weeklyResetMs = Math.max(weeklyResetMs, m.weekly_end_time);
    }

    // 计算已用量和百分比
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

    // 计算距离重置的时间
    const now = Date.now();
    const rollingResetSec = Math.max(0, Math.floor((rollingResetMs - now) / 1000));
    const weeklyResetSec = Math.max(0, Math.floor((weeklyResetMs - now) / 1000));

    return {
      rolling: {
        usage: rollingPercent,
        reset: formatDurationCompact(rollingResetSec),
      },
      weekly: {
        usage: weeklyPercent,
        reset: formatDurationCompact(weeklyResetSec),
      },
      monthly: undefined,
    };
  }
}

/** MiniMax CN (国内版) Provider */
export class MiniMaxCNQuotaProvider extends MiniMaxQuotaProvider {
  constructor() {
    super("minimax-cn-coding-plan", "https://www.minimaxi.com");
  }
}

/** MiniMax IO (海外版) Provider */
export class MiniMaxIOQuotaProvider extends MiniMaxQuotaProvider {
  constructor() {
    super("minimax-coding-plan", "https://api.minimax.io");
  }
}
