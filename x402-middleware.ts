/**
 * TON Agent Kit — x402 Payment Middleware (Production-Hardened)
 *
 * Makes any Express API payable in TON.
 * Agents auto-detect the 402 response, pay, and retry.
 *
 * Security features:
 * - Anti-replay: each tx hash can only be used ONCE (pluggable store)
 * - Timestamp check: transaction must be recent (< maxAge)
 * - Amount verification: tight tolerance for cross-transfers, gas tolerance for self-transfers
 * - 2-level verification: blockchain endpoint → events fallback
 *
 * Storage options:
 * - FileReplayStore (default) — zero dependencies, JSON file on disk
 * - RedisReplayStore — Upstash, Redis Cloud, or self-hosted Redis
 * - MemoryReplayStore — for testing only
 * - Custom — implement the ReplayStore interface
 *
 * Usage:
 *   import { tonPaywall, createPaymentServer } from "./x402-middleware";
 *
 *   // Default (file-based, zero config)
 *   app.get("/api/data", tonPaywall({ amount: "0.001", recipient: "0:abc..." }), handler);
 *
 *   // With Upstash Redis
 *   import { Redis } from "@upstash/redis";
 *   const store = new RedisReplayStore(new Redis({ url: "...", token: "..." }));
 *   app.get("/api/data", tonPaywall({ amount: "0.001", recipient: "0:abc...", replayStore: store }), handler);
 */

import type { NextFunction, Request, Response } from "express";

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
// Storage Adapter — pluggable anti-replay backend
// ============================================================

/**
 * Interface for anti-replay storage.
 * Implement this to use any backend (Redis, PostgreSQL, DynamoDB, etc.)
 */
export interface ReplayStore {
  /** Check if a tx hash has been used */
  has(hash: string): Promise<boolean>;
  /** Mark a tx hash as used (must be permanent — anti-replay) */
  add(hash: string): Promise<void>;
}

/**
 * File-based store (default — zero dependencies)
 * Persists used hashes to a JSON file on disk.
 * Survives server restarts. Good for small-medium deployments.
 */
export class FileReplayStore implements ReplayStore {
  private hashes: Set<string>;
  private filePath: string;

  constructor(filePath: string = ".x402-used-hashes.json") {
    this.filePath = filePath;
    this.hashes = new Set();
    try {
      const { existsSync, readFileSync } = require("fs");
      if (existsSync(this.filePath)) {
        this.hashes = new Set(JSON.parse(readFileSync(this.filePath, "utf-8")));
      }
    } catch {}
  }

  async has(hash: string): Promise<boolean> {
    return this.hashes.has(hash);
  }

  async add(hash: string): Promise<void> {
    this.hashes.add(hash);
    try {
      const { writeFileSync } = require("fs");
      writeFileSync(this.filePath, JSON.stringify([...this.hashes]), "utf-8");
    } catch {}
  }
}

/**
 * Redis/Upstash store — for production scale.
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
export class RedisReplayStore implements ReplayStore {
  private redis: any;
  private prefix: string;

  constructor(redisClient: any, prefix: string = "x402:used:") {
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
}

/**
 * In-memory store — for testing only.
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
}

// ============================================================
// Verified payment cache (TTL-based, in-memory)
// ============================================================

const verifiedPayments = new Map<
  string,
  { timestamp: number; amount: string }
>();

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
export function tonPaywall(config: PaywallConfig) {
  const {
    amount,
    recipient,
    network = "testnet",
    proofTTL = 300,
    description = "API access",
    replayStore = new FileReplayStore(),
  } = config;

  return async (req: Request, res: Response, next: NextFunction) => {
    const paymentHash = req.headers["x-payment-hash"] as string;

    // If no payment proof, return 402
    if (!paymentHash) {
      const requirement: PaymentRequirement = {
        recipient: recipient || "configure-recipient",
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

    // Check cache first (avoid re-verifying on-chain)
    if (verifiedPayments.has(paymentHash)) {
      const cached = verifiedPayments.get(paymentHash)!;
      if (Date.now() / 1000 - cached.timestamp < proofTTL) {
        next();
        return;
      }
      verifiedPayments.delete(paymentHash);
    }

    // Verify payment on-chain (production-hardened)
    const verification = await verifyPayment(
      paymentHash,
      recipient || "",
      amount,
      network,
      proofTTL,
      replayStore,
    );

    if (verification.valid) {
      verifiedPayments.set(paymentHash, {
        timestamp: Math.floor(Date.now() / 1000),
        amount,
      });
      next();
      return;
    }

    res.status(402).json({
      error: "Payment Not Verified",
      message: verification.reason || "Could not verify payment",
      providedHash: paymentHash,
    });
  };
}

// ============================================================
// Production-hardened payment verification
// ============================================================

/**
 * Verify a payment on-chain with production-grade checks:
 * 1. Anti-replay: tx hash can only be used ONCE, ever
 * 2. Timestamp: transaction must be recent (< maxAge seconds)
 * 3. Amount: tight tolerance for cross-transfers, gas tolerance for self-transfers
 * 4. Recipient: exact match
 */
async function verifyPayment(
  txHash: string,
  expectedRecipient: string,
  expectedAmount: string,
  network: string,
  maxAge: number = 300,
  store: ReplayStore,
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

  const normalizedExpected = expectedRecipient.toLowerCase().replace(/^0:/, "");
  const expectedAmountNano = Math.floor(parseFloat(expectedAmount) * 1e9);

  try {
    // Level 1: Blockchain endpoint (raw transaction data — most reliable)
    const bcRes = await fetch(
      `${apiBase}/blockchain/transactions/${encodeURIComponent(txHash)}`,
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
      );
    }

    const bc = await bcRes.json();

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
    for (const msg of bc.out_msgs || []) {
      const dest = (msg.destination?.address || "")
        .toLowerCase()
        .replace(/^0:/, "");
      const value = Number(msg.value || 0);
      const source = (msg.source?.address || "")
        .toLowerCase()
        .replace(/^0:/, "");

      if (dest === normalizedExpected) {
        // Determine if self-transfer or cross-transfer
        const isSelfTransfer = source === dest;

        // Self-transfer: gas deducted from value (max 0.005 TON tolerance)
        // Cross-transfer: value is exact (only 0.0005 TON tolerance for rounding)
        const tolerance = isSelfTransfer ? 5_000_000 : 500_000;

        if (value >= expectedAmountNano - tolerance) {
          // All checks passed — mark hash as used permanently (anti-replay)
          await store.add(txHash);
          return { valid: true };
        }

        return {
          valid: false,
          reason: `Amount too low: received ${value} nanoton, expected ${expectedAmountNano} (tolerance: ${tolerance})`,
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
    );
  } catch (err: any) {
    return { valid: false, reason: `Verification error: ${err.message}` };
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
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const eventRes = await fetch(
      `${apiBase}/events/${encodeURIComponent(txHash)}`,
    );

    if (!eventRes.ok) {
      return { valid: false, reason: `Event not found: ${eventRes.status}` };
    }

    const event = await eventRes.json();

    // Timestamp check
    const txTimestamp = event.timestamp || 0;
    const now = Math.floor(Date.now() / 1000);
    if (now - txTimestamp > maxAge) {
      return {
        valid: false,
        reason: `Transaction too old: ${now - txTimestamp}s ago (max: ${maxAge}s)`,
      };
    }

    for (const action of event.actions || []) {
      if (action.type === "TonTransfer" && action.status === "ok") {
        const recipientRaw = (action.TonTransfer?.recipient?.address || "")
          .toLowerCase()
          .replace(/^0:/, "");
        const senderRaw = (action.TonTransfer?.sender?.address || "")
          .toLowerCase()
          .replace(/^0:/, "");
        const amount = Number(action.TonTransfer?.amount || 0);

        if (recipientRaw === normalizedExpected) {
          const isSelfTransfer = senderRaw === recipientRaw;
          const tolerance = isSelfTransfer ? 5_000_000 : 500_000;

          if (amount >= expectedAmountNano - tolerance) {
            await store.add(txHash);
            return { valid: true };
          }

          return {
            valid: false,
            reason: `Amount too low: ${amount} nanoton (expected ${expectedAmountNano}, tolerance ${tolerance})`,
          };
        }
      }
    }

    return { valid: false, reason: "No matching transfer found in event" };
  } catch (err: any) {
    return { valid: false, reason: `Event verification error: ${err.message}` };
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
 * // Default — file-based storage, zero config
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
  /** Custom replay store — FileReplayStore (default), RedisReplayStore, or your own */
  replayStore?: ReplayStore;
  routes: Array<{
    path: string;
    amount: string;
    description?: string;
    handler: (req: Request, res: Response) => void;
  }>;
}) {
  const express = require("express");
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
