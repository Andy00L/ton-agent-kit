/**
 * TON Agent Kit — x402 Payment Middleware
 *
 * Makes any Express API payable in TON.
 * Agents auto-detect the 402 response, pay, and retry.
 *
 * Usage:
 *   import { tonPaywall, createPaymentServer } from "./x402-middleware";
 *
 *   app.get("/api/data", tonPaywall({ amount: "0.001", recipient: "0:abc..." }), (req, res) => {
 *     res.json({ data: "premium content" });
 *   });
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
// Payment verification cache (in-memory for MVP)
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

    // Check cache first (avoid re-verifying)
    if (verifiedPayments.has(paymentHash)) {
      const cached = verifiedPayments.get(paymentHash)!;
      if (Date.now() / 1000 - cached.timestamp < proofTTL) {
        next();
        return;
      }
      verifiedPayments.delete(paymentHash); // Expired
    }

    // Verify payment on-chain
    try {
      const isValid = await verifyPaymentOnChain(
        paymentHash,
        recipient || "",
        amount,
        network,
      );

      if (isValid) {
        verifiedPayments.set(paymentHash, {
          timestamp: Math.floor(Date.now() / 1000),
          amount,
        });
        next();
        return;
      }

      res.status(402).json({
        error: "Payment Not Verified",
        message:
          "Could not verify the payment. Ensure the transaction is confirmed.",
        providedHash: paymentHash,
      });
    } catch (err: any) {
      res.status(402).json({
        error: "Payment Verification Failed",
        message: err.message,
        providedHash: paymentHash,
      });
    }
  };
}

// ============================================================
// On-chain payment verification via TONAPI
// ============================================================

async function verifyPaymentOnChain(
  txHash: string,
  expectedRecipient: string,
  expectedAmount: string,
  network: string,
): Promise<boolean> {
  const apiBase =
    network === "testnet"
      ? "https://testnet.tonapi.io/v2"
      : "https://tonapi.io/v2";

  const normalizedExpected = expectedRecipient.toLowerCase().replace(/^0:/, "");
  const expectedAmountNano = Math.floor(parseFloat(expectedAmount) * 1e9);

  // Max gas fee on TON is ~0.005 TON = 5,000,000 nanoton
  const maxGasDeduction = 5_000_000;

  try {
    // Use blockchain endpoint — gives raw transaction data
    const bcRes = await fetch(
      `${apiBase}/blockchain/transactions/${encodeURIComponent(txHash)}`,
    );

    if (!bcRes.ok) {
      // Fallback to events endpoint
      return await verifyViaEvents(
        apiBase,
        txHash,
        normalizedExpected,
        expectedAmountNano,
        maxGasDeduction,
      );
    }

    const bc = await bcRes.json();

    // Check success
    if (!bc.success) return false;

    // Check out_msgs for payment to recipient
    for (const msg of bc.out_msgs || []) {
      const dest = (msg.destination?.address || "")
        .toLowerCase()
        .replace(/^0:/, "");
      const value = Number(msg.value || 0);

      if (dest === normalizedExpected) {
        // For cross-address transfers: value = full amount (gas from wallet balance)
        // For self-transfers: value = amount - gas (edge case)
        // Accept if value >= expectedAmount - maxGasFee
        if (value >= expectedAmountNano - maxGasDeduction) {
          return true;
        }
      }
    }

    // Fallback: check events
    return await verifyViaEvents(
      apiBase,
      txHash,
      normalizedExpected,
      expectedAmountNano,
      maxGasDeduction,
    );
  } catch {
    return false;
  }
}

async function verifyViaEvents(
  apiBase: string,
  txHash: string,
  normalizedExpected: string,
  expectedAmountNano: number,
  maxGasDeduction: number,
): Promise<boolean> {
  try {
    const eventRes = await fetch(
      `${apiBase}/events/${encodeURIComponent(txHash)}`,
    );
    if (!eventRes.ok) return false;

    const event = await eventRes.json();
    for (const action of event.actions || []) {
      if (action.type === "TonTransfer" && action.status === "ok") {
        const recipientRaw = (action.TonTransfer?.recipient?.address || "")
          .toLowerCase()
          .replace(/^0:/, "");
        const amount = Number(action.TonTransfer?.amount || 0);

        if (
          recipientRaw === normalizedExpected &&
          amount >= expectedAmountNano - maxGasDeduction
        ) {
          return true;
        }
      }
    }
  } catch {}
  return false;
}

/**
 * Verify payment using raw blockchain transaction data.
 * This checks the actual message value (pre-fee), not the post-fee amount.
 */
async function verifyViaRawTransaction(
  apiBase: string,
  txHash: string,
  normalizedRecipient: string,
  expectedAmountNano: number,
): Promise<boolean> {
  try {
    // Get the account events and find matching transaction
    const traceRes = await fetch(
      `${apiBase}/traces/${encodeURIComponent(txHash)}`,
    );
    if (!traceRes.ok) return false;

    const trace = await traceRes.json();

    // Walk the transaction trace to find the outgoing message
    return walkTrace(
      trace.transaction,
      normalizedRecipient,
      expectedAmountNano,
    );
  } catch {
    return false;
  }
}

/**
 * Recursively walk a transaction trace to find a matching payment.
 * Checks out_msgs for the actual sent value (before fees).
 */
function walkTrace(
  tx: any,
  normalizedRecipient: string,
  expectedAmountNano: number,
): boolean {
  if (!tx) return false;

  // Check outgoing messages for the actual sent value
  if (tx.out_msgs) {
    for (const msg of tx.out_msgs) {
      const dest = (msg.destination?.address || "")
        .toLowerCase()
        .replace(/^0:/, "");
      const value = Number(msg.value || 0);

      if (dest === normalizedRecipient && value >= expectedAmountNano) {
        return true;
      }
    }
  }

  // Check in_msg as well (for receiving side verification)
  if (tx.in_msg) {
    const src = (tx.in_msg.source?.address || "")
      .toLowerCase()
      .replace(/^0:/, "");
    const dest = (tx.in_msg.destination?.address || "")
      .toLowerCase()
      .replace(/^0:/, "");
    const value = Number(tx.in_msg.value || 0);

    if (dest === normalizedRecipient && value >= expectedAmountNano) {
      return true;
    }
  }

  // Walk children transactions
  if (tx.children) {
    for (const child of tx.children) {
      if (walkTrace(child, normalizedRecipient, expectedAmountNano)) {
        return true;
      }
    }
  }

  return false;
}

// ============================================================
// Helper: Create a simple x402 payment server
// ============================================================

/**
 * Quick helper to create an Express server with x402 paywall.
 *
 * @example
 * ```ts
 * const app = createPaymentServer({
 *   recipient: "0:abc...",
 *   network: "testnet",
 *   routes: [
 *     { path: "/api/price", amount: "0.001", handler: (req, res) => res.json({ ton: 3.85 }) },
 *     { path: "/api/analytics", amount: "0.01", handler: (req, res) => res.json({ users: 1000 }) },
 *   ],
 * });
 * app.listen(3000);
 * ```
 */
export function createPaymentServer(config: {
  recipient: string;
  network?: "testnet" | "mainnet";
  routes: Array<{
    path: string;
    amount: string;
    description?: string;
    handler: (req: Request, res: Response) => void;
  }>;
}) {
  // Dynamic import express
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
      }),
      route.handler,
    );
  }

  return app;
}
