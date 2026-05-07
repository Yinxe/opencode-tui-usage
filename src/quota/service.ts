import type { QuotaResult } from "./types.js";
import type { QuotaProvider } from "./provider.js";
import { readProviderConfig, getProviderConfig } from "./config.js";
import { MiniMaxCNQuotaProvider, MiniMaxIOQuotaProvider } from "./providers/minimax.js";
import { OpenCodeGoQuotaProvider } from "./providers/opencode-go.js";

export class QuotaService {
  private providers: Map<string, QuotaProvider> = new Map();
  private providerRegistry = readProviderConfig();
  private activeProviderName: string | null = null;
  private activeProvider: QuotaProvider | null = null;
  private refreshCount = 0;

  constructor() {
    this.registerProvider(new MiniMaxCNQuotaProvider());
    this.registerProvider(new MiniMaxIOQuotaProvider());
    this.registerProvider(new OpenCodeGoQuotaProvider());
  }

  registerProvider(provider: QuotaProvider): void {
    this.providers.set(provider.name, provider);
  }

  setActiveProvider(providerName: string): boolean {
    const provider = this.providers.get(providerName);
    if (!provider) {
      console.warn(`[QuotaService] Unknown provider: ${providerName}`);
      return false;
    }

    const config = getProviderConfig(this.providerRegistry, providerName);

    if (!config) {
      console.warn(`[QuotaService] No config for provider: ${providerName}`);
    }

    provider.init(config || {}, {});
    this.activeProviderName = providerName;
    this.activeProvider = provider;
    return true;
  }

  getActiveProviderName(): string | null {
    return this.activeProviderName;
  }

  isProviderSupported(providerName: string): boolean {
    return this.providers.has(providerName);
  }

  getRegisteredProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  getConfiguredProviderNames(): string[] {
    return Object.keys(this.providerRegistry);
  }

  async fetchQuota(): Promise<QuotaResult | null> {
    if (!this.activeProvider) {
      return null;
    }

    this.refreshCount++;
    const quota = await this.activeProvider.fetchQuota();
    return {
      provider: this.activeProviderName!,
      quota: quota!,
      refreshCount: this.refreshCount,
    };
  }
}