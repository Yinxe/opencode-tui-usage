import type { QuotaData, ProviderConfig } from "./types.js";

export interface QuotaProvider {
  readonly name: string;

  init(config: ProviderConfig, credentials: Record<string, unknown>): void;

  fetchQuota(): Promise<QuotaData | null>;
}

export const resolveEnvVar = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const match = value.match(/^\$\{(\w+)\}$/);
  if (match) {
    return process.env[match[1]];
  }
  return value;
};