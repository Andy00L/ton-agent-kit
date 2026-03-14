import { Address, fromNano, toNano, type MessageRelaxed } from "@ton/core";
import { TonClient4, WalletContractV5R1 } from "@ton/ton";
import type { AgentContext } from "./types";

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
 * Convert address to user-friendly format (non-bounceable, like Tonkeeper)
 */
export function toFriendlyAddress(address: Address, network: "testnet" | "mainnet" = "mainnet"): string {
  return address.toString({ testOnly: network === "testnet", bounceable: false });
}

/**
 * Generate TON explorer URL for a transaction
 */
export function explorerUrl(
  txHash: string,
  network: "mainnet" | "testnet" = "mainnet"
): string {
  const base = network === "testnet"
    ? "https://testnet.tonviewer.com"
    : "https://tonviewer.com";
  return `${base}/transaction/${txHash}`;
}

/**
 * Generate TON explorer URL for an address
 */
export function explorerAddressUrl(
  address: string,
  network: "mainnet" | "testnet" = "mainnet"
): string {
  const base = network === "testnet"
    ? "https://testnet.tonviewer.com"
    : "https://tonviewer.com";
  return `${base}/${address}`;
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
 * Send a transaction using the proven WalletContractV5R1 pattern.
 * This bypasses KeypairWallet.sendTransfer() which hits a domainSign
 * incompatibility in certain @ton/ton versions.
 */
export async function sendTransaction(
  agent: AgentContext,
  messages: MessageRelaxed[],
): Promise<void> {
  const { secretKey, publicKey } = (agent.wallet as any).getCredentials();
  const networkId = agent.network === "testnet" ? -3 : -239;
  const freshClient = new TonClient4({ endpoint: agent.rpcUrl });
  const walletContract = freshClient.open(
    WalletContractV5R1.create({
      workchain: 0,
      publicKey,
      walletId: {
        networkGlobalId: networkId,
        workchain: 0,
        subwalletNumber: 0,
      },
    }),
  );
  const seqno = await walletContract.getSeqno();
  await walletContract.sendTransfer({
    seqno,
    secretKey,
    messages,
  });
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
