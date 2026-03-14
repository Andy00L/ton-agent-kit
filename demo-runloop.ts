/**
 * TON Agent Kit — Autonomous Agent Loop Demo
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

async function main() {
  if (!MNEMONIC) {
    console.error("Set TON_MNEMONIC in .env");
    process.exit(1);
  }

  console.log("Initializing agent...\n");

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

  console.log(`Wallet:  ${agent.address}`);
  console.log(`Network: ${NETWORK}`);
  console.log(`Actions: ${agent.actionCount}`);
  console.log(`\n${"=".repeat(60)}\n`);

  const goal =
    process.argv[2] ||
    "Check my TON balance, then get the USDT price, and tell me how much my TON is worth in USDT";

  console.log(`Goal: "${goal}"\n`);

  const result = await agent.runLoop(goal, {
    apiKey,
    baseURL,
    model,
    verbose: true,
  });

  console.log(`\n${"=".repeat(60)}`);
  console.log("\nSummary:", result.summary);
  console.log(`Steps taken: ${result.steps.length}`);

  for (const step of result.steps) {
    console.log(`  - ${step.action}(${JSON.stringify(step.params)}) => ${typeof step.result === "string" ? step.result : JSON.stringify(step.result)}`);
  }
}

main().catch(console.error);
