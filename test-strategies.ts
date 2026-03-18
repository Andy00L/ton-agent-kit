/**
 * TON Agent Kit — Strategy Engine Test Suite
 * Deterministic workflows: conditions, schedules, steps
 * Run: bun run test-strategies.ts
 */
import { readFileSync } from "fs";
const envContent = readFileSync(".env", "utf-8");
const getEnv = (key: string) =>
  envContent.split("\n").find((l) => l.startsWith(key + "="))?.slice(key.length + 1).trim() || "";
process.env.TON_MNEMONIC = getEnv("TON_MNEMONIC");

import { TonAgentKit } from "./packages/core/src/agent";
import { KeypairWallet } from "./packages/core/src/wallet";
import TokenPlugin from "./packages/plugin-token/src/index";
import AnalyticsPlugin from "./packages/plugin-analytics/src/index";
import IdentityPlugin from "./packages/plugin-identity/src/index";
import {
  defineStrategy,
  StrategyRunner,
  StrategyContext,
  parseSchedule,
} from "./packages/strategies/src/index";
import { createDcaStrategy } from "./packages/strategies/src/templates/dca-buy";
import { createPriceMonitorStrategy } from "./packages/strategies/src/templates/price-monitor";
import { createRebalanceStrategy } from "./packages/strategies/src/templates/portfolio-rebalance";
import { createReputationGuardStrategy } from "./packages/strategies/src/templates/reputation-guard";

const W = 64;
let passed = 0, failed = 0;
const errors: string[] = [];
const sectionResults: { name: string; passed: number; failed: number }[] = [];
let sp = 0, sf = 0;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function header(icon: string, num: number, title: string, sub?: string) {
  console.log(`\n${"=".repeat(W)}`);
  console.log(`  ${icon} SECTION ${num}: ${title}`);
  if (sub) console.log(`  ${sub}`);
  console.log(`${"=".repeat(W)}`);
}

function sectionEnd(name: string) {
  sectionResults.push({ name, passed: sp, failed: sf });
  sp = 0; sf = 0;
}

async function test(name: string, fn: () => Promise<any>): Promise<any> {
  await delay(200);
  try {
    const r = await fn();
    console.log(`  [PASS] ${name}`);
    passed++; sp++;
    return r;
  } catch (e: any) {
    console.log(`  [FAIL] ${name}`);
    console.log(`     -> ${e.message?.slice(0, 120)}`);
    failed++; sf++;
    errors.push(`${name}: ${e.message?.slice(0, 100)}`);
    return null;
  }
}

async function main() {
  const startTime = Date.now();
  const mnemonic = getEnv("TON_MNEMONIC");
  const wallet = await KeypairWallet.fromMnemonic(mnemonic.split(" "), { version: "V5R1", network: "testnet" });
  const agent = new TonAgentKit(wallet, "https://testnet-v4.tonhubapi.com", {}, "testnet")
    .use(TokenPlugin).use(AnalyticsPlugin).use(IdentityPlugin);

  console.log(`\n${"=".repeat(W)}\n  Strategy Engine Test Suite\n${"=".repeat(W)}`);

  // SECTION 1: Strategy Definition
  header("1", 1, "Strategy Definition");

  await test("defineStrategy basic", async () => {
    const s = defineStrategy({ name: "basic", steps: [{ action: "get_balance", params: {} }, { action: "get_balance", params: {} }] });
    if (s.name !== "basic" || s.steps.length !== 2) throw new Error("Wrong");
  });

  await test("defineStrategy with all options", async () => {
    const s = defineStrategy({
      name: "full", schedule: "every 1h", maxRuns: 10,
      steps: [{ action: "a", params: {} }],
      onComplete: () => {}, onError: () => "continue" as const
    });
    if (!s.schedule || !s.maxRuns || !s.onComplete || !s.onError) throw new Error("Missing");
  });

  await test("Auto-assigns step IDs", async () => {
    const s = defineStrategy({ name: "ids", steps: [{ action: "a", params: {} }, { action: "b", params: {} }] });
    if (s.steps[0].id !== "step_0" || s.steps[1].id !== "step_1") throw new Error("Bad IDs");
  });

  await test("Custom step IDs preserved", async () => {
    const s = defineStrategy({ name: "cust", steps: [{ id: "my_step", action: "a", params: {} }] });
    if (s.steps[0].id !== "my_step") throw new Error("Not preserved");
  });

  sectionEnd("Strategy Definition");

  // SECTION 2: Basic Execution
  header("2", 2, "Basic Execution", "Real on-chain actions");

  await test("1-step strategy (get_balance)", async () => {
    const s = defineStrategy({ name: "s2a", steps: [{ action: "get_balance", params: {} }] });
    agent.useStrategy(s);
    const r = await agent.runStrategy("s2a");
    if (r.completedSteps !== 1) throw new Error(`Completed: ${r.completedSteps}`);
    console.log(`     Balance: ${r.steps[0].result?.balance} TON`);
  });

  await test("StrategyResult fields", async () => {
    const r = await agent.runStrategy("s2a");
    for (const f of ["strategyName", "runCount", "steps", "totalDuration", "completedSteps", "skippedSteps", "failedSteps"]) {
      if (!(f in r)) throw new Error(`Missing: ${f}`);
    }
  });

  await test("Dynamic params (function)", async () => {
    const s = defineStrategy({ name: "s2d", steps: [{ action: "get_balance", params: (_ctx: any) => ({}) }] });
    agent.useStrategy(s);
    const r = await agent.runStrategy("s2d");
    if (r.completedSteps !== 1) throw new Error("Failed");
  });

  sectionEnd("Basic Execution");

  // SECTION 3: Conditions
  header("3", 3, "Conditions");

  await test("Condition false -> skipped", async () => {
    const s = defineStrategy({ name: "s3a", steps: [{ action: "get_balance", params: {}, condition: () => false }] });
    agent.useStrategy(s);
    const r = await agent.runStrategy("s3a");
    if (r.skippedSteps !== 1) throw new Error(`Skipped: ${r.skippedSteps}`);
  });

  await test("Condition true -> executes", async () => {
    const s = defineStrategy({ name: "s3b", steps: [{ action: "get_balance", params: {}, condition: () => true }] });
    agent.useStrategy(s);
    const r = await agent.runStrategy("s3b");
    if (r.completedSteps !== 1) throw new Error(`Completed: ${r.completedSteps}`);
  });

  await test("Condition depends on previous result", async () => {
    const s = defineStrategy({ name: "s3c", steps: [
      { id: "bal", action: "get_balance", params: {} },
      { action: "get_balance", params: {}, condition: (ctx: any) => parseFloat(ctx.results.bal?.balance || "0") > 999999 },
    ] });
    agent.useStrategy(s);
    const r = await agent.runStrategy("s3c");
    if (r.skippedSteps !== 1) throw new Error("Step 2 should be skipped");
  });

  await test("Condition throws -> skipped", async () => {
    const s = defineStrategy({ name: "s3d", steps: [
      { action: "get_balance", params: {}, condition: () => { throw new Error("boom"); } },
    ] });
    agent.useStrategy(s);
    const r = await agent.runStrategy("s3d");
    if (r.skippedSteps !== 1) throw new Error("Should skip");
  });

  sectionEnd("Conditions");

  // SECTION 4: Error Handling
  header("4", 4, "Error Handling");

  await test("onError='stop' stops strategy", async () => {
    const s = defineStrategy({ name: "s4a", onError: () => "stop" as const, steps: [
      { action: "nonexistent_xyz", params: {} },
      { action: "get_balance", params: {} },
    ] });
    agent.useStrategy(s);
    const r = await agent.runStrategy("s4a");
    if (r.failedSteps !== 1) throw new Error(`Failed: ${r.failedSteps}`);
    if (r.completedSteps !== 0) throw new Error("Step 2 should not run");
  });

  await test("onError='continue' continues", async () => {
    const s = defineStrategy({ name: "s4b", onError: () => "continue" as const, steps: [
      { action: "nonexistent_xyz", params: {} },
      { action: "get_balance", params: {} },
    ] });
    agent.useStrategy(s);
    const r = await agent.runStrategy("s4b");
    if (r.completedSteps !== 1) throw new Error("Step 2 should run");
  });

  await test("Wait action", async () => {
    const s = defineStrategy({ name: "s4c", steps: [{ action: "wait", params: { ms: 100 } }] });
    agent.useStrategy(s);
    const r = await agent.runStrategy("s4c");
    if (r.completedSteps !== 1) throw new Error("Wait failed");
    if (r.totalDuration < 90) throw new Error("Too fast");
    console.log(`     Waited ${r.totalDuration}ms`);
  });

  sectionEnd("Error Handling");

  // SECTION 5: Transform & Callbacks
  header("5", 5, "Transform & Callbacks");

  await test("Transform modifies result", async () => {
    const s = defineStrategy({ name: "s5a", steps: [
      { id: "b", action: "get_balance", params: {}, transform: (r: any) => ({ custom: r.balance }) },
    ] });
    agent.useStrategy(s);
    const r = await agent.runStrategy("s5a");
    if (!r.steps[0].result?.custom) throw new Error("Transform not applied");
  });

  await test("onResult fires", async () => {
    let fired = false;
    const s = defineStrategy({ name: "s5b", steps: [
      { action: "get_balance", params: {}, onResult: () => { fired = true; } },
    ] });
    agent.useStrategy(s);
    await agent.runStrategy("s5b");
    if (!fired) throw new Error("Not fired");
  });

  await test("onComplete fires", async () => {
    let got: any[] = [];
    const s = defineStrategy({ name: "s5c", steps: [{ action: "get_balance", params: {} }], onComplete: (r) => { got = r; } });
    agent.useStrategy(s);
    await agent.runStrategy("s5c");
    if (got.length === 0) throw new Error("Not fired");
  });

  sectionEnd("Transform & Callbacks");

  // SECTION 6: Scheduling
  header("6", 6, "Scheduling");

  await test("every 1h = 3600000", async () => { if (parseSchedule("every 1h") !== 3600000) throw new Error("Wrong"); });
  await test("every 30m = 1800000", async () => { if (parseSchedule("every 30m") !== 1800000) throw new Error("Wrong"); });
  await test("every 5s = 5000", async () => { if (parseSchedule("every 5s") !== 5000) throw new Error("Wrong"); });
  await test("every 1d = 86400000", async () => { if (parseSchedule("every 1d") !== 86400000) throw new Error("Wrong"); });
  await test("once = null", async () => { if (parseSchedule("once") !== null) throw new Error("Wrong"); });
  await test("invalid throws", async () => {
    try { parseSchedule("bad"); throw new Error("Should throw"); } catch (e: any) { if (!e.message.includes("Invalid")) throw e; }
  });

  sectionEnd("Scheduling");

  // SECTION 7: Context Persistence
  header("7", 7, "Context Persistence");

  await test("Variables persist across runs", async () => {
    const s = defineStrategy({ name: "s7a", steps: [
      { action: "get_balance", params: {}, onResult: (_r: any, ctx: any) => { ctx.setVariable("n", (ctx.getVariable("n") || 0) + 1); } },
    ] });
    agent.useStrategy(s);
    await agent.runStrategy("s7a");
    await agent.runStrategy("s7a");
    const ctx = (agent as any).strategyRunner.getContext("s7a");
    if (ctx.getVariable("n") !== 2) throw new Error(`n=${ctx.getVariable("n")}`);
  });

  await test("runCount increments", async () => {
    const ctx = (agent as any).strategyRunner.getContext("s7a");
    if (ctx.runCount !== 2) throw new Error(`runCount=${ctx.runCount}`);
  });

  sectionEnd("Context Persistence");

  // SECTION 8: Event Hooks
  header("8", 8, "Event Hooks");

  await test("Lifecycle hooks fire", async () => {
    const events: string[] = [];
    const runner = new StrategyRunner(agent, {
      onStepStart: (_n, step) => events.push("start:" + step.action),
      onStepComplete: (_n, _s, _r) => events.push("complete"),
      onRunComplete: (_r) => events.push("done"),
    });
    runner.use(defineStrategy({ name: "s8a", steps: [{ action: "get_balance", params: {} }] }));
    await runner.run("s8a");
    if (!events.includes("start:get_balance") || !events.includes("complete") || !events.includes("done")) throw new Error(`Events: ${events}`);
  });

  await test("onStepSkipped fires", async () => {
    let skipped = "";
    const runner = new StrategyRunner(agent, { onStepSkipped: (_n, step) => { skipped = step.action; } });
    runner.use(defineStrategy({ name: "s8b", steps: [{ action: "get_balance", params: {}, condition: () => false }] }));
    await runner.run("s8b");
    if (skipped !== "get_balance") throw new Error("Not fired");
  });

  await test("onStepError fires", async () => {
    let err = "";
    const runner = new StrategyRunner(agent, { onStepError: (_n, _s, e) => { err = e.message; } });
    runner.use(defineStrategy({ name: "s8c", onError: () => "continue" as const, steps: [{ action: "nope_xyz", params: {} }] }));
    await runner.run("s8c");
    if (!err) throw new Error("Not fired");
  });

  sectionEnd("Event Hooks");

  // SECTION 9: Built-in Templates
  header("9", 9, "Built-in Templates");

  await test("DCA template", async () => {
    const s = createDcaStrategy({ token: "TON", amount: "1", schedule: "every 1h" });
    if (s.steps.length < 2) throw new Error("Too few steps");
    console.log(`     ${s.name}: ${s.steps.length} steps`);
  });

  await test("Price Monitor template", async () => {
    const s = createPriceMonitorStrategy({ token: "TON" });
    if (s.steps.length < 1) throw new Error("Too few steps");
  });

  await test("Rebalance template", async () => {
    const s = createRebalanceStrategy({});
    if (s.steps.length < 1) throw new Error("Too few steps");
  });

  await test("Reputation Guard template", async () => {
    const s = createReputationGuardStrategy({ agentId: "test", minScore: 50 });
    if (s.steps.length < 1) throw new Error("Too few steps");
  });

  sectionEnd("Built-in Templates");

  // SECTION 10: Integration
  header("10", 10, "Agent Integration");

  await test("useStrategy is chainable", async () => {
    const s1 = defineStrategy({ name: "ch1", steps: [{ action: "get_balance", params: {} }] });
    const s2 = defineStrategy({ name: "ch2", steps: [{ action: "get_balance", params: {} }] });
    if (agent.useStrategy(s1).useStrategy(s2) !== agent) throw new Error("Not chainable");
  });

  await test("stopAllStrategies works", async () => {
    agent.stopAllStrategies();
    if (agent.getActiveStrategies().length !== 0) throw new Error("Still active");
  });

  await test("Real 2-step on-chain", async () => {
    const s = defineStrategy({ name: "s10r", steps: [
      { id: "b", action: "get_balance", params: {} },
      { id: "w", action: "get_wallet_info", params: {} },
    ] });
    agent.useStrategy(s);
    const r = await agent.runStrategy("s10r");
    if (r.completedSteps !== 2) throw new Error(`Completed: ${r.completedSteps}`);
    console.log(`     Balance: ${r.steps[0].result?.balance} | Status: ${r.steps[1].result?.status}`);
  });

  sectionEnd("Agent Integration");

  // SUMMARY
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const total = passed + failed;
  console.log(`\n\n${"=".repeat(W)}\n  Strategy Engine Results\n${"=".repeat(W)}`);
  console.log(`\n  Passed:  ${passed}\n  Failed:  ${failed}\n  Total:   ${total}\n  Time:    ${elapsed}s\n`);
  for (const s of sectionResults) {
    const icon = s.failed === 0 ? "OK" : "FAIL";
    console.log(`  [${icon}] ${s.name.padEnd(30)} ${s.passed}/${s.passed + s.failed}`);
  }
  if (errors.length > 0) { console.log("\n  Errors:"); for (const e of errors) console.log(`  - ${e}`); }
  if (failed === 0) console.log(`\n  ALL ${total} TESTS PASSED\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
