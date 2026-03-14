import express from "express";
import { readFileSync } from "fs";
import {
  createPaymentServer,
  tonPaywall,
  FileReplayStore,
} from "@ton-agent-kit/x402-middleware";

// ============================================================
// Config (manual .env parsing — no dotenv needed)
// ============================================================

const envContent = readFileSync(".env", "utf-8");
const getEnv = (key: string) =>
  envContent
    .split("\n")
    .find((l) => l.startsWith(key + "="))
    ?.slice(key.length + 1)
    .trim() || "";

const RECIPIENT = getEnv("TON_RECIPIENT") || getEnv("TON_ADDRESS");
const NETWORK = (getEnv("TON_NETWORK") as "testnet" | "mainnet") || "testnet";
const PORT = parseInt(getEnv("PORT") || "3402", 10);

if (!RECIPIENT) {
  console.error("Error: Set TON_RECIPIENT or TON_ADDRESS in .env");
  process.exit(1);
}

// ============================================================
// Option 1: createPaymentServer() — quickest setup
// ============================================================

const app = createPaymentServer({
  recipient: RECIPIENT,
  network: NETWORK,
  routes: [
    {
      path: "/api/price",
      amount: "0.001",
      description: "Real-time TON price data",
      handler: (_req, res) => {
        res.json({
          ton: { usd: 3.85, eur: 3.52, btc: 0.0000385 },
          timestamp: new Date().toISOString(),
        });
      },
    },
    {
      path: "/api/analytics",
      amount: "0.01",
      description: "Wallet analytics and insights",
      handler: (req, res) => {
        res.json({
          totalTransactions: 1_247,
          activeWallets24h: 89_432,
          volume24h: "2,450,000 TON",
          topTokens: ["USDT", "NOT", "DOGS", "STON"],
          timestamp: new Date().toISOString(),
        });
      },
    },
  ],
});

// ============================================================
// Option 2: Standalone tonPaywall() — for existing Express apps
// ============================================================

const replayStore = new FileReplayStore(".x402-premium-hashes.json");

app.get(
  "/api/premium",
  tonPaywall({
    amount: "0.05",
    recipient: RECIPIENT,
    network: NETWORK,
    description: "Premium research report",
    proofTTL: 600,
    replayStore,
  }),
  (_req: express.Request, res: express.Response) => {
    res.json({
      report: "TON Ecosystem Q1 2025 Analysis",
      sections: [
        "DeFi TVL Growth",
        "NFT Market Trends",
        "Developer Activity",
        "Institutional Adoption",
      ],
      pages: 42,
      timestamp: new Date().toISOString(),
    });
  },
);

// ============================================================
// Start server
// ============================================================

app.listen(PORT, () => {
  console.log(`\n${"━".repeat(44)}`);
  console.log(`  💎 TON x402 Payment Server`);
  console.log(`  🌐 Network: ${NETWORK}`);
  console.log(`  📍 Recipient: ${RECIPIENT.slice(0, 12)}...`);
  console.log(`  🚀 http://localhost:${PORT}`);
  console.log(`${"━".repeat(44)}`);
  console.log(`\n  Paid endpoints:`);
  console.log(`    GET /api/price      — 0.001 TON`);
  console.log(`    GET /api/analytics  — 0.01  TON`);
  console.log(`    GET /api/premium    — 0.05  TON`);
  console.log(`\n  Free endpoints:`);
  console.log(`    GET /               — server info\n`);
});
