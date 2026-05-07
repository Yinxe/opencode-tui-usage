/**
 * 单个时间维度的额度使用情况
 */
export interface QuotaUsage {
  /** 已使用百分比 (0-100) */
  usage: number;
  /** 距离重置的倒计时字符串，如 "2h", "30m", "5d" */
  reset: string;
}

/**
 * 额度数据结构
 * 包含 Rolling(滚动周期)、Weekly(每周)、Monthly(每月) 三种维度的使用量
 */
export interface QuotaData {
  /** 滚动周期额度（如当天 0 点开始的计数） */
  rolling: QuotaUsage | undefined;
  /** 本周额度 */
  weekly: QuotaUsage | undefined;
  /** 本月额度，部分 provider 可能无此维度 */
  monthly: QuotaUsage | undefined;
}

/**
 * 完整的额度查询结果
 */
export interface QuotaResult {
  /** Provider 名称 */
  provider: string;
  /** 额度数据 */
  quota: QuotaData;
  /** 当前会话的刷新次数计数 */
  refreshCount: number;
}

/**
 * 单个 Provider 的配置格式
 * 具体字段由各 Provider 自己定义，如 apiKey、cookie 等
 */
export interface ProviderConfig {
  [key: string]: unknown;
}

/**
 * Provider 注册表
 * key 为 provider 名称，value 为对应的配置
 */
export interface ProviderRegistry {
  [providerName: string]: ProviderConfig;
}
