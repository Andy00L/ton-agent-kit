import { Address, fromNano, toNano, type MessageRelaxed } from "@ton/core";
import { TonClient4 } from "@ton/ton";
import { describeError } from "./errors";
import type { AgentContext } from "./types";
import {
  isSigningWallet,
  openWalletContract,
  sendFromWalletContract,
  type WalletConfig,
} from "./wallet";

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
  let lastError: unknown;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      if (i < maxRetries - 1) {
        await sleep(baseDelay * Math.pow(2, i));
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(describeError(lastError));
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

  if (!isSigningWallet(agent.wallet)) {
    throw new Error(
      "[sendTransaction] This wallet cannot sign. Attach a KeypairWallet to the agent.",
    );
  }

  const { secretKey, publicKey, walletConfig } = agent.wallet.getCredentials();
  // The network on the agent wins: it is the one the RPC endpoint points at.
  const config: WalletConfig = { ...walletConfig, network: agent.network };
  let lastError = "";

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Read the seqno before sending: confirmation means it moved past this
      // value. Reading it afterwards would compare against the new one and
      // always time out.
      const seqnoBeforeSend = waitForSeqno
        ? await openWalletContract(
            new TonClient4({ endpoint: agent.rpcUrl }),
            publicKey,
            config,
          ).getSeqno()
        : 0;

      // Fresh client every attempt, so no stale connection state is reused.
      await sendFromWalletContract({
        client: new TonClient4({ endpoint: agent.rpcUrl }),
        publicKey,
        secretKey,
        config,
        messages,
      });

      if (!waitForSeqno) return;

      const deadline = Date.now() + SEQNO_CONFIRMATION_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await delay(SEQNO_POLL_INTERVAL_MS);
        try {
          const currentSeqno = await openWalletContract(
            new TonClient4({ endpoint: agent.rpcUrl }),
            publicKey,
            config,
          ).getSeqno();
          if (currentSeqno > seqnoBeforeSend) return;
        } catch {
          // A failed poll says nothing about the transaction. Keep polling.
        }
      }

      // The seqno did not move inside the window. The transaction may still be
      // in flight, so report success rather than sending it a second time.
      return;
    } catch (error: unknown) {
      lastError = describeError(error);
      const isRetryable = RETRYABLE_ERROR_FRAGMENTS.some((fragment) =>
        lastError.includes(fragment),
      );

      if (isRetryable && attempt < maxRetries - 1) {
        await delay(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      break;
    }
  }
  throw new Error(`Transaction failed after ${maxRetries} attempts: ${lastError}`);
}

/** How long to wait for the wallet seqno to move after a send, in milliseconds. */
const SEQNO_CONFIRMATION_TIMEOUT_MS = 30000;

/** Delay between two seqno polls, in milliseconds. */
const SEQNO_POLL_INTERVAL_MS = 2000;

/** First retry delay, doubled on each further attempt, in milliseconds. */
const RETRY_BASE_DELAY_MS = 3000;

/**
 * Error fragments that mean the network or the RPC node was the problem, not
 * the transaction. Anything else fails immediately instead of being resent.
 */
const RETRYABLE_ERROR_FRAGMENTS = [
  "500",
  "timeout",
  "TIMEOUT",
  "seqno",
  "not ready",
  "ECONNRESET",
  "fetch failed",
] as const;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveAfterDelay) =>
    setTimeout(resolveAfterDelay, milliseconds),
  );
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
