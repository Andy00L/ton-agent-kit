import express from "express";
import { readFileSync } from "fs";
import {
  createPaymentServer,
  tonPaywall,
  FileReplayStore,
  MemoryReplayStore,
} from "@ton-agent-kit/x402-middleware";
import {
  TonAgentKit,
  KeypairWallet,
  definePlugin,
  defineAction,
} from "@ton-agent-kit/core";
import TokenPlugin from "@ton-agent-kit/plugin-token";
import DefiPlugin from "@ton-agent-kit/plugin-defi";
import AnalyticsPlugin from "@ton-agent-kit/plugin-analytics";
import { z } from "zod";

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
const X402_PORT = parseInt(getEnv("X402_PORT") || String(PORT), 10);
const MNEMONIC = getEnv("TON_MNEMONIC");
const RPC_URL = getEnv("TON_RPC_URL") || "https://testnet-v4.tonhubapi.com";

if (!RECIPIENT) {
  console.error("Error: Set TON_RECIPIENT or TON_ADDRESS in .env");
  process.exit(1);
}

if (!MNEMONIC) {
  console.error("Error: Set TON_MNEMONIC in .env");
  process.exit(1);
}

// ============================================================
// Main — async for agent initialization
// ============================================================

async function main() {
  const wallet = await KeypairWallet.fromMnemonic(MNEMONIC.split(" "), {
    version: "V5R1",
    network: NETWORK,
  });
  const agent = new TonAgentKit(wallet, RPC_URL, {}, NETWORK)
    .use(TokenPlugin)
    .use(DefiPlugin)
    .use(AnalyticsPlugin);

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
        handler: async (_req, res) => {
          try {
            const priceData = await agent.runAction("get_price", {
              tokenAddress:
                "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
            });
            res.json({
              source: "x402-server",
              fetchedAt: new Date().toISOString(),
              ...(priceData as any),
            });
          } catch (err: any) {
            res.status(500).json({ error: err.message });
          }
        },
      },
      {
        path: "/api/analytics",
        amount: "0.01",
        description: "Wallet analytics and insights",
        handler: async (req, res) => {
          try {
            const addr =
              (req.query.address as string) ||
              agent.wallet.address.toRawString();
            const [walletInfo, txHistory] = await Promise.all([
              agent.runAction("get_wallet_info", { address: addr }),
              agent.runAction("get_transaction_history", {
                address: addr,
                limit: 10,
              }),
            ]);
            res.json({
              source: "x402-server",
              fetchedAt: new Date().toISOString(),
              walletInfo,
              recentTransactions: txHistory,
            });
          } catch (err: any) {
            res.status(500).json({ error: err.message });
          }
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
    async (_req: express.Request, res: express.Response) => {
      try {
        const [balance, priceData, txHistory] = await Promise.all([
          agent.runAction("get_balance", {}),
          agent.runAction("get_price", {
            tokenAddress:
              "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
          }),
          agent.runAction("get_transaction_history", {
            address: agent.wallet.address.toRawString(),
            limit: 20,
          }),
        ]);
        let portfolioMetrics = null;
        try {
          portfolioMetrics = await agent.runAction("get_portfolio_metrics", {
            address: agent.wallet.address.toRawString(),
          });
        } catch {
          // get_portfolio_metrics may not be available
        }
        res.json({
          source: "x402-server",
          fetchedAt: new Date().toISOString(),
          report: "TON Ecosystem Live Analysis",
          balance,
          price: priceData,
          recentTransactions: txHistory,
          ...(portfolioMetrics ? { portfolioMetrics } : {}),
        });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // ============================================================
  // Option 3: Dynamic x402 Endpoints — LLM-controlled
  // ============================================================
  //
  // Instead of hardcoding routes, the LLM opens/closes endpoints
  // at runtime. Each endpoint is protected by tonPaywall() and
  // calls a real SDK action for live blockchain data.

  interface EndpointConfig {
    price: string;
    dataAction: string;
    dataParams: Record<string, string>;
    description: string;
    createdAt: string;
    served: number;
  }

  const endpointRoutes = new Map<string, EndpointConfig>();
  const dynamicReplayStore = new MemoryReplayStore();

  // Auto-detect public URL
  let BASE_URL: string;
  const publicUrl = getEnv("PUBLIC_URL");
  const localMode = getEnv("LOCAL_MODE") === "true";
  if (publicUrl) {
    BASE_URL = publicUrl;
  } else if (localMode) {
    BASE_URL = `http://localhost:${X402_PORT}`;
  } else {
    try {
      const res = await fetch("https://api.ipify.org");
      BASE_URL = `http://${(await res.text()).trim()}:${X402_PORT}`;
    } catch {
      BASE_URL = `http://localhost:${X402_PORT}`;
    }
  }

  const EndpointPlugin = definePlugin({
    name: "x402-endpoints",
    actions: [
      defineAction({
        name: "open_x402_endpoint",
        description:
          "Open a paid x402 endpoint. Other agents pay TON for live blockchain data.",
        schema: z.object({
          path: z.string().describe("URL path starting with /"),
          price: z.string().describe("Price in TON per request"),
          dataAction: z.string().describe("SDK action name for data"),
          dataParams: z
            .string()
            .optional()
            .describe("Default params as JSON string"),
          description: z.string().optional().describe("Description"),
        }),
        handler: async (_agent: any, params: any) => {
          const path = params.path.startsWith("/")
            ? params.path
            : "/" + params.path;
          endpointRoutes.set(path, {
            price: params.price,
            dataAction: params.dataAction,
            dataParams: params.dataParams
              ? typeof params.dataParams === "string"
                ? JSON.parse(params.dataParams)
                : params.dataParams
              : {},
            description: params.description || `${params.dataAction} data`,
            createdAt: new Date().toISOString(),
            served: 0,
          });
          console.log(
            `    [x402] Opened ${path} → ${params.dataAction} @ ${params.price} TON`,
          );
          return {
            success: true,
            path,
            url: `${BASE_URL}${path}`,
            price: params.price,
            dataAction: params.dataAction,
            message: `Endpoint live. Use this URL in send_offer.`,
          };
        },
      }),
      defineAction({
        name: "close_x402_endpoint",
        description: "Close a paid x402 endpoint.",
        schema: z.object({ path: z.string().describe("URL path to close") }),
        handler: async (_agent: any, params: any) => {
          const path = params.path.startsWith("/")
            ? params.path
            : "/" + params.path;
          const config = endpointRoutes.get(path);
          const existed = endpointRoutes.delete(path);
          console.log(`    [x402] Closed ${path}`);
          return {
            success: true,
            closed: path,
            existed,
            totalServed: config?.served || 0,
          };
        },
      }),
      defineAction({
        name: "list_x402_endpoints",
        description: "List all open x402 endpoints.",
        schema: z.object({}),
        handler: async () => {
          const eps: any[] = [];
          for (const [p, c] of endpointRoutes)
            eps.push({
              path: p,
              url: `${BASE_URL}${p}`,
              price: c.price,
              dataAction: c.dataAction,
              served: c.served,
            });
          return { endpoints: eps, count: eps.length };
        },
      }),
    ],
  });

  // Register the EndpointPlugin with the agent
  agent.use(EndpointPlugin);

  // Dynamic catch-all: routes requests to LLM-created endpoints
  app.use(async (req: any, res: any, next: any) => {
    const route = endpointRoutes.get(req.path);
    if (!route) return next();

    tonPaywall({
      amount: route.price,
      recipient: RECIPIENT,
      network: NETWORK,
      description: route.description,
      replayStore: dynamicReplayStore,
    })(req, res, async () => {
      try {
        const merged: Record<string, any> = { ...route.dataParams };
        for (const [k, v] of Object.entries(req.query)) {
          if (typeof v === "string" && v.length > 0) merged[k] = v;
        }
        const data = await agent.runAction(route.dataAction, merged);
        route.served++;
        console.log(`    [x402] ${req.path} served (${route.served}x)`);
        res.json({
          source: "x402-server",
          fetchedAt: new Date().toISOString(),
          ...data,
        });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });
  });

  // ============================================================
  // Programmatic example: open an endpoint at startup
  // ============================================================

  // You can open endpoints programmatically (without LLM):
  await agent.runAction("open_x402_endpoint", {
    path: "/api/dynamic-price",
    price: "0.002",
    dataAction: "get_price",
    dataParams: JSON.stringify({
      tokenAddress: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    }),
    description: "Dynamic price endpoint (opened programmatically)",
  });

  // ============================================================
  // Start server
  // ============================================================

  app.listen(PORT, () => {
    console.log(`\n${"━".repeat(44)}`);
    console.log(`  💎 TON x402 Payment Server`);
    console.log(`  🌐 Network: ${NETWORK}`);
    console.log(`  📍 Recipient: ${RECIPIENT.slice(0, 12)}...`);
    console.log(`  🚀 http://localhost:${PORT}`);
    console.log(`  🌍 Public: ${BASE_URL}`);
    console.log(`${"━".repeat(44)}`);
    console.log(`\n  Static endpoints:`);
    console.log(`    GET /api/price      — 0.001 TON`);
    console.log(`    GET /api/analytics  — 0.01  TON`);
    console.log(`    GET /api/premium    — 0.05  TON`);
    console.log(`\n  Dynamic endpoints:`);
    for (const [p, c] of endpointRoutes)
      console.log(`    GET ${p.padEnd(20)} — ${c.price} TON (${c.dataAction})`);
    console.log(`\n  Free endpoints:`);
    console.log(`    GET /               — server info\n`);
  });
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
