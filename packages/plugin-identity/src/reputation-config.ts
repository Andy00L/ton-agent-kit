import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const CONFIG_FILE = resolve(".reputation-contract.json");

/**
 * Configuration for a locally deployed reputation contract.
 * Stored in `.reputation-contract.json` for persistence across sessions.
 * @since 1.0.0
 */
export interface ReputationConfig {
  contractAddress: string;
  network: string;
  deployedAt: string;
}

/**
 * Default deployed reputation contracts (hardcoded in SDK).
 * These are used when no factory parameter or local config is found.
 */
export const DEFAULT_REPUTATION_CONTRACTS: Record<string, string> = {
  testnet: "0:5352445990487167d19102e3d1ed2715d69263972ef014bdc1a7561230e2087c",
};

/**
 * Load the reputation contract configuration from `.reputation-contract.json`.
 * @returns The config object, or null if the file doesn't exist.
 * @since 1.0.0
 */
export function loadReputationConfig(): ReputationConfig | null {
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch {}
  return null;
}

/**
 * Save the reputation contract configuration to `.reputation-contract.json`.
 * @param config - The configuration to persist.
 * @since 1.0.0
 */
export function saveReputationConfig(config: ReputationConfig): void {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * Resolve the reputation contract address with fallback chain:
 * 1. Factory parameter (createIdentityPlugin({ contractAddress: "..." }))
 * 2. Local config file (.reputation-contract.json)
 * 3. Default deployed contract (hardcoded in SDK)
 * 4. null — JSON fallback mode (no contract)
 */
export function resolveContractAddress(factoryAddr: string | undefined, network: string): string | null {
  if (factoryAddr) return factoryAddr;
  const config = loadReputationConfig();
  if (config?.contractAddress) return config.contractAddress;
  if (DEFAULT_REPUTATION_CONTRACTS[network]) return DEFAULT_REPUTATION_CONTRACTS[network];
  return null;
}
