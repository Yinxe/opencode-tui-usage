import { readFileSync } from "fs";
import { resolve, join } from "path";
import type { ProviderRegistry, ProviderConfig } from "./types.js";

const HOME_DIR = process.env.HOME || process.env.USERPROFILE || "";
const OPENCODE_CONFIG_DIR = join(HOME_DIR, ".config", "opencode");

interface UsageProviderJson {
  providers: Record<string, ProviderConfig>;
}

export function readProviderConfig(): ProviderRegistry {
  try {
    const configPath = resolve(OPENCODE_CONFIG_DIR, "usage.provider.json");
    const content = readFileSync(configPath, "utf-8");
    const data = JSON.parse(content) as UsageProviderJson;
    console.log("[QuotaService] Config content:", JSON.stringify(data));
    return data.providers || {};
  } catch (error) {
    console.warn("[QuotaService] Failed to read usage.provider.json:", error);
    return {};
  }
}

export function getProviderConfig(
  registry: ProviderRegistry,
  providerName: string
): ProviderConfig | undefined {
  console.log("[QuotaService] Looking up provider:", providerName);
  console.log("[QuotaService] Registry keys:", Object.keys(registry));
  return registry[providerName];
}