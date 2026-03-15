/**
 * TON Agent Kit — Orchestrator Test
 *
 * Creates 2 agents with different plugins, then runs a multi-agent swarm
 * that decomposes a complex goal into parallel subtasks.
 */

import { TonAgentKit, KeypairWallet } from "./packages/core/src";
import TokenPlugin from "./packages/plugin-token/src";
import DefiPlugin from "./packages/plugin-defi/src";
import DnsPlugin from "./packages/plugin-dns/src";
import { Orchestrator } from "./packages/orchestrator/src";
import { readFileSync } from "fs";

const envContent = readFileSync(".env", "utf-8");
const getEnv = (key: string) =>
  envContent.split("\n").find((l) => l.startsWith(key + "="))?.slice(key.length + 1).trim() || "";

process.env.TON_MNEMONIC = getEnv("TON_MNEMONIC");
process.env.OPENAI_API_KEY = getEnv("OPENAI_API_KEY");
process.env.OPENAI_BASE_URL = getEnv("OPENAI_BASE_URL");
process.env.AI_MODEL = getEnv("AI_MODEL");
process.env.TON_NETWORK = getEnv("TON_NETWORK");
process.env.TON_RPC_URL = getEnv("TON_RPC_URL");

async function main() {
  const mnemonic = process.env.TON_MNEMONIC!.split(" ");

  // --- Agent A: wallet operations + defi ---
  const walletA = await KeypairWallet.fromMnemonic(mnemonic);
  const agentA = new TonAgentKit(
    walletA,
    "https://testnet-v4.tonhubapi.com",
    {},
    "testnet",
  )
    .use(TokenPlugin)
    .use(DefiPlugin);

  // --- Agent B: wallet operations + dns ---
  const walletB = await KeypairWallet.fromMnemonic(mnemonic);
  const agentB = new TonAgentKit(
    walletB,
    "https://testnet-v4.tonhubapi.com",
    {},
    "testnet",
  )
    .use(TokenPlugin)
    .use(DnsPlugin);

  // --- Orchestrator ---
  const orch = new Orchestrator()
    .agent("trader", "handles balances and DeFi price checks", agentA)
    .agent("resolver", "handles balances and .ton domain resolution", agentB);

  console.log("Registered agents:");
  for (const a of orch.getAgents()) {
    console.log(`  ${a.name} (${a.role}): [${a.capabilities.join(", ")}]`);
  }

  // --- Run swarm ---
  console.log("\n--- Running swarm ---\n");
  const result = await orch.swarm(
    "Check both agents' balances, get the USDT price, and resolve foundation.ton",
    {
      verbose: true,
      onPlanReady: (tasks) => {
        console.log(`\nPlan (${tasks.length} tasks):`);
        for (const t of tasks) {
          console.log(
            `  [${t.id}] ${t.agent}.${t.action}(${JSON.stringify(t.params)})${t.dependsOn?.length ? ` depends on: ${t.dependsOn.join(", ")}` : ""}`,
          );
        }
        console.log();
      },
      onTaskComplete: (r) => {
        console.log(
          `  ✓ ${r.agent}.${r.action} → ${JSON.stringify(r.result).slice(0, 120)}`,
        );
      },
      onTaskError: (task, err) => {
        console.log(`  ✗ ${task.agent}.${task.action} → ${err.message}`);
      },
    },
  );

  // --- Results ---
  console.log("\n--- Results ---\n");
  console.log(`Goal: ${result.goal}`);
  console.log(`Agents used: ${result.agentsUsed.join(", ")}`);
  console.log(
    `Tasks: ${result.tasksCompleted} completed, ${result.tasksFailed} failed`,
  );
  console.log(`Duration: ${result.totalDuration}ms`);
  console.log(`\nSummary: ${result.summary}`);
}

main().catch(console.error);
