/**
 * 格式化工具函数
 */

/**
 * 格式化数字为大写缩写
 * 例如：1000 -> "1.0K", 1000000 -> "1.0M"
 */
export function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toString();
}

/**
 * 格式化金额为美元字符串
 * 自动去掉尾部的零
 * 例如：0.000001 -> "$0.000001", 0.001000 -> "$0.001"
 */
export function formatCost(cost: number): string {
  if (cost === 0) return "$0";
  const formatted = cost.toFixed(6).replace(/\.?0+$/, "");
  return "$" + formatted;
}

/**
 * 格式化时间间隔为 mm:ss 或 hh:mm:ss 格式
 * 例如：45 -> "45s", 90 -> "1:30", 3661 -> "1:01:01"
 */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  if (totalSeconds < 3600) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * 格式化百分比
 * 例如：45.6 -> "46%"
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * 格式化时间间隔为紧凑格式（用于额度显示）
 * 例如：45 -> "45s", 90 -> "2m", 3600 -> "1h", 86400 -> "1d"
 */
export function formatDurationCompact(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}
