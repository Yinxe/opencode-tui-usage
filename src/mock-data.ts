import type { QuotaInfo, ModelUsage } from "./types.js";

/**
 * 生成 mock 额度数据
 */
export function getMockQuotaData(): QuotaInfo {
  const totalQuota = 100;
  const usedQuota = 67.5;
  const remainingQuota = totalQuota - usedQuota;
  const usagePercent = (usedQuota / totalQuota) * 100;

  const modelBreakdown: ModelUsage[] = [
    {
      name: "Claude Sonnet 4.5",
      count: 156,
      tokens: 2450000,
      cost: 28.5,
    },
    {
      name: "GPT-5.2",
      count: 89,
      tokens: 1200000,
      cost: 18.2,
    },
    {
      name: "Kimi K2.5",
      count: 45,
      tokens: 890000,
      cost: 8.9,
    },
    {
      name: "Gemini 3 Pro",
      count: 34,
      tokens: 560000,
      cost: 5.6,
    },
    {
      name: "Qwen3.5 Plus",
      count: 23,
      tokens: 320000,
      cost: 3.2,
    },
  ];

  return {
    totalQuota,
    usedQuota,
    remainingQuota,
    usagePercent,
    todayUsage: 12.3,
    monthUsage: usedQuota,
    cycleStart: "2026-05-01",
    cycleEnd: "2026-05-31",
    modelBreakdown,
  };
}

/**
 * 格式化数字显示
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

/**
 * 格式化费用显示
 */
export function formatCost(cost: number): string {
  return "$" + cost.toFixed(2);
}