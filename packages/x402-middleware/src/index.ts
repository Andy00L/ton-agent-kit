/**
 * TON Agent Kit x402 Payment Middleware (Production-Hardened)
 *
 * Makes any Express API payable in TON.
 * Agents auto-detect the 402 response, pay, and retry.
 *
 * Security features:
 * - Anti-replay: each tx hash can only be used ONCE (pluggable store)
 * - Timestamp check: transaction must be recent (< maxAge)
 * - Amount verification: waives the forward fee only, capped so the floor stays positive
 * - 2-level verification: blockchain endpoint → events fallback
 *
 * Storage options:
 * - FileReplayStore (default): zero dependencies, JSON file on disk
 * - RedisReplayStore: Upstash, Redis Cloud, or self-hosted Redis
 * - MemoryReplayStore: for testing only
 * - Custom: implement the ReplayStore interface
 *
 * Usage:
 *   import { tonPaywall, createPaymentServer } from "@ton-agent-kit/x402-middleware";
 *
 *   // Default (file-based, zero config)
 *   app.get("/api/data", tonPaywall({ amount: "0.001", recipient: "0:abc..." }), handler);
 *
 *   // With Upstash Redis
 *   import { Redis } from "@upstash/redis";
 *   const store = new RedisReplayStore(new Redis({ url: "...", token: "..." }));
 *   app.get("/api/data", tonPaywall({ amount: "0.001", recipient: "0:abc...", replayStore: store }), handler);
 */

import express from "express";
import type { NextFunction, Request, Response } from "express";
import { existsSync, readFileSync } from "node:fs";
import { rename, writeFile } from "node:fs/promises";
import { Address } from "@ton/core";
import { z } from "zod";

/**
 * Turn a caught value into a message without assuming it is an `Error`.
 *
 * `@ton-agent-kit/core` exports the same helper, but this middleware stays
 * installable on its own: an Express app that only wants a paywall should not
 * have to pull in the whole agent SDK for three lines.
 */
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * The fetch Response. Aliased because this module also imports Express's
 * `Response`, which otherwise shadows the global one inside every signature.
 */
type FetchResponse = Awaited<ReturnType<typeof fetch>>;

/** The fields the level-1 check reads off a blockchain transaction. */
const BlockchainTransaction = z.object({
  success: z.boolean().optional(),
  utime: z.number().optional(),
  out_msgs: z
    .array(
      z.object({
        value: z.union([z.string(), z.number()]).optional(),
        source: z.object({ address: z.string().optional() }).optional(),
        destination: z.object({ address: z.string().optional() }).optional(),
      }),
    )
    .optional(),
});

/** The fields the level-2 fallback reads off an event. */
const AccountEvent = z.object({
  timestamp: z.number().optional(),
  actions: z
    .array(
      z.object({
        type: z.string().optional(),
        status: z.string().optional(),
        TonTransfer: z
          .object({
            amount: z.union([z.string(), z.number()]).optional(),
            sender: z.object({ address: z.string().optional() }).optional(),
            recipient: z.object({ address: z.string().optional() }).optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

// ============================================================
// Types
// ============================================================

export interface PaywallConfig {
  /** Amount to charge per request in TON (e.g., "0.001") */
  amount: string;
  /** Recipient address (defaults to server wallet) */
  recipient?: string;
  /** Network: testnet or mainnet */
  network?: "testnet" | "mainnet";
  /** How long (in seconds) a payment proof is valid (default: 300 = 5 min) */
  proofTTL?: number;
  /** Description of what the payment is for */
  description?: string;
  /** Custom replay store (default: FileReplayStore) */
  replayStore?: ReplayStore;
  /** TONAPI key for higher rate limits (optional, falls back to the TONAPI_KEY env var) */
  tonapiKey?: string;
}

/**
 * A TON transfer arrives slightly short of the value that was sent, because the
 * network deducts a forward fee of roughly 0.0005 to 0.001 TON. The paywall
 * waives that much rather than rejecting an honest payment.
 */
const FORWARD_FEE_ALLOWANCE_NANOTON = 1_000_000; // 0.001 TON

/**
 * The waiver never exceeds this share of the price. Without the cap, a flat
 * allowance larger than the price pushes the acceptance floor below zero, and a
 * transfer of 0 TON clears the paywall.
 */
const MAX_ALLOWANCE_FRACTION = 0.1;

/**
 * The smallest payment that satisfies a price, in nanotons.
 *
 * Always strictly positive for any positive price, which is the property that
 * keeps a zero-value transfer from passing. Both verification paths call this,
 * so the rule exists once.
 */
export function minimumAcceptableNanoton(expectedAmountNano: number): number {
  const allowance = Math.min(
    FORWARD_FEE_ALLOWANCE_NANOTON,
    Math.floor(expectedAmountNano * MAX_ALLOWANCE_FRACTION),
  );
  return expectedAmountNano - allowance;
}

export interface PaymentRequirement {
  /** TON address to pay */
  recipient: string;
  /** Amount in TON */
  amount: string;
  /** Network */
  network: string;
  /** Payment protocol version */
  protocol: "ton-x402-v1";
  /** Description */
  description: string;
  /** Expiry timestamp */
  expiresAt: number;
}

// ============================================================
// Storage Adapter: pluggable anti-replay backend
// ============================================================

/**
 * Interface for anti-replay storage.
 * Implement this to use any backend (Redis, PostgreSQL, DynamoDB, etc.)
 */
export interface ReplayStore {
  /** Check if a tx hash has been used */
  has(hash: string): Promise<boolean>;
  /**
   * Mark a tx hash as used. This must be permanent and it must fail loudly:
   * a caller that is told the hash was recorded will serve the paid resource,
   * so a swallowed write turns into a replayable payment after a restart.
   */
  add(hash: string): Promise<void>;
  /**
   * Record the hash and report whether this caller is the first to do so, in a
   * single atomic step. `has` followed by `add` is a check-then-act race: two
   * requests carrying the same payment can both pass `has` before either
   * reaches `add`, and both get served. One payment, two deliveries.
   *
   * Optional, so existing stores keep working. Implement it for any deployment
   * running more than one process, where an in-memory guard cannot help.
   */
  claim?(hash: string): Promise<boolean>;
}

/**
 * Claim a hash through the store's atomic path when it has one, falling back to
 * check-then-act otherwise.
 */
async function claimHash(store: ReplayStore, hash: string): Promise<boolean> {
  if (store.claim) return store.claim(hash);
  if (await store.has(hash)) return false;
  await store.add(hash);
  return true;
}

/**
 * File-based store (default, zero dependencies)
 * Persists used hashes to a JSON file on disk.
 * Survives server restarts. Good for small-medium deployments.
 */
/** Where FileReplayStore records spent hashes when the caller names no path. */
const DEFAULT_STORE_PATH = ".x402-used-hashes.json";

/**
 * One store instance per file path, shared by every paywall that does not name
 * its own.
 *
 * `replayStore = new FileReplayStore()` as a default parameter is evaluated on
 * every `tonPaywall()` call, so a server with four paid routes built four
 * stores over one file, each holding a different in-memory set. Every `add()`
 * wrote its own set over the file and erased the other three, which made every
 * payment on every other route replayable after a restart.
 */
const sharedFileStores = new Map<string, FileReplayStore>();

/**
 * The shared default store for a file path. Exported so a caller wiring their
 * own routes can hand the same instance to each of them, and so the sharing
 * itself can be asserted.
 */
export function defaultReplayStore(filePath: string = DEFAULT_STORE_PATH): FileReplayStore {
  const existing = sharedFileStores.get(filePath);
  if (existing) return existing;
  const created = new FileReplayStore(filePath);
  sharedFileStores.set(filePath, created);
  return created;
}

export class FileReplayStore implements ReplayStore {
  private hashes: Set<string>;
  private filePath: string;

  constructor(filePath: string = DEFAULT_STORE_PATH) {
    this.filePath = filePath;
    this.hashes = new Set();

    // No file yet means a first run, which is the one case where an empty set
    // is correct.
    if (!existsSync(this.filePath)) return;

    try {
      this.hashes = new Set(JSON.parse(readFileSync(this.filePath, "utf-8")));
    } catch (caught: unknown) {
      // The file exists but could not be read. Starting empty would silently
      // forget every hash already spent and make every past payment replayable,
      // so refuse to start instead.
      throw new Error(
        `[FileReplayStore] ${this.filePath} exists but could not be read, refusing to start with an empty replay history: ${describeError(caught)}`,
      );
    }
  }

  async has(hash: string): Promise<boolean> {
    return this.hashes.has(hash);
  }

  async add(hash: string): Promise<void> {
    this.hashes.add(hash);
    // Write to a sibling file and rename it into place. Renaming is atomic on
    // the same filesystem, so a crash mid-write leaves the previous file whole
    // instead of a truncated one, which would drop every recorded hash and make
    // every past payment replayable.
    const temporaryPath = `${this.filePath}.tmp`;
    try {
      await writeFile(temporaryPath, JSON.stringify([...this.hashes]), "utf-8");
      await rename(temporaryPath, this.filePath);
    } catch (caught: unknown) {
      // Undo the in-memory record so it matches what survived to disk, then
      // fail: the caller must not serve a resource for a payment it could not
      // record.
      this.hashes.delete(hash);
      throw new Error(
        `[FileReplayStore] could not record payment ${hash}: ${describeError(caught)}`,
      );
    }
  }

  async claim(hash: string): Promise<boolean> {
    if (this.hashes.has(hash)) return false;
    await this.add(hash);
    return true;
  }
}

/**
 * Redis/Upstash store, for production scale.
 * Works with @upstash/redis, ioredis, or any Redis client with get/set/exists.
 *
 * @example
 * ```ts
 * import { Redis } from "@upstash/redis";
 *
 * const store = new RedisReplayStore(new Redis({
 *   url: "https://your-upstash-url",
 *   token: "your-token",
 * }));
 *
 * const app = createPaymentServer({
 *   recipient: "0:abc...",
 *   replayStore: store,
 *   routes: [...]
 * });
 * ```
 */
/**
 * The three calls this store needs from a Redis client. Declared structurally
 * so ioredis, node-redis and the Upstash HTTP client all satisfy it without
 * this package depending on any of them.
 */
export interface RedisLikeClient {
  exists(key: string): Promise<number | boolean>;
  set(key: string, value: string): Promise<unknown>;
  /**
   * Atomic increment, used to claim a hash. Present under this name and this
   * signature in ioredis, node-redis and the Upstash HTTP client, which is why
   * the claim is built on it rather than on the three different spellings of
   * `SET key value NX`.
   */
  incr(key: string): Promise<number>;
}

export class RedisReplayStore implements ReplayStore {
  private redis: RedisLikeClient;
  private prefix: string;

  constructor(redisClient: RedisLikeClient, prefix: string = "x402:used:") {
    this.redis = redisClient;
    this.prefix = prefix;
  }

  async has(hash: string): Promise<boolean> {
    const exists = await this.redis.exists(this.prefix + hash);
    return exists === 1 || exists === true;
  }

  async add(hash: string): Promise<void> {
    await this.redis.set(this.prefix + hash, "1");
  }

  /**
   * INCR returns 1 only for the caller that created the key, so exactly one
   * request out of any number racing on the same payment hash is served, across
   * every process pointed at this Redis.
   */
  async claim(hash: string): Promise<boolean> {
    const uses = await this.redis.incr(this.prefix + hash);
    return uses === 1;
  }
}

/**
 * In-memory store, for testing only.
 * Data is lost on server restart.
 */
export class MemoryReplayStore implements ReplayStore {
  private hashes = new Set<string>();

  async has(hash: string): Promise<boolean> {
    return this.hashes.has(hash);
  }

  async add(hash: string): Promise<void> {
    this.hashes.add(hash);
  }

  async claim(hash: string): Promise<boolean> {
    if (this.hashes.has(hash)) return false;
    this.hashes.add(hash);
    return true;
  }
}

// ============================================================
// Middleware: tonPaywall
// ============================================================

/**
 * Express middleware that gates an endpoint behind a TON payment.
 *
 * Flow:
 * 1. Agent requests the resource
 * 2. Middleware returns 402 with payment instructions
 * 3. Agent pays via transfer_ton
 * 4. Agent retries with X-Payment-Hash header
 * 5. Middleware verifies payment on-chain and grants access
 *
 * @example
 * ```ts
 * app.get("/api/market-data", tonPaywall({
 *   amount: "0.001",
 *   recipient: "0:abc...",
 *   description: "Real-time market data access",
 * }), (req, res) => {
 *   res.json({ btc: 95000, ton: 3.85 });
 * });
 * ```
 */
/**
 * How many responses one verified payment may serve.
 *
 * The cache exists so a client that paid and then timed out can retry with the
 * same hash. Three covers a retry and a reload; past that the payment is spent.
 */
const MAX_CACHED_PROOF_USES = 3;

export function tonPaywall(config: PaywallConfig) {
  // Per-instance cache: each middleware instance has its own isolated cache
  const verifiedPayments = new Map<string, { timestamp: number; usesLeft: number }>();
  // Prevents TOCTOU race: tracks hashes currently being verified
  const pendingVerifications = new Set<string>();

  const {
    amount,
    recipient,
    network = "testnet",
    proofTTL = 300,
    description = "API access",
    replayStore = defaultReplayStore(),
  } = config;

  // A paywall that cannot name who gets paid, or what a valid payment looks
  // like, has no way to reject an invalid one. Fail here rather than serve 402s
  // that point at a placeholder and accept whatever comes back.
  if (!recipient) {
    throw new Error(
      "[tonPaywall] recipient is required: without it no payment can be verified against an address.",
    );
  }
  try {
    Address.parse(recipient);
  } catch {
    throw new Error(
      `[tonPaywall] recipient is not a TON address: ${recipient}`,
    );
  }
  const priceNanoton = Math.round(parseFloat(amount) * 1e9);
  if (!Number.isFinite(priceNanoton) || priceNanoton <= 0) {
    throw new Error(
      `[tonPaywall] amount must be a positive TON value, received: ${amount}`,
    );
  }

  // Resolve TONAPI key once: config option > env var > undefined
  const resolvedApiKey = config.tonapiKey ?? process.env.TONAPI_KEY;

  return async (req: Request, res: Response, next: NextFunction) => {
    const paymentHash = req.headers["x-payment-hash"] as string;

    // If no payment proof, return 402
    if (!paymentHash) {
      const requirement: PaymentRequirement = {
        recipient,
        amount,
        network,
        protocol: "ton-x402-v1",
        description,
        expiresAt: Math.floor(Date.now() / 1000) + proofTTL,
      };

      res.status(402).json({
        error: "Payment Required",
        message: `This endpoint requires a payment of ${amount} TON`,
        payment: requirement,
        instructions: {
          step1: `Send ${amount} TON to ${recipient}`,
          step2: "Include the transaction hash in the X-Payment-Hash header",
          step3: "Retry your request",
        },
      });
      return;
    }

    // Checked first, so a client that paid and then lost the response can
    // retry with the same hash inside the proofTTL window. The budget is what
    // keeps that from being a free pass: without it one payment served every
    // request carrying its hash until the entry expired, which at 300 seconds
    // and a thousand requests a second is 300,000 free responses per payment.
    const cached = verifiedPayments.get(paymentHash);
    if (cached) {
      const stillFresh = Date.now() / 1000 - cached.timestamp < proofTTL;
      if (stillFresh && cached.usesLeft > 0) {
        cached.usesLeft -= 1;
        if (cached.usesLeft === 0) verifiedPayments.delete(paymentHash);
        next();
        return;
      }
      verifiedPayments.delete(paymentHash);
      if (stillFresh) {
        // The budget is spent but the payment is real, so say why rather than
        // letting it fall through to the anti-replay rejection.
        res.status(402).json({
          error: "Payment Already Used",
          message: `This payment was already served ${MAX_CACHED_PROOF_USES} times. Send a new payment.`,
        });
        return;
      }
    }

    // Lazy cleanup of expired cache entries to prevent memory leak
    if (verifiedPayments.size > 100) {
      const now = Date.now() / 1000;
      for (const [hash, entry] of verifiedPayments) {
        if (now - entry.timestamp > proofTTL) verifiedPayments.delete(hash);
      }
    }

    // Anti-replay: permanent rejection after cache expires
    if (await replayStore.has(paymentHash)) {
      res.status(402).json({
        error: "Payment Already Used",
        message: "This transaction hash has already been used (anti-replay)",
      });
      return;
    }

    // TOCTOU guard: reject if another request is already verifying this hash
    if (pendingVerifications.has(paymentHash)) {
      res.status(402).json({
        error: "Verification In Progress",
        message: "This hash is already being verified by another request. Retry in a few seconds.",
      });
      return;
    }

    pendingVerifications.add(paymentHash);
    try {
      // Verify payment on-chain (production-hardened)
      // On testnet, TONAPI indexing can take 30-60s, so retry "not found" internally
      // so the caller doesn't waste 12s between external retries
      const verifyAttempts = network === "testnet" ? 3 : 1;
      let verification: { valid: boolean; reason?: string } = { valid: false };
      for (let vAttempt = 0; vAttempt < verifyAttempts; vAttempt++) {
        if (vAttempt > 0) await new Promise((r) => setTimeout(r, 5000));
        verification = await verifyPayment(
          paymentHash,
          recipient,
          amount,
          network,
          proofTTL,
          replayStore,
          resolvedApiKey,
        );
        if (verification.valid) break;
        // Only retry on "not found". Definitive failures (wrong amount, too old, replay) stop immediately.
        if (!verification.reason?.includes("Event not found")) break;
      }

      if (verification.valid) {
        // This request consumes the first use of the budget.
        verifiedPayments.set(paymentHash, {
          timestamp: Math.floor(Date.now() / 1000),
          usesLeft: MAX_CACHED_PROOF_USES - 1,
        });
        next();
        return;
      }

      res.status(402).json({
        error: "Payment Not Verified",
        message: verification.reason || "Could not verify payment",
        providedHash: paymentHash,
      });
    } finally {
      pendingVerifications.delete(paymentHash);
    }
  };
}

// ============================================================
// TONAPI fetch with rate-limit retry
// ============================================================

/**
 * Fetch wrapper that retries on TONAPI rate limiting (HTTP 429).
 * Retries up to 3 times with exponential backoff (2s, 4s, 8s).
 */
async function fetchWithRateLimitRetry(url: string, apiKey?: string): Promise<FetchResponse> {
  const maxRetries = 3;
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  let lastRes!: FetchResponse;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastRes = await fetch(url, { headers });

    const isRateLimited = lastRes.status === 429;

    if (!isRateLimited) return lastRes;

    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt)));
    }
  }
  return lastRes;
}

// ============================================================
// Production-hardened payment verification
// ============================================================

/**
 * Verify a payment on-chain with production-grade checks:
 * 1. Anti-replay: tx hash can only be used ONCE, ever
 * 2. Timestamp: transaction must be recent (< maxAge seconds)
 * 3. Amount: waives the forward fee only, capped at a share of the price
 * 4. Recipient: exact match
 */
async function verifyPayment(
  txHash: string,
  expectedRecipient: string,
  expectedAmount: string,
  network: string,
  maxAge: number = 300,
  store: ReplayStore,
  apiKey?: string,
): Promise<{ valid: boolean; reason?: string }> {
  // Anti-replay: reject if this hash was already used
  if (await store.has(txHash)) {
    return {
      valid: false,
      reason: "Transaction hash already used (anti-replay)",
    };
  }

  const apiBase =
    network === "testnet"
      ? "https://testnet.tonapi.io/v2"
      : "https://tonapi.io/v2";

  // Normalize address to raw format: handles both friendly ("UQB918rv...") and raw ("0:7dd7ca...")
  let normalizedExpected: string;
  try {
    normalizedExpected = Address.parse(expectedRecipient).toRawString().toLowerCase().replace(/^0:/, "");
  } catch {
    normalizedExpected = expectedRecipient.toLowerCase().replace(/^0:/, "");
  }
  const expectedAmountNano = Math.round(parseFloat(expectedAmount) * 1e9);

  try {
    // Level 1: Blockchain endpoint (raw transaction data, most reliable)
    const bcRes = await fetchWithRateLimitRetry(
      `${apiBase}/blockchain/transactions/${encodeURIComponent(txHash)}`,
      apiKey,
    );

    if (!bcRes.ok) {
      // Fallback to Level 2
      return await verifyViaEvents(
        apiBase,
        txHash,
        normalizedExpected,
        expectedAmountNano,
        maxAge,
        store,
        apiKey,
      );
    }

    const parsedTransaction = BlockchainTransaction.safeParse(await bcRes.json());
    if (!parsedTransaction.success) {
      return { valid: false, reason: "Unexpected transaction shape from TONAPI" };
    }
    const bc = parsedTransaction.data;

    // Check 1: Transaction must be successful
    if (!bc.success) {
      return { valid: false, reason: "Transaction failed on-chain" };
    }

    // Check 2: Transaction must be recent
    const txTimestamp = bc.utime || 0;
    const now = Math.floor(Date.now() / 1000);
    if (now - txTimestamp > maxAge) {
      return {
        valid: false,
        reason: `Transaction too old: ${now - txTimestamp}s ago (max: ${maxAge}s)`,
      };
    }

    // Check 3: Find matching out_msg with correct recipient and amount
    for (const msg of bc.out_msgs ?? []) {
      const dest = (msg.destination?.address || "")
        .toLowerCase()
        .replace(/^0:/, "");
      const value = Number(msg.value || 0);

      if (dest === normalizedExpected) {
        const minimumAcceptable = minimumAcceptableNanoton(expectedAmountNano);

        if (value >= minimumAcceptable) {
          // All checks passed. The claim is what grants access: if another
          // request already took this payment, this one gets nothing.
          if (!(await claimHash(store, txHash))) {
            return {
              valid: false,
              reason: "Transaction hash already used (anti-replay)",
            };
          }
          return { valid: true };
        }

        return {
          valid: false,
          reason: `Amount too low: received ${value} nanoton, expected at least ${minimumAcceptable} for a price of ${expectedAmountNano}`,
        };
      }
    }

    // No matching out_msg found, try events fallback
    return await verifyViaEvents(
      apiBase,
      txHash,
      normalizedExpected,
      expectedAmountNano,
      maxAge,
      store,
      apiKey,
    );
  } catch (error: unknown) {
    return { valid: false, reason: `Verification error: ${describeError(error)}` };
  }
}

/**
 * Level 2 fallback: verify via TONAPI events endpoint.
 * Used when the blockchain endpoint is unavailable.
 */
async function verifyViaEvents(
  apiBase: string,
  txHash: string,
  normalizedExpected: string,
  expectedAmountNano: number,
  maxAge: number,
  store: ReplayStore,
  apiKey?: string,
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const eventRes = await fetchWithRateLimitRetry(
      `${apiBase}/events/${encodeURIComponent(txHash)}`,
      apiKey,
    );

    if (!eventRes.ok) {
      if (eventRes.status === 429) {
        return { valid: false, reason: "TONAPI rate limited (429), retry later" };
      }
      return { valid: false, reason: `Event not found: ${eventRes.status}` };
    }

    const parsedEvent = AccountEvent.safeParse(await eventRes.json());
    if (!parsedEvent.success) {
      return { valid: false, reason: "Unexpected event shape from TONAPI" };
    }
    const event = parsedEvent.data;

    // Timestamp check
    const txTimestamp = event.timestamp || 0;
    const now = Math.floor(Date.now() / 1000);
    if (now - txTimestamp > maxAge) {
      return {
        valid: false,
        reason: `Transaction too old: ${now - txTimestamp}s ago (max: ${maxAge}s)`,
      };
    }

    for (const action of event.actions ?? []) {
      if (action.type === "TonTransfer" && action.status === "ok") {
        const recipientRaw = (action.TonTransfer?.recipient?.address || "")
          .toLowerCase()
          .replace(/^0:/, "");
        const amount = Number(action.TonTransfer?.amount || 0);

        if (recipientRaw === normalizedExpected) {
          const minimumAcceptable = minimumAcceptableNanoton(expectedAmountNano);

          if (amount >= minimumAcceptable) {
            if (!(await claimHash(store, txHash))) {
              return {
                valid: false,
                reason: "Transaction hash already used (anti-replay)",
              };
            }
            return { valid: true };
          }

          return {
            valid: false,
            reason: `Amount too low: ${amount} nanoton, expected at least ${minimumAcceptable} for a price of ${expectedAmountNano}`,
          };
        }
      }
    }

    return { valid: false, reason: "No matching transfer found in event" };
  } catch (caught: unknown) {
    return { valid: false, reason: `Event verification error: ${describeError(caught)}` };
  }
}

// ============================================================
// Helper: Create a simple x402 payment server
// ============================================================

/**
 * Quick helper to create an Express server with x402 paywall.
 *
 * @example
 * ```ts
 * // Default: file-based storage, zero config
 * const app = createPaymentServer({
 *   recipient: "0:abc...",
 *   routes: [
 *     { path: "/api/price", amount: "0.001", handler: (req, res) => res.json({ ton: 3.85 }) },
 *   ],
 * });
 *
 * // With Upstash Redis
 * import { Redis } from "@upstash/redis";
 * const app = createPaymentServer({
 *   recipient: "0:abc...",
 *   replayStore: new RedisReplayStore(new Redis({ url: "...", token: "..." })),
 *   routes: [
 *     { path: "/api/price", amount: "0.001", handler: (req, res) => res.json({ ton: 3.85 }) },
 *   ],
 * });
 *
 * // With custom backend
 * class PostgresStore implements ReplayStore {
 *   async has(hash: string) { return await db.query("SELECT 1 FROM used_hashes WHERE hash = $1", [hash]).then(r => r.rows.length > 0); }
 *   async add(hash: string) { await db.query("INSERT INTO used_hashes (hash) VALUES ($1)", [hash]); }
 * }
 * const app = createPaymentServer({
 *   recipient: "0:abc...",
 *   replayStore: new PostgresStore(),
 *   routes: [...],
 * });
 * ```
 */
export function createPaymentServer(config: {
  recipient: string;
  network?: "testnet" | "mainnet";
  /** Custom replay store: FileReplayStore (default), RedisReplayStore, or your own */
  replayStore?: ReplayStore;
  routes: Array<{
    path: string;
    amount: string;
    description?: string;
    handler: (req: Request, res: Response) => void;
  }>;
}) {
  const app = express();

  // Health check (free)
  app.get("/", (_req: Request, res: Response) => {
    res.json({
      name: "TON Agent Kit x402 Server",
      protocol: "ton-x402-v1",
      network: config.network || "testnet",
      recipient: config.recipient,
      endpoints: config.routes.map((r) => ({
        path: r.path,
        amount: r.amount + " TON",
        description: r.description || "Paid endpoint",
      })),
    });
  });

  // Register paid routes
  for (const route of config.routes) {
    app.get(
      route.path,
      tonPaywall({
        amount: route.amount,
        recipient: config.recipient,
        network: config.network || "testnet",
        description: route.description,
        replayStore: config.replayStore,
      }),
      route.handler,
    );
  }

  return app;
}
