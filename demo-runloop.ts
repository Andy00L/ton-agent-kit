/**
 * TON Agent Kit — Autonomous Agent Runtime Demo
 *
 * Runs 5 demo scenarios in sequence, each fully autonomous.
 * The agent receives a natural-language goal, plans which actions to call,
 * executes them, and returns a summary.
 *
 * Usage:
 *   bun run demo-runloop.ts              # run all 5 scenarios
 *   bun run demo-runloop.ts "custom goal" # run a single custom goal
 */

import { readFileSync } from "fs";
import { TonAgentKit } from "./packages/core/src/agent";
import { KeypairWallet } from "./packages/core/src/wallet";
import TokenPlugin from "./packages/plugin-token/src/index";
import DefiPlugin from "./packages/plugin-defi/src/index";
import DnsPlugin from "./packages/plugin-dns/src/index";
import AnalyticsPlugin from "./packages/plugin-analytics/src/index";
import EscrowPlugin from "./packages/plugin-escrow/src/index";
import IdentityPlugin from "./packages/plugin-identity/src/index";
import StakingPlugin from "./packages/plugin-staking/src/index";

// Read .env manually (dotenv doesn't reliably load under bun)
const envContent = readFileSync(".env", "utf-8");
const getEnv = (key: string) =>
  envContent.split("\n").find((l) => l.startsWith(key + "="))?.slice(key.length + 1).trim() || "";

const MNEMONIC = getEnv("TON_MNEMONIC");
const NETWORK = (getEnv("TON_NETWORK") || "testnet") as "testnet" | "mainnet";
const RPC_URL = getEnv("TON_RPC_URL") || "https://testnet-v4.tonhubapi.com";
const apiKey = getEnv("OPENAI_API_KEY");
const baseURL = getEnv("OPENAI_BASE_URL") || undefined;
const model = getEnv("AI_MODEL") || "gpt-4.1-nano";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Scenarios ────────────────────────────────────────────────

interface Scenario {
  name: string;
  goal: string;
  allPlugins?: boolean;
}

const SCENARIOS: Scenario[] = [
  {
    name: "Balance & Price Analysis",
    goal: "Check my TON balance. Then get the price of USDT using token address EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs. Calculate how much my TON is worth in USDT.",
  },
  {
    name: "Autonomous Transfer",
    goal: "Send 0.001 TON to 0QBQ-vTFmOnzUMYx66UHSljnn1DzP9iCE8qw77flvWS9VXK3 with comment autonomous-agent-payment. Then check my balance to confirm.",
    allPlugins: true,
  },
  {
    name: "Multi-Step Research",
    goal: "Resolve the domain foundation.ton to get its address. Then check the balance of that address. Then get the USDT price. Give me a summary of all findings.",
    allPlugins: true,
  },
  {
    name: "Full Agent Workflow",
    goal: "Register an agent called demo-bot with capabilities trading and analytics. Then check my TON balance. Get the USDT price. Resolve foundation.ton and check its balance. Then discover all agents with trading capability. Give me a full report.",
    allPlugins: true,
  },
  {
    name: "Autonomous Escrow",
    goal: "Create an escrow to 0QBQ-vTFmOnzUMYx66UHSljnn1DzP9iCE8qw77flvWS9VXK3 for 0.05 TON with description autonomous-escrow-test and deadline 10 minutes. Then list all escrows and give me the details of the one we just created.",
    allPlugins: true,
  },
];

// ── Display Helpers ──────────────────────────────────────────

const W = 60;

function boxLine(content: string, width: number = W - 6): string {
  const truncated = content.length > width ? content.slice(0, width - 3) + "..." : content;
  return `  │  ${truncated.padEnd(width)}│`;
}

function formatResult(result: any): string[] {
  if (typeof result === "string") return [`     ${result}`];

  const lines: string[] = [];

  if (result.error) {
    lines.push(`     ⚠️  Error: ${result.error}`);
    return lines;
  }

  if (result.balance !== undefined) {
    lines.push(`     Balance: ${result.balance} TON`);
  }
  if (result.address) {
    const addr = String(result.address);
    lines.push(`     Address: ${addr.length > 48 ? addr.slice(0, 24) + "..." + addr.slice(-12) : addr}`);
  }
  if (result.priceUSD || result.price_usd) {
    lines.push(`     Price:   $${result.priceUSD || result.price_usd} USD`);
  }
  if (result.priceTON || result.price_ton) {
    lines.push(`     TON:     ${result.priceTON || result.price_ton} TON`);
  }
  if (result.domain) {
    lines.push(`     Domain:  ${result.domain} → ${result.resolved || result.address || "?"}`);
  }
  if (result.escrowId) {
    lines.push(`     Escrow:  ${result.escrowId}`);
  }
  if (result.contractAddress) {
    lines.push(`     Contract: ${result.contractAddress}`);
  }
  if (result.agentId) {
    lines.push(`     Agent:   ${result.agentId}`);
  }
  if (result.count !== undefined) {
    lines.push(`     Count:   ${result.count}`);
  }
  if (result.name && !result.balance && !result.priceUSD) {
    lines.push(`     Name:    ${result.name}`);
  }
  if (result.symbol) {
    lines.push(`     Symbol:  ${result.symbol}`);
  }
  if (result.totalSupply) {
    lines.push(`     Supply:  ${result.totalSupply}`);
  }

  // Fallback: show truncated JSON
  if (lines.length === 0) {
    const json = JSON.stringify(result, null, 2);
    const truncated = json.length > 200 ? json.slice(0, 200) + "..." : json;
    for (const l of truncated.split("\n")) {
      lines.push(`     ${l}`);
    }
  }

  return lines;
}

function wordWrap(text: string, indent: string = "  ", maxWidth: number = W - 4): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = indent;

  for (const word of words) {
    if (current.length + word.length + 1 > maxWidth + indent.length && current !== indent) {
      lines.push(current);
      current = indent + word;
    } else {
      current += (current === indent ? "" : " ") + word;
    }
  }
  if (current.trim()) lines.push(current);
  return lines;
}

// ── Run a single scenario ────────────────────────────────────

interface ScenarioResult {
  name: string;
  steps: number;
  success: boolean;
}

async function runScenario(
  scenario: Scenario,
  index: number,
  total: number,
  wallet: KeypairWallet,
): Promise<ScenarioResult> {
  // ── Scenario Header ──
  console.log(`\n${"═".repeat(W)}`);
  console.log(`  📋 SCENARIO ${index}/${total} — ${scenario.name}`);
  console.log(`${"═".repeat(W)}`);

  // ── Init agent with appropriate plugins ──
  const agent = new TonAgentKit(wallet, RPC_URL);

  if (scenario.allPlugins) {
    agent
      .use(TokenPlugin)
      .use(DefiPlugin)
      .use(DnsPlugin)
      .use(AnalyticsPlugin)
      .use(EscrowPlugin)
      .use(IdentityPlugin)
      .use(StakingPlugin);
    console.log(`\n  Plugins: Token, DeFi, DNS, Analytics, Escrow, Identity, Staking`);
  } else {
    agent
      .use(TokenPlugin)
      .use(DefiPlugin)
      .use(DnsPlugin)
      .use(AnalyticsPlugin);
    console.log(`\n  Plugins: Token, DeFi, DNS, Analytics`);
  }

  console.log(`  Actions: ${agent.actionCount} available`);
  console.log(`\n  🎯 GOAL:`);
  console.log(`  "${scenario.goal}"\n`);

  // ── Run Loop ──
  let actionIndex = 0;
  let hasError = false;

  const result = await agent.runLoop(scenario.goal, {
    apiKey,
    baseURL,
    model,
    verbose: false,

    onIteration: (iteration, maxIterations) => {
      console.log(`\n${"─".repeat(W)}`);
      console.log(`  🔄 ITERATION ${iteration}/${maxIterations} — Agent is thinking...`);
      console.log(`${"─".repeat(W)}`);
    },

    onActionStart: (actionName, params) => {
      actionIndex++;
      const paramStr = !params || Object.keys(params).length === 0
        ? "(none)"
        : Object.entries(params).map(([k, v]) => `${k}: ${v}`).join(", ");
      console.log(`\n  ▶ Action #${actionIndex}: ${actionName}`);
      console.log(`    Params: ${paramStr}`);
    },

    onActionResult: (_actionName, _params, result) => {
      if (result?.error) hasError = true;
      console.log(`  ◀ Result:`);
      for (const l of formatResult(result)) {
        console.log(l);
      }
    },

    onComplete: () => {
      console.log(`\n  ✅ SCENARIO ${index} COMPLETED`);
    },
  });

  // ── Summary ──
  console.log(`\n  📝 Summary:`);
  for (const l of wordWrap(result.summary)) {
    console.log(l);
  }

  return {
    name: scenario.name,
    steps: result.steps.length,
    success: !hasError && !result.steps.some((s: any) => s.result?.error),
  };
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  if (!MNEMONIC) {
    console.error("❌ Set TON_MNEMONIC in .env");
    process.exit(1);
  }

  // ── Header ──
  console.log(`\n${"═".repeat(W)}`);
  console.log("  🤖 TON Agent Kit — Autonomous Agent Runtime Demo");
  console.log(`${"═".repeat(W)}\n`);
  console.log("  The agent receives a goal and decides which actions");
  console.log("  to execute — fully autonomous, no hardcoded steps.\n");
  console.log(`  Network: ${NETWORK}`);
  console.log(`  Model:   ${model}`);

  // ── Init wallet ──
  const mnemonic = MNEMONIC.split(" ");
  const wallet = await KeypairWallet.fromMnemonic(mnemonic, {
    version: "V5R1",
    network: NETWORK,
  });

  const viewer = NETWORK === "testnet"
    ? "https://testnet.tonviewer.com"
    : "https://tonviewer.com";

  // ── Wallet Info ──
  const tempAgent = new TonAgentKit(wallet, RPC_URL)
    .use(TokenPlugin).use(DefiPlugin).use(DnsPlugin).use(AnalyticsPlugin)
    .use(EscrowPlugin).use(IdentityPlugin).use(StakingPlugin);

  console.log(`\n${"─".repeat(W)}`);
  console.log(`\n  📡 Agent Wallet:`);
  console.log(`     Address: ${tempAgent.address}`);
  console.log(`     ${viewer}/${tempAgent.address}`);
  console.log(`     Max Actions: ${tempAgent.actionCount} (full toolkit)`);
  console.log(`\n${"─".repeat(W)}`);

  // ── Check for custom goal via CLI arg ──
  const customGoal = process.argv[2];

  if (customGoal) {
    // Single custom goal — run with all plugins
    const result = await runScenario(
      { name: "Custom Goal", goal: customGoal, allPlugins: true },
      1,
      1,
      wallet,
    );

    console.log(`\n  ┌${"─".repeat(W - 4)}┐`);
    console.log(boxLine(`${result.success ? "✅" : "⚠️"}  ${result.name}: ${result.steps} steps`));
    console.log(`  └${"─".repeat(W - 4)}┘\n`);
    return;
  }

  // ── Run all scenarios ──
  console.log(`\n  📋 Running ${SCENARIOS.length} scenarios in sequence...\n`);

  const results: ScenarioResult[] = [];

  for (let i = 0; i < SCENARIOS.length; i++) {
    const scenario = SCENARIOS[i];

    const result = await runScenario(scenario, i + 1, SCENARIOS.length, wallet);
    results.push(result);

    // Separator between scenarios (not after the last one)
    if (i < SCENARIOS.length - 1) {
      console.log(`\n  ⏳ Next scenario in 3 seconds...`);
      await sleep(3000);
    }
  }

  // ── Final Summary ──
  const totalSteps = results.reduce((sum, r) => sum + r.steps, 0);

  console.log(`\n\n  ┌${"─".repeat(W - 4)}┐`);
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const icon = r.success ? "✅" : "⚠️";
    const label = `Scenario ${i + 1}: ${icon} ${r.name} (${r.steps} steps)`;
    console.log(boxLine(label));
  }
  console.log(boxLine(``));
  console.log(boxLine(`Total:      ${totalSteps} autonomous actions executed`));
  console.log(boxLine(`Scenarios:  ${results.filter(r => r.success).length}/${results.length} successful`));
  console.log(`  └${"─".repeat(W - 4)}┘\n`);
}

main().catch(console.error);
