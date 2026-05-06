export interface QuotaUsage {
  usage: number;
  reset: string;
}

export interface QuotaData {
  rolling: QuotaUsage | undefined;
  weekly: QuotaUsage | undefined;
  monthly: QuotaUsage | undefined;
}

export interface QuotaResult {
  provider: string;
  quota: QuotaData;
  refreshCount: number;
}

export interface ProviderConfig {
  [key: string]: unknown;
}

export interface ProviderRegistry {
  [providerName: string]: ProviderConfig;
}