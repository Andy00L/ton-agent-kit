#!/usr/bin/env bun
/**
 * TON Agent Kit . Cloud Agent
 *
 * Drop this file + a .env on any machine. Run it. It handles everything.
 *
 *   bun run cloud-agent.ts
 *
 * First run: installs all dependencies automatically.
 * Runs an autonomous agent forever + dynamic x402 data server.
 * The LLM decides when to open/close paid endpoints.
 * Logs to logs/history.json (survives restarts).
 */

import { execSync, spawnSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";

// ══════════════════════════════════════════════════════════════
//  Step 1: Make sure bun is available
// ══════════════════════════════════════════════════════════════

try {
  execSync("bun --version", { stdio: "ignore" });
} catch {
  console.log("  Bun not found. Installing...\n");
  try {
    execSync("curl -fsSL https://bun.sh/install | bash", { stdio: "inherit" });
    console.log("\n  Bun installed. Restart this script.\n");
    process.exit(0);
  } catch {
    console.error("  Could not install bun. Install manually:");
    console.error("  curl -fsSL https://bun.sh/install | bash");
    process.exit(1);
  }
}

// ══════════════════════════════════════════════════════════════
//  Step 2: Install packages if missing
// ══════════════════════════════════════════════════════════════

if (!existsSync("node_modules/@ton-agent-kit")) {
  console.log("  Installing @ton-agent-kit packages...\n");
  execSync([
    "bun add",
    "@ton-agent-kit/core",
    "@ton-agent-kit/plugin-token",
    "@ton-agent-kit/plugin-defi",
    "@ton-agent-kit/plugin-dns",
    "@ton-agent-kit/plugin-nft",
    "@ton-agent-kit/plugin-staking",
    "@ton-agent-kit/plugin-analytics",
    "@ton-agent-kit/plugin-escrow",
    "@ton-agent-kit/plugin-identity",
    "@ton-agent-kit/plugin-payments",
    "@ton-agent-kit/plugin-agent-comm",
    "@ton-agent-kit/x402-middleware",
    "express",
    "zod",
    "openai",
  ].join(" "), { stdio: "inherit" });

  console.log("\n  Installed. Restarting...\n");
  const r = spawnSync("bun", ["run", process.argv[1]], { stdio: "inherit" });
  process.exit(r.status || 0);
}

// ══════════════════════════════════════════════════════════════
//  Step 3: Imports
// ══════════════════════════════════════════════════════════════

const { TonAgentKit, KeypairWallet, definePlugin, defineAction } = await import("@ton-agent-kit/core");
const { default: TokenPlugin } = await import("@ton-agent-kit/plugin-token");
const { default: DefiPlugin } = await import("@ton-agent-kit/plugin-defi");
const { default: DnsPlugin } = await import("@ton-agent-kit/plugin-dns");
const { default: NftPlugin } = await import("@ton-agent-kit/plugin-nft");
const { default: StakingPlugin } = await import("@ton-agent-kit/plugin-staking");
const { default: AnalyticsPlugin } = await import("@ton-agent-kit/plugin-analytics");
const { default: EscrowPlugin } = await import("@ton-agent-kit/plugin-escrow");
const { default: IdentityPlugin } = await import("@ton-agent-kit/plugin-identity");
const { default: PaymentsPlugin } = await import("@ton-agent-kit/plugin-payments");
const { default: AgentCommPlugin } = await import("@ton-agent-kit/plugin-agent-comm");
const { tonPaywall, MemoryReplayStore } = await import("@ton-agent-kit/x402-middleware");
const { default: express } = await import("express");
const { z } = await import("zod");

// ══════════════════════════════════════════════════════════════
//  .env
// ══════════════════════════════════════════════════════════════

let envContent = "";
try {
  envContent = readFileSync(".env", "utf-8");
} catch {
  console.error("\n  No .env file. Create one:\n");
  console.error("  TON_MNEMONIC=word1 word2 ... word24");
  console.error("  OPENAI_API_KEY=sk-...");
  process.exit(1);
}

function env(key: string, fallback = ""): string {
  if (process.env[key]) return process.env[key]!;
  const line = envContent.split("\n").find((l) => l.startsWith(key + "="));
  if (!line) return fallback;
  return line.slice(key.length + 1).trim();
}

const MNEMONIC    = env("TON_MNEMONIC");
const NETWORK     = env("TON_NETWORK", "testnet") as "testnet" | "mainnet";
const OPENAI_KEY  = env("OPENAI_API_KEY");
const OPENAI_BASE = env("OPENAI_BASE_URL") || undefined;
const AI_MODEL    = env("AI_MODEL", "gpt-4o");
const AGENT_NAME  = env("AGENT_NAME", `agent-${Date.now().toString(36)}`);
const AGENT_CAPS  = env("AGENT_CAPABILITIES", "general");
const COOLDOWN    = parseInt(env("COOLDOWN_SECONDS", "30"), 10) * 1000;
const X402_PORT   = parseInt(env("X402_PORT", "4000"), 10);
const RPC_URL     = NETWORK === "mainnet" ? "https://mainnet-v4.tonhubapi.com" : "https://testnet-v4.tonhubapi.com";

if (!MNEMONIC)   { console.error("  TON_MNEMONIC required in .env"); process.exit(1); }
if (!OPENAI_KEY) { console.error("  OPENAI_API_KEY required in .env"); process.exit(1); }

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ══════════════════════════════════════════════════════════════
//  Logger
// ══════════════════════════════════════════════════════════════

interface LogEntry {
  timestamp: string;
  agent: string;
  wallet: string;
  round: number;
  action: string;
  params: any;
  result: any;
  success: boolean;
  error: string | null;
}

if (!existsSync("logs")) mkdirSync("logs", { recursive: true });
const LOG = "logs/history.json";

function loadLog(): LogEntry[] {
  try { return JSON.parse(readFileSync(LOG, "utf-8")); }
  catch { return []; }
}

function saveEntries(entries: LogEntry[]): void {
  const all = loadLog();
  all.push(...entries);
  writeFileSync(LOG, JSON.stringify(all, null, 2));
}

// ══════════════════════════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════════════════════════

function clock(): string {
  const n = new Date();
  return [n.getHours(), n.getMinutes(), n.getSeconds()].map((v) => String(v).padStart(2, "0")).join(":");
}

function short(a: string): string {
  return a && a.length > 16 ? `${a.slice(0, 8)}...${a.slice(-4)}` : a || "?";
}

// ══════════════════════════════════════════════════════════════
//  Dynamic x402 Endpoint Registry
// ══════════════════════════════════════════════════════════════

interface EndpointConfig {
  price: string;
  dataAction: string;
  dataParams: Record<string, string>;
  description: string;
  createdAt: string;
  served: number;
}

const endpointRoutes = new Map<string, EndpointConfig>();

// ══════════════════════════════════════════════════════════════
//  x402 Endpoint Plugin — 3 actions the LLM can call
// ══════════════════════════════════════════════════════════════

const EndpointPlugin = definePlugin({
  name: "x402-endpoints",
  actions: [
    defineAction({
      name: "open_x402_endpoint",
      description:
        "Open a paid x402 endpoint on your HTTP server. Other agents pay TON to access it. " +
        "The endpoint calls the specified SDK action to fetch LIVE blockchain data when accessed. " +
        "Examples: dataAction='get_price' serves real token prices, dataAction='get_wallet_info' serves wallet analytics, " +
        "dataAction='discover_intents' serves open intents. You can open multiple endpoints simultaneously. " +
        "Query params from the buyer are merged into dataParams automatically.",
      schema: z.object({
        path: z.string().describe("URL path starting with / (e.g. '/api/price', '/api/analytics', '/api/intents')"),
        price: z.string().describe("Price in TON per request (e.g. '0.005')"),
        dataAction: z.string().describe("SDK action name to call for data (e.g. 'get_price', 'get_balance', 'get_wallet_info', 'get_transaction_history', 'discover_intents', 'discover_agent')"),
        dataParams: z.string().optional().describe('Default params as JSON string, e.g. \'{"tokenAddress":"EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs"}\''),
        description: z.string().optional().describe("Human-readable description of what this endpoint provides"),
      }),
      handler: async (_agent: any, params: any) => {
        const path = params.path.startsWith("/") ? params.path : "/" + params.path;
        endpointRoutes.set(path, {
          price: params.price,
          dataAction: params.dataAction,
          dataParams: params.dataParams ? (typeof params.dataParams === "string" ? JSON.parse(params.dataParams) : params.dataParams) : {},
          description: params.description || `${params.dataAction} data service`,
          createdAt: new Date().toISOString(),
          served: 0,
        });
        console.log(`    [x402] Opened ${path} → ${params.dataAction} @ ${params.price} TON`);
        return {
          success: true,
          path,
          url: `http://localhost:${X402_PORT}${path}`,
          price: params.price,
          dataAction: params.dataAction,
          message: `Endpoint live. Other agents can pay ${params.price} TON to access ${path}`,
        };
      },
    }),

    defineAction({
      name: "close_x402_endpoint",
      description:
        "Close a paid x402 endpoint. Use after a deal is settled, service is no longer needed, " +
        "or you want to stop serving that data.",
      schema: z.object({
        path: z.string().describe("URL path to close (e.g. '/api/price')"),
      }),
      handler: async (_agent: any, params: any) => {
        const path = params.path.startsWith("/") ? params.path : "/" + params.path;
        const config = endpointRoutes.get(path);
        const existed = endpointRoutes.delete(path);
        console.log(`    [x402] Closed ${path} (existed: ${existed}, served: ${config?.served || 0})`);
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
      description:
        "List all your currently open x402 endpoints with their configuration, prices, and request counts.",
      schema: z.object({}),
      handler: async () => {
        const endpoints: any[] = [];
        for (const [path, config] of endpointRoutes) {
          endpoints.push({
            path,
            url: `http://localhost:${X402_PORT}${path}`,
            price: config.price,
            dataAction: config.dataAction,
            dataParams: config.dataParams,
            description: config.description,
            createdAt: config.createdAt,
            served: config.served,
          });
        }
        return {
          endpoints,
          count: endpoints.length,
          serverPort: X402_PORT,
        };
      },
    }),
  ],
});

// ══════════════════════════════════════════════════════════════
//  Agent
// ══════════════════════════════════════════════════════════════

async function main() {
  const wallet = await KeypairWallet.fromMnemonic(MNEMONIC.split(" "), {
    version: "V5R1",
    network: NETWORK,
  });

  const address      = wallet.address.toRawString();
  const friendlyAddr = wallet.address.toString({ testOnly: NETWORK === "testnet", bounceable: false });

  const agent = new TonAgentKit(wallet, RPC_URL, {}, NETWORK)
    .use(TokenPlugin).use(DefiPlugin).use(DnsPlugin).use(NftPlugin)
    .use(StakingPlugin).use(AnalyticsPlugin).use(EscrowPlugin)
    .use(IdentityPlugin).use(PaymentsPlugin).use(AgentCommPlugin)
    .use(EndpointPlugin);

  let bal = "?";
  try { bal = parseFloat((await agent.runAction("get_balance", {})).balance).toFixed(4); } catch {}

  // ── Start x402 dynamic server (0 routes — LLM opens them) ──
  const app = express();
  const replayStore = new MemoryReplayStore();

  // Free: server info + live endpoint list
  app.get("/", (_req: any, res: any) => {
    const endpoints: any[] = [];
    for (const [path, config] of endpointRoutes) {
      endpoints.push({ path, price: `${config.price} TON`, description: config.description, served: config.served });
    }
    res.json({
      agent: AGENT_NAME,
      wallet: friendlyAddr,
      network: NETWORK,
      activeEndpoints: endpoints,
      totalEndpoints: endpoints.length,
    });
  });

  // Dynamic catch-all: routes requests to LLM-created endpoints
  app.use(async (req: any, res: any, next: any) => {
    const route = endpointRoutes.get(req.path);
    if (!route) return next();

    const paywall = tonPaywall({
      amount: route.price,
      recipient: address,
      network: NETWORK,
      description: route.description,
      replayStore,
    });

    paywall(req, res, async () => {
      try {
        const mergedParams: Record<string, any> = { ...route.dataParams };
        for (const [k, v] of Object.entries(req.query)) {
          if (typeof v === "string" && v.length > 0) mergedParams[k] = v;
        }

        const data = await agent.runAction(route.dataAction, mergedParams);

        const response = {
          source: AGENT_NAME,
          fetchedAt: new Date().toISOString(),
          endpoint: req.path,
          dataAction: route.dataAction,
          ...data,
        };

        route.served++;

        saveEntries([{
          timestamp: new Date().toISOString(), agent: AGENT_NAME, wallet: address, round: -1,
          action: "x402_served", params: { path: req.path, query: req.query, dataAction: route.dataAction },
          result: { served: route.served, price: route.price },
          success: true, error: null,
        }]);

        console.log(`    [x402] ${req.path} served (${route.served}x) → ${route.dataAction}`);
        res.json(response);
      } catch (err: any) {
        res.status(500).json({ error: err.message, source: AGENT_NAME });
      }
    });
  });

  app.use((_req: any, res: any) => {
    const paths = Array.from(endpointRoutes.keys());
    res.status(404).json({
      error: "No endpoint at this path",
      availableEndpoints: paths.length > 0 ? paths : "No endpoints open yet.",
      info: "GET / for agent info",
    });
  });

  const server = app.listen(X402_PORT);

  // ── Banner ──
  console.log(`\n${"━".repeat(42)}`);
  console.log(`  TON Agent Kit . Cloud Agent\n`);
  console.log(`  Agent:    ${AGENT_NAME}`);
  console.log(`  Wallet:   ${short(friendlyAddr)}`);
  console.log(`  Balance:  ${bal} TON`);
  console.log(`  Network:  ${NETWORK}`);
  console.log(`  Model:    ${AI_MODEL}`);
  console.log(`  Actions:  ${agent.actionCount}`);
  console.log(`  Cooldown: ${COOLDOWN / 1000}s`);
  console.log(`  x402:     http://localhost:${X402_PORT}`);
  console.log(`  Logs:     ${LOG}`);
  console.log(`\n  Ctrl+C to stop.`);
  console.log(`${"━".repeat(42)}\n`);

  // ── Resume state ──
  const prev = loadLog();
  let round = prev.length > 0 ? Math.max(...prev.map((e) => e.round)) + 1 : 1;
  const startRound = round;
  if (prev.length > 0) console.log(`  Resuming from round ${round} (${prev.length} entries)\n`);

  let lastActions: string[] = [];

  // ── Build prompt ──
  function prompt(): string {
    const ctx = lastActions.length > 0
      ? `\nYour recent actions:\n${lastActions.map((a) => `  ${a}`).join("\n")}`
      : "\nFirst round. Explore the network and decide what to do.";

    const epList: string[] = [];
    for (const [path, config] of endpointRoutes) {
      epList.push(`  ${path} → ${config.dataAction} @ ${config.price} TON (served ${config.served}x)`);
    }
    const epSection = epList.length > 0
      ? `\nYour active x402 endpoints:\n${epList.join("\n")}`
      : "\nYou have no x402 endpoints open. Use open_x402_endpoint to start selling data.";

    return `You are "${AGENT_NAME}", an autonomous AI agent on TON ${NETWORK}.
You have a wallet with real TON and an HTTP server on port ${X402_PORT}.

IMPORTANT RULES:
- Before registering an agent, ALWAYS call discover_agent first to check if it already exists. Do not create duplicates.
- Before broadcasting an intent, call discover_intents to see if a similar one already exists.
- Before opening an x402 endpoint, call list_x402_endpoints to see what you already have open.

SELLING DATA via x402:
You can open paid endpoints that serve REAL on-chain data to other agents.
- open_x402_endpoint: creates a new paid endpoint (you pick the path, price, and which SDK action provides the data)
- close_x402_endpoint: shuts down an endpoint (after deal settled, or no longer needed)
- list_x402_endpoints: see what you're currently serving
When another agent pays, the endpoint calls the real SDK action and returns live blockchain data. No fake data.
Buyers can pass query params like ?address=0:abc... which override your default dataParams.

Example: open_x402_endpoint({ path: "/api/price", price: "0.005", dataAction: "get_price", dataParams: "{\"tokenAddress\":\"EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs\"}", description: "Real-time USDT price" })
Example: open_x402_endpoint({ path: "/api/wallet", price: "0.01", dataAction: "get_wallet_info", description: "Wallet analytics" })

AGENT ECONOMY:
- discover_agent: find other agents by capability
- register_agent: register yourself (CHECK FIRST if you already exist)
- broadcast_intent: request a service from the network
- discover_intents: find open service requests to fulfill
- send_offer: propose to fulfill an intent (include your x402 endpoint URL)
- accept_offer: accept someone's offer on your intent
- settle_deal: finalize a deal with a rating
- create_escrow / deposit_to_escrow / release_escrow: trustless payments
- open_dispute / join_dispute / vote_release / vote_refund: dispute resolution

Identity: ${AGENT_NAME} | Caps: ${AGENT_CAPS}
Wallet: ${friendlyAddr} | Network: ${NETWORK} | Round: ${round}
${epSection}
${ctx}

${agent.actionCount} actions available. Do 3-8 actions this round.
Adapt to what's happening on the network. Keep at least 1 TON reserve.
Open endpoints when you want to sell data. Close them when done.`;
  }

  // ── Shutdown ──
  const quit = () => {
    server.close();
    const epCount = endpointRoutes.size;
    console.log(`\n  [${clock()}] Shutting down. ${round - startRound} rounds. ${loadLog().length} entries. ${epCount} endpoints closed. Saved: ${LOG}\n`);
    process.exit(0);
  };
  process.on("SIGINT", quit);
  process.on("SIGTERM", quit);

  // ── Forever ────────────────────────────────────────────

  while (true) {
    const t0 = Date.now();
    const epCount = endpointRoutes.size;
    console.log(`  [${clock()}] ${AGENT_NAME} | round ${round} | ${epCount} endpoints`);

    try {
      const result = await agent.runLoop(prompt(), {
        model: AI_MODEL,
        apiKey: OPENAI_KEY,
        baseURL: OPENAI_BASE,
        maxIterations: 15,
        onActionStart: (name: string) => console.log(`    -> ${name}`),
      });

      const entries: LogEntry[] = [];

      if (result?.steps?.length > 0) {
        for (const s of result.steps) {
          entries.push({
            timestamp: new Date().toISOString(), agent: AGENT_NAME, wallet: address, round,
            action: s.action || "unknown", params: s.params || {}, result: s.result || null,
            success: true, error: null,
          });
        }
        lastActions = result.steps.slice(-5).map((s: any) =>
          `${s.action}(${JSON.stringify(s.params || {}).slice(0, 60)}) -> ${JSON.stringify(s.result || {}).slice(0, 80)}`
        );
      }

      entries.push({
        timestamp: new Date().toISOString(), agent: AGENT_NAME, wallet: address, round,
        action: "round_summary", params: { round, endpoints: endpointRoutes.size },
        result: { steps: result?.steps?.length || 0, summary: (result?.summary || "").slice(0, 500), ms: Date.now() - t0 },
        success: true, error: null,
      });

      saveEntries(entries);
      console.log(`  [${clock()}] ${AGENT_NAME} | ${result?.steps?.length || 0} actions | ${((Date.now() - t0) / 1000).toFixed(1)}s | ${endpointRoutes.size} ep | ${(result?.summary || "").slice(0, 80)}\n`);
      round++;

    } catch (err: any) {
      const msg = (err.message || "Unknown").slice(0, 300);
      console.error(`  [${clock()}] ${AGENT_NAME} | ERROR: ${msg.slice(0, 80)}`);
      saveEntries([{
        timestamp: new Date().toISOString(), agent: AGENT_NAME, wallet: address, round,
        action: "crash", params: {}, result: null, success: false, error: msg,
      }]);
      console.log(`  Restarting in 60s...\n`);
      await delay(60000);
      round++;
      continue;
    }

    await delay(COOLDOWN);
  }
}

main().catch((e) => { console.error(`Fatal: ${e.message}`); process.exit(1); });
