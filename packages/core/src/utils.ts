import { Address, fromNano, toNano } from "@ton/core";

/**
 * Convert TON amount string to nanoton bigint
 */
export function tonToNano(amount: string): bigint {
  return toNano(amount);
}

/**
 * Convert nanoton bigint to human-readable TON string
 */
export function nanoToTon(amount: bigint | string): string {
  return fromNano(typeof amount === "string" ? BigInt(amount) : amount);
}

/**
 * Parse address string to Address object (supports both raw and user-friendly)
 */
export function parseAddress(address: string): Address {
  return Address.parse(address);
}

/**
 * Convert address to user-friendly format
 */
export function toFriendlyAddress(address: Address, testOnly: boolean = false): string {
  return address.toString({ bounceable: true, testOnly });
}

/**
 * Generate TON explorer URL for a transaction
 */
export function explorerUrl(
  txHash: string,
  network: "mainnet" | "testnet" = "mainnet"
): string {
  const base = network === "testnet"
    ? "https://testnet.tonscan.org"
    : "https://tonscan.org";
  return `${base}/tx/${txHash}`;
}

/**
 * Generate TON explorer URL for an address
 */
export function explorerAddressUrl(
  address: string,
  network: "mainnet" | "testnet" = "mainnet"
): string {
  const base = network === "testnet"
    ? "https://testnet.tonscan.org"
    : "https://tonscan.org";
  return `${base}/address/${address}`;
}

/**
 * Wait for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (i < maxRetries - 1) {
        await sleep(baseDelay * Math.pow(2, i));
      }
    }
  }
  throw lastError;
}

/**
 * Default RPC endpoints
 */
export const RPC_ENDPOINTS = {
  mainnet: "https://mainnet-v4.tonhubapi.com",
  testnet: "https://testnet-v4.tonhubapi.com",
} as const;

/**
 * Default TonCenter API endpoints
 */
export const TONCENTER_ENDPOINTS = {
  mainnet: "https://toncenter.com/api/v2/jsonRPC",
  testnet: "https://testnet.toncenter.com/api/v2/jsonRPC",
} as const;
