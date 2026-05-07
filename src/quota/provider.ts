import type { QuotaData, ProviderConfig } from "./types.js";

/**
 * 额度 Provider 接口
 * 所有额度数据提供者需实现此接口
 */
export interface QuotaProvider {
  /** Provider 唯一标识，需与 usage.provider.json 中的 key 匹配 */
  readonly name: string;

  /**
   * 初始化 Provider
   * @param config 从 usage.provider.json 读取的 provider 配置
   * @param credentials 凭证信息（暂未使用）
   */
  init(config: ProviderConfig, credentials: Record<string, unknown>): void;

  /**
   * 获取额度数据
   * @returns 额度数据，获取失败返回 null
   */
  fetchQuota(): Promise<QuotaData | null>;
}

/**
 * 解析环境变量引用
 * 支持 ${ENV_VAR} 格式，从 process.env 读取实际值
 * @param value 可能是 ${ENV_VAR} 格式的字符串
 * @returns 解析后的值，如果未找到环境变量则返回 undefined
 */
export const resolveEnvVar = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const match = value.match(/^\$\{(\w+)\}$/);
  if (match) {
    return process.env[match[1]];
  }
  return value;
};
