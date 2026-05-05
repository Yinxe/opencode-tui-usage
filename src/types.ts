/**
 * 额度数据类型定义
 */

export interface ModelUsage {
  /** 模型名称 */
  name: string;
  /** 使用次数 */
  count: number;
  /** 使用的 token 数 */
  tokens: number;
  /** 费用 */
  cost: number;
}

export interface QuotaInfo {
  /** 总额度 */
  totalQuota: number;
  /** 已使用额度 */
  usedQuota: number;
  /** 剩余额度 */
  remainingQuota: number;
  /** 使用百分比 */
  usagePercent: number;
  /** 今日使用 */
  todayUsage: number;
  /** 本月使用 */
  monthUsage: number;
  /** 周期开始日期 */
  cycleStart: string;
  /** 周期结束日期 */
  cycleEnd: string;
  /** 各模型用量明细 */
  modelBreakdown: ModelUsage[];
}

export interface QuotaConfig {
  /** 自动刷新间隔（毫秒） */
  refreshInterval?: number;
  /** 是否显示进度条 */
  showProgressBar?: boolean;
  /** 是否显示模型用量细分 */
  showModelBreakdown?: boolean;
}