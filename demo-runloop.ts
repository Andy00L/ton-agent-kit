/**
 * TON Agent Kit — Autonomous Agent Runtime Demo
 *
 * The agent receives a natural-language goal, plans which actions to call,
 * executes them, and returns a summary — fully autonomous.
 *
 * Usage: bun run demo-runloop.ts
 */

import { readFileSync } from "fs";
import { TonAgentKit } from "./packages/core/src/agent";
import { KeypairWallet } from "./packages/core/src/wallet";
import TokenPlugin from "./packages/plugin-token/src/index";
import DefiPlugin from "./packages/plugin-defi/src/index";
import DnsPlugin from "./packages/plugin-dns/src/index";
import AnalyticsPlugin from "./packages/plugin-analytics/src/index";

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

  // ── Init ──
  const mnemonic = MNEMONIC.split(" ");
  const wallet = await KeypairWallet.fromMnemonic(mnemonic, {
    version: "V5R1",
    network: NETWORK,
  });

  const agent = new TonAgentKit(wallet, RPC_URL)
    .use(TokenPlugin)
    .use(DefiPlugin)
    .use(DnsPlugin)
    .use(AnalyticsPlugin);

  const viewer = NETWORK === "testnet"
    ? "https://testnet.tonviewer.com"
    : "https://tonviewer.com";

  // ── Wallet Info ──
  console.log(`\n${"─".repeat(W)}`);
  console.log(`\n  📡 Agent Wallet:`);
  console.log(`     Address: ${agent.address}`);
  console.log(`     ${viewer}/${agent.address}`);
  console.log(`     Actions: ${agent.actionCount} available`);
  console.log(`     Plugins: Token, DeFi, DNS, Analytics`);
  console.log(`\n${"─".repeat(W)}`);

  // ── Goal ──
  const goal =
    process.argv[2] ||
    "Check my TON balance, then get the USDT price, and tell me how much my TON is worth in USDT";

  console.log(`\n  🎯 GOAL:`);
  console.log(`  "${goal}"\n`);

  // ── Run Loop with formatted callbacks ──
  let actionIndex = 0;

  const result = await agent.runLoop(goal, {
    apiKey,
    baseURL,
    model,
    verbose: false,

    onIteration: (iteration, maxIterations) => {
      console.log(`\n${"═".repeat(W)}`);
      console.log(`  🔄 ITERATION ${iteration}/${maxIterations} — Agent is thinking...`);
      console.log(`${"═".repeat(W)}`);
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
      console.log(`  ◀ Result:`);
      for (const l of formatResult(result)) {
        console.log(l);
      }
    },

    onComplete: () => {
      console.log(`\n${"═".repeat(W)}`);
      console.log("  ✅ AGENT COMPLETED GOAL");
      console.log(`${"═".repeat(W)}`);
    },
  });

  // ── Summary ──
  console.log(`\n  📝 Summary:`);
  for (const l of wordWrap(result.summary)) {
    console.log(l);
  }

  // ── Final Summary Box ──
  const goalDisplay = goal.length > 40 ? goal.slice(0, 40) + "..." : goal;
  const stepsLabel = `${result.steps.length} action${result.steps.length !== 1 ? "s" : ""} executed`;
  const statusLabel = result.steps.some((s: any) => s.result?.error)
    ? "Completed with errors"
    : "Completed successfully";

  console.log(`\n  ┌${"─".repeat(W - 4)}┐`);
  console.log(boxLine(`🎯 Goal:    ${goalDisplay}`));
  console.log(boxLine(`📊 Steps:   ${stepsLabel}`));
  console.log(boxLine(`✅ Status:  ${statusLabel}`));
  console.log(`  └${"─".repeat(W - 4)}┘`);

  // ── Steps Recap ──
  if (result.steps.length > 0) {
    console.log("\n  Steps executed:");
    for (let i = 0; i < result.steps.length; i++) {
      const step = result.steps[i];
      const icon = step.result?.error ? "⚠️ " : "✅";
      console.log(`     ${icon} ${i + 1}. ${step.action}`);
    }
  }

  console.log();
}

main().catch(console.error);
