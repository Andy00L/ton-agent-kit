/**
 * Default deployed reputation contracts (hardcoded in SDK).
 * These are used when no factory parameter is found.
 */
export const DEFAULT_REPUTATION_CONTRACTS: Record<string, string> = {
  testnet: "0:6e78355a901729e4218ce6632a6a98df81e7a6740613defc99ef9639942385e9",
};

/**
 * Resolve the reputation contract address with fallback chain:
 * 1. Factory parameter (createIdentityPlugin({ contractAddress: "..." }))
 * 2. Default deployed contract (hardcoded in SDK)
 * 3. null — JSON fallback mode (no contract)
 *
 * FIX 14: Removed .reputation-contract.json file dependency.
 */
export function resolveContractAddress(factoryAddr: string | undefined, network: string): string | null {
  if (factoryAddr) return factoryAddr;
  if (DEFAULT_REPUTATION_CONTRACTS[network]) return DEFAULT_REPUTATION_CONTRACTS[network];
  return null;
}
