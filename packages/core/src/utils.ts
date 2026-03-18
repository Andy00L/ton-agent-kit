import { Address, fromNano, toNano, type MessageRelaxed } from "@ton/core";
import { TonClient4, WalletContractV3R2, WalletContractV4, WalletContractV5R1 } from "@ton/ton";
import type { AgentContext } from "./types";

/**
 * Convert a human-readable TON amount string to its nanoton bigint representation.
 *
 * @param amount - The TON amount as a decimal string (e.g. `"1.5"`).
 * @returns The equivalent value in nanotons as a `bigint`.
 *
 * @example
 * ```typescript
 * const nano = tonToNano("1.5");
 * // nano === 1500000000n
 * ```
 *
 * @since 1.0.0
 */
export function tonToNano(amount: string): bigint {
  return toNano(amount);
}

/**
 * Convert a nanoton value to a human-readable TON decimal string.
 *
 * @param amount - The nanoton value as a `bigint` or numeric string.
 * @returns The TON amount as a decimal string (e.g. `"1.5"`).
 *
 * @example
 * ```typescript
 * const ton = nanoToTon(1500000000n);
 * // ton === "1.5"
 * ```
 *
 * @since 1.0.0
 */
export function nanoToTon(amount: bigint | string): string {
  return fromNano(typeof amount === "string" ? BigInt(amount) : amount);
}

/**
 * Parse an address string into an `Address` object.
 *
 * Accepts both raw (`0:...`) and user-friendly (base64) address formats.
 *
 * @param address - The TON address string to parse.
 * @returns The parsed `Address` instance.
 * @throws {Error} When the address string is not a valid TON address.
 *
 * @example
 * ```typescript
 * const addr = parseAddress("EQD...");
 * ```
 *
 * @since 1.0.0
 */
export function parseAddress(address: string): Address {
  return Address.parse(address);
}

/**
 * Convert an `Address` object to the user-friendly, non-bounceable string format
 * commonly displayed in wallets like Tonkeeper.
 *
 * @param address - The `Address` instance to format.
 * @param network - The target network; affects the `testOnly` flag. Defaults to `"mainnet"`.
 * @returns The non-bounceable, user-friendly address string.
 *
 * @example
 * ```typescript
 * const friendly = toFriendlyAddress(addr, "testnet");
 * // "0QB3..." (testnet non-bounceable format)
 * ```
 *
 * @since 1.0.0
 */
export function toFriendlyAddress(address: Address, network: "testnet" | "mainnet" = "mainnet"): string {
  return address.toString({ testOnly: network === "testnet", bounceable: false });
}

/**
 * Generate a TonViewer explorer URL for a specific transaction.
 *
 * @param txHash - The transaction hash.
 * @param network - The network the transaction belongs to. Defaults to `"mainnet"`.
 * @returns The full explorer URL for the transaction.
 *
 * @example
 * ```typescript
 * const url = explorerUrl("abc123...", "testnet");
 * // "https://testnet.tonviewer.com/transaction/abc123..."
 * ```
 *
 * @since 1.0.0
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
 * Generate a TonViewer explorer URL for a specific address.
 *
 * @param address - The TON address to link to.
 * @param network - The network the address belongs to. Defaults to `"mainnet"`.
 * @returns The full explorer URL for the address.
 *
 * @example
 * ```typescript
 * const url = explorerAddressUrl("EQD...", "mainnet");
 * // "https://tonviewer.com/EQD..."
 * ```
 *
 * @since 1.0.0
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
 * Wait for a specified number of milliseconds.
 *
 * @param ms - The duration to sleep in milliseconds.
 * @returns A promise that resolves after the specified delay.
 *
 * @since 1.0.0
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff.
 *
 * Each retry waits `baseDelay * 2^attempt` milliseconds before retrying.
 * Throws the last error if all retries are exhausted.
 *
 * @typeParam T - The return type of the async function.
 * @param fn - The async function to execute and potentially retry.
 * @param maxRetries - Maximum number of attempts. Defaults to `3`.
 * @param baseDelay - Base delay in milliseconds before the first retry. Defaults to `1000`.
 * @returns The resolved value from a successful attempt.
 * @throws {Error} The last error thrown after all retries are exhausted.
 *
 * @example
 * ```typescript
 * const data = await retry(() => fetchData(), 5, 500);
 * ```
 *
 * @since 1.0.0
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
 * Send a blockchain transaction with automatic retry and seqno confirmation.
 *
 * Creates a fresh `TonClient4` on every attempt to avoid stale state, selects
 * the correct wallet contract version (V3R2 / V4 / V5R1), and optionally waits
 * up to 30 seconds for the sequence number to increment (confirming acceptance).
 * Retryable errors (500, timeout, ECONNRESET, etc.) trigger exponential backoff.
 *
 * @param agent - The agent context providing wallet credentials, RPC URL, and network.
 * @param messages - One or more outgoing messages to include in the transfer.
 * @param options - Optional configuration for retry count and seqno waiting.
 * @param options.maxRetries - Maximum number of send attempts. Defaults to `3`.
 * @param options.waitForSeqno - Whether to poll for seqno increment after sending. Defaults to `true`.
 * @returns Resolves when the transaction is sent (and optionally confirmed).
 * @throws {Error} When all retry attempts are exhausted.
 *
 * @example
 * ```typescript
 * import { sendTransaction } from "@ton-agent-kit/core";
 * import { internal } from "@ton/core";
 *
 * await sendTransaction(agentContext, [
 *   internal({ to: "EQD...", value: toNano("0.5"), body: comment("hello") }),
 * ]);
 * ```
 *
 * @since 1.0.0
 */
export async function sendTransaction(
  agent: AgentContext,
  messages: MessageRelaxed[],
  options?: { maxRetries?: number; waitForSeqno?: boolean },
): Promise<void> {
  const maxRetries = options?.maxRetries ?? 3;
  const waitForSeqno = options?.waitForSeqno ?? true;
  const { secretKey, publicKey, walletConfig } = (agent.wallet as any).getCredentials();
  const networkId = agent.network === "testnet" ? -3 : -239;
  let lastError = "";

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Fresh client every attempt — no stale state
      const freshClient = new TonClient4({ endpoint: agent.rpcUrl });

      // Use walletConfig if available, fallback to V5R1
      let walletContract: any;
      if (walletConfig?.version === "V4") {
        walletContract = freshClient.open(
          WalletContractV4.create({ workchain: 0, publicKey }),
        );
      } else if (walletConfig?.version === "V3R2") {
        walletContract = freshClient.open(
          WalletContractV3R2.create({ workchain: 0, publicKey }),
        );
      } else {
        walletContract = freshClient.open(
          WalletContractV5R1.create({
            workchain: 0,
            publicKey,
            walletId: {
              networkGlobalId: networkId,
              workchain: 0,
              subwalletNumber: walletConfig?.subwalletNumber ?? 0,
            },
          }),
        );
      }

      const seqno = await walletContract.getSeqno();
      await walletContract.sendTransfer({ seqno, secretKey, messages });

      // Wait for seqno to increment (TX accepted)
      if (waitForSeqno) {
        const deadline = Date.now() + 30000;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 2000));
          try {
            const checkClient = new TonClient4({ endpoint: agent.rpcUrl });
            let checkContract: any;
            if (walletConfig?.version === "V4") {
              checkContract = checkClient.open(WalletContractV4.create({ workchain: 0, publicKey }));
            } else if (walletConfig?.version === "V3R2") {
              checkContract = checkClient.open(WalletContractV3R2.create({ workchain: 0, publicKey }));
            } else {
              checkContract = checkClient.open(WalletContractV5R1.create({
                workchain: 0, publicKey,
                walletId: { networkGlobalId: networkId, workchain: 0, subwalletNumber: walletConfig?.subwalletNumber ?? 0 },
              }));
            }
            const newSeqno = await checkContract.getSeqno();
            if (newSeqno > seqno) return; // TX confirmed
          } catch { /* ignore polling errors */ }
        }
        // Seqno didn't increment in 30s — TX may still be processing, proceed
        return;
      }

      return; // Success (no seqno wait)
    } catch (err: any) {
      lastError = err.message || String(err);
      const isRetryable =
        lastError.includes("500") || lastError.includes("timeout") ||
        lastError.includes("TIMEOUT") || lastError.includes("seqno") ||
        lastError.includes("not ready") || lastError.includes("ECONNRESET") ||
        lastError.includes("fetch failed");

      if (isRetryable && attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 3000 * Math.pow(2, attempt)));
        continue;
      }
      break;
    }
  }
  throw new Error(`Transaction failed after ${maxRetries} attempts: ${lastError}`);
}

/**
 * Default TON HTTP API v4 RPC endpoints for mainnet and testnet.
 *
 * @since 1.0.0
 */
export const RPC_ENDPOINTS = {
  mainnet: "https://mainnet-v4.tonhubapi.com",
  testnet: "https://testnet-v4.tonhubapi.com",
} as const;

/**
 * Default TonCenter JSON-RPC API endpoints for mainnet and testnet.
 *
 * @since 1.0.0
 */
export const TONCENTER_ENDPOINTS = {
  mainnet: "https://toncenter.com/api/v2/jsonRPC",
  testnet: "https://testnet.toncenter.com/api/v2/jsonRPC",
} as const;
