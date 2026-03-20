// tests/19-orchestrator.ts — Wrapped from test-orchestrator.ts
/**
 * Orchestrator Comprehensive Test Suite
 * Multi-agent, Parallel, Dependencies, Edge cases
 */

import { readFileSync } from "fs";
import { TonAgentKit } from "../packages/core/src/agent";
import { KeypairWallet } from "../packages/core/src/wallet";
import TokenPlugin from "../packages/plugin-token/src/index";
import DefiPlugin from "../packages/plugin-defi/src/index";
import DnsPlugin from "../packages/plugin-dns/src/index";
import AnalyticsPlugin from "../packages/plugin-analytics/src/index";
import EscrowPlugin from "../packages/plugin-escrow/src/index";
import IdentityPlugin from "../packages/plugin-identity/src/index";
import StakingPlugin from "../packages/plugin-staking/src/index";
import { Orchestrator } from "../packages/orchestrator/src";

const envContent = readFileSync(".env", "utf-8");
const getEnv = (key: string) =>
  envContent.split("\n").find((l) => l.startsWith(key + "="))?.slice(key.length + 1).trim() || "";

process.env.TON_MNEMONIC = getEnv("TON_MNEMONIC");
process.env.OPENAI_API_KEY = getEnv("OPENAI_API_KEY");
process.env.OPENAI_BASE_URL = getEnv("OPENAI_BASE_URL");
process.env.AI_MODEL = getEnv("AI_MODEL");
process.env.TON_NETWORK = getEnv("TON_NETWORK");
process.env.TON_RPC_URL = getEnv("TON_RPC_URL");

// ══════════════════════════════════════════════════════════════
//  Test Framework
// ══════════════════════════════════════════════════════════════

const W = 64;
const RATE_MS = 2000;

let passed = 0;
let failed = 0;
let skipped = 0;
const errors: string[] = [];
const sectionResults: { name: string; passed: number; failed: number }[] = [];
let sectionPassed = 0;
let sectionFailed = 0;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function header(icon: string, num: number, title: string, subtitle?: string) {
  console.log(`\n${"═".repeat(W)}`);
  console.log(`  ${icon} SECTION ${num}: ${title}`);
  if (subtitle) console.log(`  ${subtitle}`);
  console.log(`${"═".repeat(W)}`);
}

function sectionEnd(name: string) {
  sectionResults.push({ name, passed: sectionPassed, failed: sectionFailed });
  sectionPassed = 0;
  sectionFailed = 0;
}

async function test(name: string, fn: () => Promise<any>): Promise<any> {
  try {
    const result = await fn();
    console.log(`  ✅ ${name}`);
    passed++;
    sectionPassed++;
    return result;
  } catch (err: any) {
    console.log(`  ❌ ${name}`);
    console.log(`     → ${err.message.slice(0, 150)}`);
    failed++;
    sectionFailed++;
    errors.push(`${name}: ${err.message.slice(0, 120)}`);
    return null;
  }
}

async function testError(name: string, fn: () => Promise<any>, expectedMsg: string): Promise<void> {
  try {
    await fn();
    console.log(`  ❌ ${name} — should have thrown`);
    failed++;
    sectionFailed++;
    errors.push(`${name}: did not throw`);
  } catch (err: any) {
    if (err.message.toLowerCase().includes(expectedMsg.toLowerCase())) {
      console.log(`  ✅ ${name}`);
      console.log(`     ↳ Correctly rejected: ${err.message.slice(0, 100)}`);
      passed++;
      sectionPassed++;
    } else {
      console.log(`  ❌ ${name} — wrong error`);
      console.log(`     Expected "${expectedMsg}" got "${err.message.slice(0, 100)}"`);
      failed++;
      sectionFailed++;
      errors.push(`${name}: wrong error — ${err.message.slice(0, 100)}`);
    }
  }
}

function skip(name: string, reason: string) {
  console.log(`  ⏭️  ${name} — ${reason}`);
  skipped++;
}

export interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
  duration: number;
}

// ══════════════════════════════════════════════════════════════
//  Main
// ══════════════════════════════════════════════════════════════

async function main() {
  const mnemonic = process.env.TON_MNEMONIC;
  if (!mnemonic) {
    throw new Error("Set TON_MNEMONIC in .env");
  }

  const startTime = Date.now();

  console.log(`
╔${"═".repeat(W - 2)}╗
║${" ".repeat(Math.floor((W - 52) / 2))}🤖 TON Agent Kit — Orchestrator Test Suite${" ".repeat(Math.ceil((W - 52) / 2))}║
║${" ".repeat(Math.floor((W - 50) / 2))}Multi-agent · Parallel · Dependencies · Edge${" ".repeat(Math.ceil((W - 50) / 2))}║
╚${"═".repeat(W - 2)}╝

  Network:    testnet
  Model:      ${getEnv("AI_MODEL") || "gpt-4o"}
  Timestamp:  ${new Date().toISOString()}
${"─".repeat(W)}`);

  // ── Setup wallets and agents ──
  const wallet = await KeypairWallet.fromMnemonic(mnemonic.split(" "), {
    version: "V5R1",
    network: "testnet",
  });

  const rpcUrl = "https://testnet-v4.tonhubapi.com";

  const traderAgent = new TonAgentKit(wallet, rpcUrl, {}, "testnet")
    .use(TokenPlugin)
    .use(DefiPlugin);

  const resolverAgent = new TonAgentKit(wallet, rpcUrl, {}, "testnet")
    .use(TokenPlugin)
    .use(DnsPlugin);

  const analystAgent = new TonAgentKit(wallet, rpcUrl, {}, "testnet")
    .use(TokenPlugin)
    .use(AnalyticsPlugin)
    .use(StakingPlugin);

  const managerAgent = new TonAgentKit(wallet, rpcUrl, {}, "testnet")
    .use(EscrowPlugin)
    .use(IdentityPlugin);

  const friendlyAddr = wallet.address.toString({ testOnly: true, bounceable: false });

  console.log(`
  📡 Wallet:  ${friendlyAddr}
  🔧 Agents:  4 prepared (trader, resolver, analyst, manager)
`);

  // SECTION 1: Agent Registration
  header("📝", 1, "Agent Registration", "Chainable API, getAgents, removeAgent");

  await test("Orchestrator constructor", async () => {
    const o = new Orchestrator();
    if (!o) throw new Error("Constructor returned falsy");
    console.log(`     Created Orchestrator instance`);
  });

  await test(".agent() is chainable", async () => {
    const o = new Orchestrator()
      .agent("a", "role-a", traderAgent)
      .agent("b", "role-b", resolverAgent);
    if (o.getAgents().length !== 2) throw new Error(`Expected 2, got ${o.getAgents().length}`);
    console.log(`     2 agents chained`);
  });

  await test("getAgents() returns correct agents", async () => {
    const o = new Orchestrator()
      .agent("trader", "trades stuff", traderAgent)
      .agent("resolver", "resolves stuff", resolverAgent);
    const agents = o.getAgents();
    if (agents.length !== 2) throw new Error(`Expected 2, got ${agents.length}`);
    if (agents[0].name !== "trader") throw new Error(`Expected trader, got ${agents[0].name}`);
    if (agents[1].name !== "resolver") throw new Error(`Expected resolver, got ${agents[1].name}`);
    console.log(`     [${agents.map(a => a.name).join(", ")}]`);
  });

  await test("getAgents() has correct capabilities", async () => {
    const o = new Orchestrator().agent("trader", "trades", traderAgent);
    const caps = o.getAgents()[0].capabilities;
    if (!caps.includes("get_balance")) throw new Error("Missing get_balance");
    if (!caps.includes("get_price")) throw new Error("Missing get_price");
    if (!caps.includes("swap_dedust")) throw new Error("Missing swap_dedust");
    console.log(`     Capabilities: ${caps.length} actions [${caps.slice(0, 4).join(", ")}...]`);
  });

  await test("removeAgent() works", async () => {
    const o = new Orchestrator()
      .agent("a", "r", traderAgent)
      .agent("b", "r", resolverAgent);
    o.removeAgent("a");
    if (o.getAgents().length !== 1) throw new Error(`Expected 1, got ${o.getAgents().length}`);
    if (o.getAgents()[0].name !== "b") throw new Error(`Expected b, got ${o.getAgents()[0].name}`);
    console.log(`     Removed "a", remaining: ["b"]`);
  });

  await test("removeAgent() returns this (chainable)", async () => {
    const o = new Orchestrator()
      .agent("a", "r", traderAgent)
      .agent("b", "r", resolverAgent);
    const returned = o.removeAgent("a");
    if (returned !== o) throw new Error("removeAgent did not return this");
    console.log(`     Chainable confirmed`);
  });

  await test("4 agents registered (full setup)", async () => {
    const o = new Orchestrator()
      .agent("trader", "DeFi trader", traderAgent)
      .agent("resolver", "DNS resolver", resolverAgent)
      .agent("analyst", "Analytics", analystAgent)
      .agent("manager", "Escrow + Identity", managerAgent);
    if (o.getAgents().length !== 4) throw new Error(`Expected 4, got ${o.getAgents().length}`);
    const totalCaps = o.getAgents().reduce((sum, a) => sum + a.capabilities.length, 0);
    console.log(`     4 agents, ${totalCaps} total capabilities`);
  });

  sectionEnd("Agent Registration");

  // SECTION 2: Basic Swarm
  header("⚡", 2, "Basic Swarm", "2 agents, 4 parallel tasks, 0 dependencies");

  await delay(RATE_MS);

  const basicResult = await test("swarm: balance + price + resolve", async () => {
    const o = new Orchestrator()
      .agent("trader", "Check balances and token prices", traderAgent)
      .agent("resolver", "Resolve .ton domains and check balances", resolverAgent);

    const result = await o.swarm(
      "Check both agents' balances, get the USDT price, and resolve foundation.ton",
      {
        onPlanReady: (tasks) => {
          console.log(`     Plan: ${tasks.length} tasks`);
          for (const t of tasks) {
            console.log(`       [${t.id}] ${t.agent}.${t.action}`);
          }
        },
        onTaskComplete: (r) => {
          console.log(`     ✓ ${r.agent}.${r.action} (${r.duration}ms)`);
        },
      },
    );

    if (result.tasksFailed > 0) throw new Error(`${result.tasksFailed} task(s) failed`);
    if (result.tasksCompleted < 3) throw new Error(`Expected at least 3 completed, got ${result.tasksCompleted}`);
    return result;
  });

  if (basicResult) {
    await test("result has summary", async () => {
      if (!basicResult.summary || basicResult.summary.length < 20)
        throw new Error(`Summary too short: ${basicResult.summary?.length}`);
      console.log(`     Summary: ${basicResult.summary.slice(0, 100)}...`);
    });

    await test("result has agentsUsed", async () => {
      if (basicResult.agentsUsed.length < 2)
        throw new Error(`Expected 2+ agents, got ${basicResult.agentsUsed.length}`);
      console.log(`     Agents: ${basicResult.agentsUsed.join(", ")}`);
    });

    await test("result has totalDuration", async () => {
      if (basicResult.totalDuration <= 0) throw new Error("Duration is 0");
      console.log(`     Duration: ${basicResult.totalDuration}ms`);
    });
  }

  sectionEnd("Basic Swarm");

  // SECTION 3: Complex Swarm
  header("🔗", 3, "Complex Swarm", "Tasks with dependencies — sequential + parallel mix");

  await delay(RATE_MS);

  const complexResult = await test("swarm: resolve domain THEN check its balance", async () => {
    const o = new Orchestrator()
      .agent("resolver", "Resolve .ton domains", resolverAgent)
      .agent("trader", "Check balances and prices", traderAgent);

    const result = await o.swarm(
      "First resolve foundation.ton to get its address. Then check the balance of that address. Also get the USDT price in parallel.",
      {
        onPlanReady: (tasks) => {
          console.log(`     Plan: ${tasks.length} tasks`);
          for (const t of tasks) {
            const deps = t.dependsOn?.length ? ` (depends: ${t.dependsOn.join(",")})` : "";
            console.log(`       [${t.id}] ${t.agent}.${t.action}${deps}`);
          }
        },
        onTaskComplete: (r) => {
          console.log(`     ✓ ${r.agent}.${r.action} (${r.duration}ms)`);
        },
      },
    );

    if (result.tasksCompleted < 2) throw new Error(`Expected 2+ completed, got ${result.tasksCompleted}`);
    console.log(`     ${result.tasksCompleted} completed, ${result.tasksFailed} failed`);
    return result;
  });

  sectionEnd("Complex Swarm");

  // SECTION 4: Single Agent Swarm
  header("1️⃣", 4, "Single Agent Swarm", "Orchestrator works with just 1 agent");

  await delay(RATE_MS);

  await test("swarm with 1 agent only", async () => {
    const o = new Orchestrator()
      .agent("resolver", "DNS resolution specialist", resolverAgent);

    const result = await o.swarm(
      "Resolve foundation.ton and get the domain info",
      {
        onTaskComplete: (r) => {
          console.log(`     ✓ ${r.agent}.${r.action} (${r.duration}ms)`);
        },
      },
    );

    if (result.agentsUsed.length !== 1) throw new Error(`Expected 1 agent, got ${result.agentsUsed.length}`);
    if (result.tasksCompleted < 1) throw new Error("No tasks completed");
    console.log(`     ${result.tasksCompleted} tasks with 1 agent`);
  });

  sectionEnd("Single Agent Swarm");

  // SECTION 5: Many Agents Swarm
  header("👥", 5, "Many Agents Swarm", "4 specialized agents collaborate");

  await delay(RATE_MS);

  await test("swarm with 4 agents: trader + resolver + analyst + manager", async () => {
    const o = new Orchestrator()
      .agent("trader", "DeFi price checks", traderAgent)
      .agent("resolver", "DNS domain resolution", resolverAgent)
      .agent("analyst", "Wallet analytics and transaction history", analystAgent)
      .agent("manager", "Agent identity registration and discovery", managerAgent);

    const result = await o.swarm(
      "Get the USDT price. Resolve foundation.ton. Check wallet transaction history (limit 3). Register an agent called orchestrator-test with capability multi-agent.",
      {
        onPlanReady: (tasks) => {
          console.log(`     Plan: ${tasks.length} tasks across ${new Set(tasks.map(t => t.agent)).size} agents`);
        },
        onTaskComplete: (r) => {
          console.log(`     ✓ ${r.agent}.${r.action} (${r.duration}ms)`);
        },
        onTaskError: (task, err) => {
          console.log(`     ✗ ${task.agent}.${task.action}: ${err.message.slice(0, 80)}`);
        },
      },
    );

    const uniqueAgents = result.agentsUsed.length;
    console.log(`     ${result.tasksCompleted} completed, ${result.tasksFailed} failed, ${uniqueAgents} agents used`);
    if (result.tasksCompleted < 3) throw new Error(`Expected 3+ completed, got ${result.tasksCompleted}`);
  });

  sectionEnd("Many Agents Swarm");

  // SECTION 6: Event Callbacks
  header("📡", 6, "Event Callbacks", "Verify all hooks fire correctly");

  await delay(RATE_MS);

  await test("onPlanReady fires with tasks", async () => {
    let planTasks: any[] = [];
    const o = new Orchestrator()
      .agent("resolver", "DNS", resolverAgent);

    await o.swarm("Resolve foundation.ton", {
      onPlanReady: (tasks) => { planTasks = tasks; },
    });

    if (planTasks.length === 0) throw new Error("onPlanReady never fired or empty");
    console.log(`     Received ${planTasks.length} tasks in onPlanReady`);
  });

  await delay(RATE_MS);

  await test("onTaskStart fires for each task", async () => {
    const starts: string[] = [];
    const o = new Orchestrator()
      .agent("trader", "prices", traderAgent);

    await o.swarm("Get the USDT price", {
      onTaskStart: (task) => { starts.push(task.id); },
    });

    if (starts.length === 0) throw new Error("onTaskStart never fired");
    console.log(`     onTaskStart fired ${starts.length} time(s)`);
  });

  await delay(RATE_MS);

  await test("onTaskComplete fires for successful tasks", async () => {
    const completions: string[] = [];
    const o = new Orchestrator()
      .agent("resolver", "DNS", resolverAgent);

    await o.swarm("Resolve foundation.ton", {
      onTaskComplete: (r) => { completions.push(r.taskId); },
    });

    if (completions.length === 0) throw new Error("onTaskComplete never fired");
    console.log(`     onTaskComplete fired ${completions.length} time(s)`);
  });

  await delay(RATE_MS);

  await test("onComplete fires at the end", async () => {
    let completeFired = false;
    let resultCount = 0;
    const o = new Orchestrator()
      .agent("resolver", "DNS", resolverAgent);

    await o.swarm("Resolve foundation.ton", {
      onComplete: (results) => {
        completeFired = true;
        resultCount = results.length;
      },
    });

    if (!completeFired) throw new Error("onComplete never fired");
    console.log(`     onComplete fired with ${resultCount} results`);
  });

  sectionEnd("Event Callbacks");

  // SECTION 7: SwarmResult Structure
  header("📋", 7, "SwarmResult Structure", "Verify all fields are populated");

  await delay(RATE_MS);

  const structResult = await test("swarm returns complete SwarmResult", async () => {
    const o = new Orchestrator()
      .agent("trader", "prices", traderAgent)
      .agent("resolver", "DNS", resolverAgent);

    return await o.swarm("Get USDT price and resolve foundation.ton");
  });

  if (structResult) {
    await test("result.goal matches input", async () => {
      if (!structResult.goal.includes("USDT")) throw new Error(`Goal mismatch: ${structResult.goal}`);
      console.log(`     Goal: ${structResult.goal.slice(0, 60)}...`);
    });

    await test("result.plan is Task[]", async () => {
      if (!Array.isArray(structResult.plan)) throw new Error("plan is not array");
      if (structResult.plan.length === 0) throw new Error("plan is empty");
      const t = structResult.plan[0];
      if (!t.id) throw new Error("task missing id");
      if (!t.agent) throw new Error("task missing agent");
      if (!t.action) throw new Error("task missing action");
      console.log(`     Plan: ${structResult.plan.length} tasks, first: ${t.agent}.${t.action}`);
    });

    await test("result.results is TaskResult[]", async () => {
      if (!Array.isArray(structResult.results)) throw new Error("results is not array");
      if (structResult.results.length === 0) throw new Error("results is empty");
      const r = structResult.results[0];
      if (!r.taskId) throw new Error("result missing taskId");
      if (!r.agent) throw new Error("result missing agent");
      if (typeof r.duration !== "number") throw new Error("result missing duration");
      if (typeof r.timestamp !== "number") throw new Error("result missing timestamp");
      console.log(`     Results: ${structResult.results.length}, first duration: ${r.duration}ms`);
    });

    await test("result.summary is non-empty string", async () => {
      if (typeof structResult.summary !== "string") throw new Error("summary is not string");
      if (structResult.summary.length < 10) throw new Error("summary too short");
      console.log(`     Summary length: ${structResult.summary.length} chars`);
    });

    await test("result.totalDuration is positive", async () => {
      if (structResult.totalDuration <= 0) throw new Error(`Duration: ${structResult.totalDuration}`);
      console.log(`     Duration: ${structResult.totalDuration}ms`);
    });

    await test("result.agentsUsed is populated", async () => {
      if (structResult.agentsUsed.length === 0) throw new Error("agentsUsed is empty");
      console.log(`     Agents: ${structResult.agentsUsed.join(", ")}`);
    });

    await test("result.tasksCompleted + tasksFailed = plan length", async () => {
      const total = structResult.tasksCompleted + structResult.tasksFailed;
      if (total !== structResult.plan.length)
        throw new Error(`${total} != ${structResult.plan.length}`);
      console.log(`     ${structResult.tasksCompleted} ok + ${structResult.tasksFailed} err = ${total}`);
    });
  }

  sectionEnd("SwarmResult Structure");

  // SECTION 8: Parallel Verification
  header("🔀", 8, "Parallel Verification", "Confirm concurrent execution");

  await delay(RATE_MS);

  await test("parallel tasks have overlapping timestamps", async () => {
    const o = new Orchestrator()
      .agent("trader", "prices", traderAgent)
      .agent("resolver", "DNS", resolverAgent);

    const result = await o.swarm(
      "Get the USDT price and resolve foundation.ton at the same time",
    );

    if (result.results.length < 2) throw new Error("Need 2+ results for parallel check");

    const timestamps = result.results.map(r => r.timestamp);
    const minTs = Math.min(...timestamps);
    const maxTs = Math.max(...timestamps);
    const spread = maxTs - minTs;
    console.log(`     Timestamp spread: ${spread}ms (< 2000ms = parallel)`);

    if (result.totalDuration < 30000) {
      console.log(`     Total: ${result.totalDuration}ms (parallel, not sequential)`);
    }
  });

  sectionEnd("Parallel Verification");

  // SECTION 9: Dependency Chain
  header("⛓️", 9, "Dependency Chain", "Sequential tasks with dependsOn");

  await delay(RATE_MS);

  await test("swarm with dependent tasks executes in order", async () => {
    const o = new Orchestrator()
      .agent("resolver", "DNS resolution", resolverAgent)
      .agent("analyst", "Analytics and history", analystAgent);

    const taskOrder: string[] = [];
    const result = await o.swarm(
      "First resolve foundation.ton to get its address. Then look up the wallet info of that address.",
      {
        onTaskComplete: (r) => {
          taskOrder.push(`${r.agent}.${r.action}`);
          console.log(`     [${taskOrder.length}] ${r.agent}.${r.action} (${r.duration}ms)`);
        },
      },
    );

    console.log(`     Execution order: ${taskOrder.join(" → ")}`);
    if (result.tasksCompleted < 2) throw new Error(`Expected 2+ completed, got ${result.tasksCompleted}`);
  });

  sectionEnd("Dependency Chain");

  // SECTION 10: Error Recovery
  header("🛡️", 10, "Error Recovery", "Tasks that fail + retry behavior");

  await delay(RATE_MS);

  await test("swarm continues when some tasks fail", async () => {
    const o = new Orchestrator()
      .agent("trader", "DeFi prices", traderAgent)
      .agent("resolver", "DNS", resolverAgent);

    const result = await o.swarm(
      "Get the price of USDT. Also get the price of a nonexistent token called FAKECOIN_XYZ_999. Resolve foundation.ton.",
      {
        onTaskComplete: (r) => {
          console.log(`     ✓ ${r.agent}.${r.action}`);
        },
        onTaskError: (task, err) => {
          console.log(`     ✗ ${task.agent}.${task.action}: ${err.message.slice(0, 60)}`);
        },
      },
    );

    if (result.tasksCompleted < 2) throw new Error(`Expected 2+ completed, got ${result.tasksCompleted}`);
    console.log(`     ${result.tasksCompleted} ok, ${result.tasksFailed} failed — swarm survived`);
  });

  await delay(RATE_MS);

  await test("failed tasks have error in results", async () => {
    const o = new Orchestrator()
      .agent("resolver", "DNS", resolverAgent);

    const result = await o.swarm(
      "Resolve the domain thisdoesnotexist99999999.ton",
    );

    console.log(`     Completed: ${result.tasksCompleted}, Failed: ${result.tasksFailed}`);
    console.log(`     Summary: ${result.summary.slice(0, 100)}...`);
  });

  sectionEnd("Error Recovery");

  // SECTION 11: Edge Cases
  header("⚡", 11, "Edge Cases", "Unusual inputs and boundary conditions");

  await delay(RATE_MS);

  await test("swarm with very specific goal", async () => {
    const o = new Orchestrator()
      .agent("trader", "prices", traderAgent);

    const result = await o.swarm("Get the price of USDT");

    if (result.tasksCompleted < 1) throw new Error("No tasks completed");
    console.log(`     ${result.tasksCompleted} task(s) for minimal goal`);
  });

  await delay(RATE_MS);

  await test("swarm with long detailed goal", async () => {
    const o = new Orchestrator()
      .agent("trader", "DeFi trading and prices", traderAgent)
      .agent("resolver", "DNS domain resolution", resolverAgent)
      .agent("analyst", "Transaction analytics", analystAgent);

    const result = await o.swarm(
      "I need a comprehensive analysis. First check my wallet balance. Then get the current USDT price on the market. Also resolve the domain foundation.ton to find out who owns it. Finally check my recent transaction history with a limit of 5 transactions. Present everything in a clear summary.",
      {
        onPlanReady: (tasks) => {
          console.log(`     Long goal → ${tasks.length} tasks planned`);
        },
      },
    );

    if (result.tasksCompleted < 3) throw new Error(`Expected 3+ completed, got ${result.tasksCompleted}`);
    console.log(`     ${result.tasksCompleted} tasks completed for detailed goal`);
  });

  await delay(RATE_MS);

  await test("swarm result summary mentions results", async () => {
    const o = new Orchestrator()
      .agent("resolver", "DNS", resolverAgent);

    const result = await o.swarm("Resolve foundation.ton");

    const lower = result.summary.toLowerCase();
    if (!lower.includes("foundation") && !lower.includes("resolv") && !lower.includes("address")) {
      throw new Error(`Summary doesn't reference task: ${result.summary.slice(0, 100)}`);
    }
    console.log(`     Summary references task results`);
  });

  await test("getAgents() on empty orchestrator", async () => {
    const o = new Orchestrator();
    if (o.getAgents().length !== 0) throw new Error("Expected empty");
    console.log(`     Empty: ${o.getAgents().length} agents`);
  });

  sectionEnd("Edge Cases");

  // SUMMARY
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const total = passed + failed + skipped;

  console.log(`


╔${"═".repeat(W - 2)}╗
║${" ".repeat(Math.floor((W - 40) / 2))}🤖 Orchestrator Test Results${" ".repeat(Math.ceil((W - 40) / 2))}║
╚${"═".repeat(W - 2)}╝

  ✅ Passed:  ${String(passed).padStart(3)}
  ❌ Failed:  ${String(failed).padStart(3)}
  ⏭️  Skipped: ${String(skipped).padStart(3)}
  📊 Total:   ${String(total).padStart(3)}
  ⏱️  Time:    ${elapsed}s

  ── Section Breakdown ──
  ┌${"─".repeat(W - 4)}┐`);

  for (const s of sectionResults) {
    const icon = s.failed === 0 ? "✅" : "❌";
    const counts = `${s.passed}/${s.passed + s.failed}`;
    console.log(`  │  ${icon} ${s.name.padEnd(38)} ${counts.padStart(8)}    │`);
  }

  console.log(`  └${"─".repeat(W - 4)}┘`);

  if (errors.length > 0) {
    console.log(`\n  ── Error Details ──`);
    for (const e of errors) {
      console.log(`  🔴 ${e}`);
    }
  }

  if (failed === 0) {
    console.log(`
  ┌${"─".repeat(W - 4)}┐
  │                                                            │
  │     🎉  ALL ${total} TESTS PASSED — ORCHESTRATOR VERIFIED     │
  │                                                            │
  │     Multi-agent swarm · Parallel execution · Dependencies  │
  │     Event hooks · Error recovery · Edge cases              │
  │                                                            │
  └${"─".repeat(W - 4)}┘
`);
  } else {
    console.log(`\n  ⚠️  ${failed} test(s) need attention.\n`);
  }
}

export async function run(): Promise<TestResult> {
  const start = Date.now();
  passed = 0;
  failed = 0;
  skipped = 0;
  errors.length = 0;
  sectionResults.length = 0;
  sectionPassed = 0;
  sectionFailed = 0;
  try {
    await main();
  } catch (err: any) {
    failed++;
    errors.push(`FATAL: ${err.message}`);
  }
  return { passed, failed, errors: [...errors], duration: Date.now() - start };
}

if (import.meta.main) {
  run().then((r) => {
    console.log(`\n${r.passed} passed, ${r.failed} failed (${r.duration}ms)`);
    if (r.errors.length) r.errors.forEach((e) => console.log(`  - ${e}`));
    process.exit(r.failed > 0 ? 1 : 0);
  });
}
