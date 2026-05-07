import { readFileSync } from "fs";
import { resolve, join } from "path";
import type { ProviderRegistry, ProviderConfig } from "./types.js";

/** OpenCode 配置目录路径 */
const HOME_DIR = process.env.HOME || process.env.USERPROFILE || "";
const OPENCODE_CONFIG_DIR = join(HOME_DIR, ".config", "opencode");

/** usage.provider.json 文件格式 */
interface UsageProviderJson {
  providers: Record<string, ProviderConfig>;
}

/**
 * 读取并解析 usage.provider.json 配置文件
 * @returns Provider 注册表，如果文件不存在或解析失败则返回空对象
 */
export function readProviderConfig(): ProviderRegistry {
  try {
    const configPath = resolve(OPENCODE_CONFIG_DIR, "usage.provider.json");
    const content = readFileSync(configPath, "utf-8");
    const data = JSON.parse(content) as UsageProviderJson;
    return data.providers || {};
  } catch (error) {
    console.warn("[QuotaService] Failed to read usage.provider.json:", error);
    return {};
  }
}

/**
 * 根据 provider 名称获取对应配置
 * @param registry Provider 注册表
 * @param providerName Provider 名称
 * @returns 对应的配置，如果不存在则返回 undefined
 */
export function getProviderConfig(
  registry: ProviderRegistry,
  providerName: string
): ProviderConfig | undefined {
  return registry[providerName];
}
