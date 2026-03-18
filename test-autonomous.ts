/**
 * TON Agent Kit — 5-Agent Autonomous Simulation
 *
 * 4 scripted agents + 1 fully LLM-driven agent run concurrently on testnet.
 * Agent D has 20% delivery failure → triggers natural disputes.
 * Agent E uses runLoop() with ALL 68 tools — the LLM decides everything.
 *
 * Run:   bun run test-autonomous.ts
 * Quick: DURATION_MINUTES=2 bun run test-autonomous.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { createServer, type IncomingMessage, type ServerResponse } from "http";

const envContent = readFileSync(".env", "utf-8");
const getEnv = (key: string) =>
  envContent.split("\n").find((l) => l.startsWith(key + "="))?.slice(key.length + 1).trim() || "";
process.env.TON_MNEMONIC = getEnv("TON_MNEMONIC");
process.env.OPENAI_API_KEY = getEnv("OPENAI_API_KEY");
process.env.OPENAI_BASE_URL = getEnv("OPENAI_BASE_URL");
process.env.AI_MODEL = getEnv("AI_MODEL");

import { TonAgentKit } from "./packages/core/src/agent";
import { KeypairWallet } from "./packages/core/src/wallet";
import TokenPlugin from "./packages/plugin-token/src/index";
import DefiPlugin from "./packages/plugin-defi/src/index";
import EscrowPlugin from "./packages/plugin-escrow/src/index";
import IdentityPlugin from "./packages/plugin-identity/src/index";
import AnalyticsPlugin from "./packages/plugin-analytics/src/index";
import PaymentsPlugin from "./packages/plugin-payments/src/index";
import AgentCommPlugin from "./packages/plugin-agent-comm/src/index";

// ══════════════════════════════════════════════════════════════
//  Globals
// ══════════════════════════════════════════════════════════════

let simulationStart = 0;
let allWalletAddresses: string[] = [];
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const shortAddr = (a: string) => a.slice(0, 8) + "..." + a.slice(-4);

function formatElapsed(): string {
  const s = Math.floor((Date.now() - simulationStart) / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ══════════════════════════════════════════════════════════════
//  Logger
// ══════════════════════════════════════════════════════════════

interface Interaction {
  timestamp: string;
  agent: string;
  wallet: string;
  action: string;
  params: any;
  result: any;
  success: boolean;
  durationMs: number;
  error: string | null;
  cycle: number;
  phase: string;
}

class AgentLogger {
  private interactions: Interaction[] = [];
  constructor(public readonly agentName: string, public readonly wallet: string) {}

  log(data: Omit<Interaction, "timestamp" | "agent" | "wallet">): void {
    this.interactions.push({ timestamp: new Date().toISOString(), agent: this.agentName, wallet: this.wallet, ...data });
  }
  getAll(): Interaction[] { return this.interactions; }
  save(path: string): void { writeFileSync(path, JSON.stringify(this.interactions, null, 2)); }

  stats() {
    const phases: Record<string, number> = {};
    const topActions: Record<string, number> = {};
    let success = 0;
    for (const i of this.interactions) {
      if (i.success) success++;
      phases[i.phase] = (phases[i.phase] || 0) + 1;
      topActions[i.action] = (topActions[i.action] || 0) + 1;
    }
    return { actions: this.interactions.length, success, errors: this.interactions.length - success, phases, topActions };
  }
}

// ══════════════════════════════════════════════════════════════
//  Safe Action Wrapper
// ══════════════════════════════════════════════════════════════

async function act(agent: TonAgentKit, logger: AgentLogger, action: string, params: any, cycle: number, phase: string): Promise<any> {
  const start = Date.now();
  try {
    const result = await agent.runAction(action, params);
    logger.log({ action, params, result, success: true, durationMs: Date.now() - start, error: null, cycle, phase });
    return result;
  } catch (err: any) {
    logger.log({ action, params, result: null, success: false, durationMs: Date.now() - start, error: err.message?.slice(0, 300), cycle, phase });
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
//  x402 Servers
// ══════════════════════════════════════════════════════════════

function makeServer(port: number, name: string, handler: (url: URL, paymentHash?: string) => any): ReturnType<typeof createServer> {
  const srv = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || "", `http://localhost:${port}`);
    res.setHeader("Content-Type", "application/json");
    if (url.pathname === "/health") { res.writeHead(200); res.end(JSON.stringify({ status: "ok", agent: name })); return; }
    try {
      const ph = req.headers["x-payment-hash"] as string | undefined;
      const result = handler(url, ph);
      if (result === null) { res.writeHead(404); res.end("{}"); return; }
      if (result.requirePayment && !ph) {
        res.writeHead(402);
        res.end(JSON.stringify({ payment: { amount: result.amount, recipient: result.recipient, protocol: "ton-x402-v1" } }));
        return;
      }
      res.writeHead(200); res.end(JSON.stringify(result.data || result));
    } catch { res.writeHead(500); res.end("{}"); }
  });
  srv.listen(port);
  return srv;
}

// ══════════════════════════════════════════════════════════════
//  Agent A — price-oracle (every 5 min)
// ══════════════════════════════════════════════════════════════

async function runAgentA(agent: TonAgentKit, logger: AgentLogger, endTime: number) {
  let cycle = 0;
  while (Date.now() < endTime) {
    cycle++;
    const cs = Date.now();
    console.log(`  [${formatElapsed()}] price-oracle  | cycle ${cycle}`);

    const bal = await act(agent, logger, "get_balance", {}, cycle, "monitoring");
    if (bal) console.log(`  [${formatElapsed()}] price-oracle  | balance=${bal.balance} TON`);

    // Discover price_feed intents, send offers
    const intents = await act(agent, logger, "discover_intents", { service: "price_feed" }, cycle, "discovery");
    if (intents?.intents?.length > 0) {
      for (const intent of intents.intents.slice(0, 3)) {
        if (intent.buyer !== agent.wallet.address.toRawString()) {
          await act(agent, logger, "send_offer", { intentIndex: intent.intentIndex, price: "0.005", endpoint: "http://localhost:3001/api/price", deliveryTime: 30 }, cycle, "offer");
          await delay(2000);
        }
      }
    }

    // Also check market_data intents
    const intents2 = await act(agent, logger, "discover_intents", { service: "market_data" }, cycle, "discovery");
    if (intents2?.intents?.length > 0) {
      for (const intent of intents2.intents.slice(0, 2)) {
        if (intent.buyer !== agent.wallet.address.toRawString()) {
          await act(agent, logger, "send_offer", { intentIndex: intent.intentIndex, price: "0.008", endpoint: "http://localhost:3001/api/prices", deliveryTime: 60 }, cycle, "offer");
          await delay(2000);
        }
      }
    }

    // Join disputes as arbiter
    const disputes = await act(agent, logger, "get_open_disputes", { limit: 5 }, cycle, "dispute");
    if (disputes?.disputes?.length > 0) {
      for (const d of disputes.disputes.slice(0, 2)) {
        await act(agent, logger, "join_dispute", { escrowId: d.escrowAddress, stake: "0.01" }, cycle, "dispute");
        await delay(3000);
      }
    }

    const wait = Math.max(0, Math.min(5 * 60000 - (Date.now() - cs), endTime - Date.now()));
    if (wait > 0) await delay(wait);
  }
}

// ══════════════════════════════════════════════════════════════
//  Agent B — analytics-provider (every 5 min)
// ══════════════════════════════════════════════════════════════

async function runAgentB(agent: TonAgentKit, logger: AgentLogger, endTime: number) {
  let cycle = 0;
  while (Date.now() < endTime) {
    cycle++;
    const cs = Date.now();
    console.log(`  [${formatElapsed()}] analytics     | cycle ${cycle}`);

    await act(agent, logger, "get_balance", {}, cycle, "monitoring");

    const intents = await act(agent, logger, "discover_intents", { service: "analytics" }, cycle, "discovery");
    if (intents?.intents?.length > 0) {
      for (const intent of intents.intents.slice(0, 3)) {
        if (intent.buyer !== agent.wallet.address.toRawString()) {
          await act(agent, logger, "send_offer", { intentIndex: intent.intentIndex, price: "0.01", endpoint: "http://localhost:3002/api/analytics", deliveryTime: 60 }, cycle, "offer");
          await delay(2000);
        }
      }
    }

    // Join disputes
    const disputes = await act(agent, logger, "get_open_disputes", { limit: 5 }, cycle, "dispute");
    if (disputes?.disputes?.length > 0) {
      for (const d of disputes.disputes.slice(0, 2)) {
        await act(agent, logger, "join_dispute", { escrowId: d.escrowAddress, stake: "0.01" }, cycle, "dispute");
        await delay(3000);
      }
    }

    // Every 3rd cycle: monitor all agents
    if (cycle % 3 === 0) {
      await act(agent, logger, "discover_agent", {}, cycle, "monitoring");
      if (allWalletAddresses.length > 0) {
        await act(agent, logger, "get_accounts_bulk", { addresses: allWalletAddresses }, cycle, "monitoring");
      }
    }

    const wait = Math.max(0, Math.min(5 * 60000 - (Date.now() - cs), endTime - Date.now()));
    if (wait > 0) await delay(wait);
  }
}

// ══════════════════════════════════════════════════════════════
//  Agent C — trader-bot (every 10 min)
// ══════════════════════════════════════════════════════════════

async function runAgentC(agent: TonAgentKit, logger: AgentLogger, endTime: number) {
  let cycle = 0;
  while (Date.now() < endTime) {
    cycle++;
    const cs = Date.now();
    console.log(`  [${formatElapsed()}] trader-bot    | cycle ${cycle}`);

    await act(agent, logger, "get_balance", {}, cycle, "monitoring");

    // Broadcast intents for services
    const intentP = await act(agent, logger, "broadcast_intent", { service: "price_feed", budget: "0.01", deadlineMinutes: 8, requirements: "Real-time TON/USDT" }, cycle, "discovery");
    const intentA = await act(agent, logger, "broadcast_intent", { service: "analytics", budget: "0.02", deadlineMinutes: 8, requirements: "Wallet analysis" }, cycle, "discovery");

    // Wait 1 min for offers
    await delay(Math.min(60000, Math.max(0, endTime - Date.now())));

    // Check offers on price_feed intent
    if (intentP?.intentIndex >= 0) {
      const offers = await act(agent, logger, "get_offers", { intentIndex: intentP.intentIndex }, cycle, "offer");
      if (offers?.offers?.length > 0) {
        const best = offers.offers.sort((a: any, b: any) => Number(a.price) - Number(b.price))[0];
        const deal = await act(agent, logger, "accept_offer", { offerIndex: best.index }, cycle, "settlement");
        if (deal?.accepted) {
          await delay(15000);
          await act(agent, logger, "settle_deal", { intentIndex: intentP.intentIndex, rating: 85 + Math.floor(Math.random() * 15) }, cycle, "settlement");
        }
      }
    }

    // Check offers on analytics intent
    if (intentA?.intentIndex >= 0) {
      const offers = await act(agent, logger, "get_offers", { intentIndex: intentA.intentIndex }, cycle, "offer");
      if (offers?.offers?.length > 0) {
        const best = offers.offers.sort((a: any, b: any) => Number(a.price) - Number(b.price))[0];
        await act(agent, logger, "accept_offer", { offerIndex: best.index }, cycle, "settlement");
      }
    }

    // Join disputes on other deals
    const disputes = await act(agent, logger, "get_open_disputes", { limit: 5 }, cycle, "dispute");
    if (disputes?.disputes?.length > 0) {
      for (const d of disputes.disputes.slice(0, 2)) {
        await act(agent, logger, "join_dispute", { escrowId: d.escrowAddress, stake: "0.01" }, cycle, "dispute");
        await delay(3000);
      }
    }

    // Bulk query every 3rd cycle
    if (cycle % 3 === 0 && allWalletAddresses.length > 0) {
      await act(agent, logger, "get_accounts_bulk", { addresses: allWalletAddresses }, cycle, "monitoring");
    }

    const wait = Math.max(0, Math.min(10 * 60000 - (Date.now() - cs), endTime - Date.now()));
    if (wait > 0) await delay(wait);
  }
}

// ══════════════════════════════════════════════════════════════
//  Agent D — deal-maker (every 3 min, 20% fail rate)
// ══════════════════════════════════════════════════════════════

async function runAgentD(agent: TonAgentKit, logger: AgentLogger, endTime: number) {
  let cycle = 0;
  while (Date.now() < endTime) {
    cycle++;
    const cs = Date.now();
    console.log(`  [${formatElapsed()}] deal-maker    | cycle ${cycle}`);

    await act(agent, logger, "get_balance", {}, cycle, "monitoring");

    // Browse ALL open intents, offer on everything
    const allIntents = await act(agent, logger, "discover_intents", {}, cycle, "discovery");
    if (allIntents?.intents?.length > 0) {
      for (const intent of allIntents.intents.slice(0, 5)) {
        if (intent.buyer !== agent.wallet.address.toRawString()) {
          await act(agent, logger, "send_offer", { intentIndex: intent.intentIndex, price: "0.008", endpoint: "http://localhost:3004/api/deals", deliveryTime: 120 }, cycle, "offer");
          await delay(2000);
        }
      }
    }

    // Join EVERY open dispute (main revenue source)
    const disputes = await act(agent, logger, "get_open_disputes", { limit: 10 }, cycle, "dispute");
    if (disputes?.disputes?.length > 0) {
      for (const d of disputes.disputes) {
        await act(agent, logger, "join_dispute", { escrowId: d.escrowAddress, stake: "0.01" }, cycle, "dispute");
        await delay(3000);
        // Always vote release (biased toward sellers)
        await act(agent, logger, "vote_release", { escrowId: d.escrowAddress }, cycle, "dispute");
        await delay(3000);
      }
    }

    const wait = Math.max(0, Math.min(3 * 60000 - (Date.now() - cs), endTime - Date.now()));
    if (wait > 0) await delay(wait);
  }
}

// ══════════════════════════════════════════════════════════════
//  Agent E — autonomous (every 5 min, LLM decides everything)
// ══════════════════════════════════════════════════════════════

async function runAgentE(agent: TonAgentKit, logger: AgentLogger, endTime: number) {
  let cycle = 0;
  const walletAddress = agent.wallet.address.toRawString();

  while (Date.now() < endTime) {
    cycle++;
    const cs = Date.now();
    console.log(`  [${formatElapsed()}] autonomous    | cycle ${cycle} (LLM deciding...)`);

    try {
      const result = await agent.runLoop(
        `You are an autonomous AI agent on the TON blockchain network.
You have a wallet with real TON. You can do anything.

Other agents running right now:
- price-oracle (port 3001): sells price data via x402
- analytics-provider (port 3002): sells wallet analytics via x402
- trader-bot (port 3003): buys services, creates deals
- deal-maker (port 3004): brokers deals, joins disputes (20% fail rate)

You have access to ALL 68 blockchain actions. No restrictions.
Register yourself, offer services, buy services, join disputes, vote,
clean up agents, send TON, check prices, bulk query wallets — anything.

Your wallet: ${walletAddress}
Network: testnet | Cycle: ${cycle}

Observe the network state. Then act however you want. Do 2-5 meaningful actions.`,
        {
          model: process.env.AI_MODEL || "gpt-4o",
          apiKey: process.env.OPENAI_API_KEY || "",
          baseURL: process.env.OPENAI_BASE_URL,
          maxIterations: 15,
          verbose: false,
          onActionStart: (name: string, _params: any) => {
            console.log(`  [${formatElapsed()}] autonomous    | -> ${name}`);
          },
          onActionResult: (name: string, params: any, result: any) => {
            logger.log({ action: name, params, result, success: true, durationMs: 0, error: null, cycle, phase: "autonomous" });
          },
        },
      );

      logger.log({
        action: "runLoop_summary", params: { cycle },
        result: { summary: result?.summary?.slice(0, 500), steps: result?.steps?.length },
        success: true, durationMs: Date.now() - cs, error: null, cycle, phase: "autonomous",
      });
      console.log(`  [${formatElapsed()}] autonomous    | ${result?.steps?.length || 0} actions | ${(result?.summary || "").slice(0, 80)}`);

    } catch (err: any) {
      logger.log({
        action: "runLoop_error", params: { cycle }, result: null,
        success: false, durationMs: Date.now() - cs, error: err.message?.slice(0, 300), cycle, phase: "autonomous",
      });
      console.log(`  [${formatElapsed()}] autonomous    | ERROR: ${err.message?.slice(0, 80)}`);
    }

    const wait = Math.max(0, Math.min(5 * 60000 - (Date.now() - cs), endTime - Date.now()));
    if (wait > 0) await delay(wait);
  }
}

// ══════════════════════════════════════════════════════════════
//  Report
// ══════════════════════════════════════════════════════════════

function countBy(arr: any[], key: string): Record<string, number> {
  const r: Record<string, number> = {};
  for (const item of arr) r[item[key]] = (r[item[key]] || 0) + 1;
  return r;
}

function generateReport(loggers: AgentLogger[]) {
  const all: Interaction[] = [];
  const agentStats: Record<string, any> = {};
  for (const l of loggers) { all.push(...l.getAll()); agentStats[l.agentName] = { ...l.stats(), wallet: l.wallet }; }
  all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const report = {
    simulation: { startedAt: new Date(simulationStart).toISOString(), endedAt: new Date().toISOString(), durationMinutes: Math.round((Date.now() - simulationStart) / 60000), totalInteractions: all.length, agents: 5 },
    agents: agentStats,
    totals: { actions: all.length, success: all.filter((i) => i.success).length, errors: all.filter((i) => !i.success).length, successRate: all.length > 0 ? ((all.filter((i) => i.success).length / all.length) * 100).toFixed(1) + "%" : "0%", byPhase: countBy(all, "phase"), byAction: countBy(all, "action"), byAgent: countBy(all, "agent") },
    autonomousDecisions: all.filter((i) => i.agent === "autonomous" && i.action === "runLoop_summary").map((i) => ({ cycle: i.cycle, steps: i.result?.steps, summary: i.result?.summary })),
  };

  writeFileSync("logs/merged-report.json", JSON.stringify(report, null, 2));

  console.log(`\n${"=".repeat(60)}\n  Simulation Report\n${"=".repeat(60)}\n`);
  console.log(`  Duration: ${report.simulation.durationMinutes} min | Interactions: ${report.totals.actions} | Success: ${report.totals.successRate}\n`);
  console.log(`  Agent              Actions  Success  Errors`);
  console.log(`  ${"─".repeat(50)}`);
  for (const [name, s] of Object.entries(agentStats) as any) {
    console.log(`  ${name.padEnd(18)} ${String(s.actions).padStart(7)} ${String(s.success).padStart(8)} ${String(s.errors).padStart(7)}`);
  }
  const total = report.totals;
  console.log(`  ${"─".repeat(50)}`);
  console.log(`  ${"TOTAL".padEnd(18)} ${String(total.actions).padStart(7)} ${String(total.success).padStart(8)} ${String(total.errors).padStart(7)}`);

  if (report.autonomousDecisions.length > 0) {
    console.log(`\n  Autonomous Agent Decisions:`);
    for (const d of report.autonomousDecisions) console.log(`    Cycle ${d.cycle}: ${d.steps || 0} actions | ${(d.summary || "").slice(0, 80)}`);
  }
  console.log(`\n  Logs: logs/*.json\n`);
}

// ══════════════════════════════════════════════════════════════
//  Main
// ══════════════════════════════════════════════════════════════

async function main() {
  const durationMinutes = parseInt(process.env.DURATION_MINUTES || "60", 10);
  simulationStart = Date.now();
  const endTime = simulationStart + durationMinutes * 60 * 1000;
  const RPC = "https://testnet-v4.tonhubapi.com";

  console.log(`\n${"=".repeat(60)}\n  5-Agent Autonomous Simulation | ${durationMinutes} min\n${"=".repeat(60)}\n`);

  // Load wallets
  const mnA = getEnv("TON_MNEMONIC");
  const mnB = getEnv("TON_MNEMONIC_AGENT_B");
  const mnC = getEnv("TON_MNEMONIC_ARBITER1");
  const mnD = getEnv("TON_MNEMONIC_ARBITER2");
  const mnE = getEnv("TON_MNEMONIC_ARBITER3");

  if (!mnA || !mnB || !mnC || !mnD || !mnE) { console.error("Need all 5 wallet mnemonics in .env"); process.exit(1); }

  const wA = await KeypairWallet.fromMnemonic(mnA.split(" "), { version: "V5R1", network: "testnet" });
  const wB = await KeypairWallet.fromMnemonic(mnB.split(" "), { version: "V5R1", network: "testnet" });
  const wC = await KeypairWallet.fromMnemonic(mnC.split(" "), { version: "V5R1", network: "testnet" });
  const wD = await KeypairWallet.fromMnemonic(mnD.split(" "), { version: "V5R1", network: "testnet" });
  const wE = await KeypairWallet.fromMnemonic(mnE.split(" "), { version: "V5R1", network: "testnet" });

  allWalletAddresses = [wA, wB, wC, wD, wE].map((w) => w.address.toRawString());

  const makeAgent = (w: KeypairWallet) =>
    new TonAgentKit(w, RPC, {}, "testnet")
      .use(TokenPlugin).use(DefiPlugin).use(EscrowPlugin)
      .use(IdentityPlugin).use(AnalyticsPlugin).use(PaymentsPlugin).use(AgentCommPlugin);

  const agentA = makeAgent(wA);
  const agentB = makeAgent(wB);
  const agentC = makeAgent(wC);
  const agentD = makeAgent(wD);
  const agentE = makeAgent(wE);

  const logA = new AgentLogger("price-oracle", allWalletAddresses[0]);
  const logB = new AgentLogger("analytics", allWalletAddresses[1]);
  const logC = new AgentLogger("trader-bot", allWalletAddresses[2]);
  const logD = new AgentLogger("deal-maker", allWalletAddresses[3]);
  const logE = new AgentLogger("autonomous", allWalletAddresses[4]);

  console.log(`  A: price-oracle    | ${shortAddr(allWalletAddresses[0])} | :3001 | scripted  | arbiter`);
  console.log(`  B: analytics-prov  | ${shortAddr(allWalletAddresses[1])} | :3002 | scripted  | arbiter`);
  console.log(`  C: trader-bot      | ${shortAddr(allWalletAddresses[2])} | :3003 | scripted  | arbiter`);
  console.log(`  D: deal-maker      | ${shortAddr(allWalletAddresses[3])} | :3004 | scripted  | arbiter (20% fail)`);
  console.log(`  E: autonomous      | ${shortAddr(allWalletAddresses[4])} | :3005 | LLM-driven| unrestricted`);

  // Start x402 servers
  const addrA = allWalletAddresses[0];
  const srvA = makeServer(3001, "price-oracle", (url, ph) => {
    if (url.pathname === "/api/price") {
      if (!ph) return { requirePayment: true, amount: "0.005", recipient: addrA };
      return { data: { token: "TON", price: 3.85, timestamp: Date.now(), source: "price-oracle" } };
    }
    if (url.pathname === "/api/prices") {
      if (!ph) return { requirePayment: true, amount: "0.01", recipient: addrA };
      return { data: { TON: 3.85, BTC: 67000, ETH: 3500, timestamp: Date.now() } };
    }
    return null;
  });

  const srvB = makeServer(3002, "analytics", (url, ph) => {
    if (url.pathname === "/api/analytics") {
      if (!ph) return { requirePayment: true, amount: "0.01", recipient: allWalletAddresses[1] };
      return { data: { analysis: "active trader", riskScore: 0.3, txCount: 42 } };
    }
    return null;
  });

  const srvC = makeServer(3003, "trader-bot", (url, ph) => {
    if (url.pathname === "/api/signals") {
      if (!ph) return { requirePayment: true, amount: "0.02", recipient: allWalletAddresses[2] };
      return { data: { signal: "buy", confidence: 0.7, token: "TON" } };
    }
    return null;
  });

  // Agent D: 20% failure rate
  const srvD = makeServer(3004, "deal-maker", (url, ph) => {
    if (url.pathname === "/api/deals") {
      if (!ph) return { requirePayment: true, amount: "0.005", recipient: allWalletAddresses[3] };
      if (Math.random() < 0.2) return { data: { error: "Service temporarily unavailable" } }; // 20% fail
      return { data: { deals: [], count: 0, timestamp: Date.now() } };
    }
    return null;
  });

  const srvE = makeServer(3005, "autonomous", (url) => {
    if (url.pathname === "/api/health") return { data: { status: "ok", agent: "autonomous" } };
    return null;
  });

  // Register agents A-D on-chain
  console.log(`\n  Registering agents A-D on-chain...\n`);
  await act(agentA, logA, "register_agent", { name: "price-oracle", capabilities: ["price_feed", "market_data"] }, 0, "setup");
  await delay(3000);
  await act(agentB, logB, "register_agent", { name: "analytics-provider", capabilities: ["analytics", "wallet_analysis"] }, 0, "setup");
  await delay(3000);
  await act(agentC, logC, "register_agent", { name: "trader-bot", capabilities: ["trading", "defi"] }, 0, "setup");
  await delay(3000);
  await act(agentD, logD, "register_agent", { name: "deal-maker", capabilities: ["escrow_management", "negotiation"] }, 0, "setup");

  if (!existsSync("logs")) mkdirSync("logs");

  console.log(`\n  4 agents registered. Agent E will register itself via LLM.`);
  console.log(`  Starting autonomous loops...\n  ${"━".repeat(55)}\n`);

  // Run all 5 concurrently
  await Promise.allSettled([
    runAgentA(agentA, logA, endTime),
    runAgentB(agentB, logB, endTime),
    runAgentC(agentC, logC, endTime),
    runAgentD(agentD, logD, endTime),
    runAgentE(agentE, logE, endTime),
  ]);

  console.log(`\n  ${"━".repeat(55)}`);

  // Save logs
  logA.save("logs/agent-a-price-oracle.json");
  logB.save("logs/agent-b-analytics-provider.json");
  logC.save("logs/agent-c-trader-bot.json");
  logD.save("logs/agent-d-deal-maker.json");
  logE.save("logs/agent-e-autonomous.json");

  // Shutdown servers
  srvA.close(); srvB.close(); srvC.close(); srvD.close(); srvE.close();

  // Report
  generateReport([logA, logB, logC, logD, logE]);
  process.exit(0);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
