import type { QuotaResult } from "./types.js";
import type { QuotaProvider } from "./provider.js";
import { readProviderConfig, getProviderConfig } from "./config.js";
import { MiniMaxCNQuotaProvider, MiniMaxIOQuotaProvider } from "./providers/minimax.js";
import { OpenCodeGoQuotaProvider } from "./providers/opencode-go.js";

/**
 * 额度服务 - 管理所有 Provider 的注册和调用
 */
export class QuotaService {
  /** 已注册的 Provider 映射表 */
  private providers: Map<string, QuotaProvider> = new Map();
  /** 从配置文件加载的 Provider 注册表 */
  private providerRegistry = readProviderConfig();
  /** 当前活跃的 Provider 名称 */
  private activeProviderName: string | null = null;
  /** 当前活跃的 Provider 实例 */
  private activeProvider: QuotaProvider | null = null;
  /** 刷新次数计数器 */
  private refreshCount = 0;

  constructor() {
    // 注册支持的 Provider
    this.registerProvider(new MiniMaxCNQuotaProvider());
    this.registerProvider(new MiniMaxIOQuotaProvider());
    this.registerProvider(new OpenCodeGoQuotaProvider());
  }

  /**
   * 注册一个 Provider
   * @param provider Provider 实例
   */
  registerProvider(provider: QuotaProvider): void {
    this.providers.set(provider.name, provider);
  }

  /**
   * 设置当前活跃的 Provider
   * 会调用 Provider 的 init 方法进行初始化
   * @param providerName Provider 名称
   * @returns 是否设置成功（Provider 是否已注册）
   */
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

    // 初始化 Provider，传入配置
    provider.init(config || {}, {});
    this.activeProviderName = providerName;
    this.activeProvider = provider;
    return true;
  }

  /** 获取当前活跃的 Provider 名称 */
  getActiveProviderName(): string | null {
    return this.activeProviderName;
  }

  /**
   * 检查某个 Provider 是否已注册
   * @param providerName Provider 名称
   */
  isProviderSupported(providerName: string): boolean {
    return this.providers.has(providerName);
  }

  /** 获取所有已注册的 Provider 名称列表 */
  getRegisteredProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /** 获取所有已配置的 Provider 名称列表（从配置文件） */
  getConfiguredProviderNames(): string[] {
    return Object.keys(this.providerRegistry);
  }

  /**
   * 获取当前 Provider 的额度数据
   * @returns 额度结果，包含 provider 名称、额度数据和刷新计数
   */
  async fetchQuota(): Promise<QuotaResult | null> {
    if (!this.activeProvider) {
      return null;
    }

    this.refreshCount++;
    const quota = await this.activeProvider.fetchQuota();
    if (!quota) {
      return null;
    }
    return {
      provider: this.activeProviderName!,
      quota,
      refreshCount: this.refreshCount,
    };
  }
}
