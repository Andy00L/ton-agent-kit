// tests/14-strategy-engine.ts — Section 13: Strategy Engine
import { createTestnetAgent, createTestContext, TestResult } from "./_setup";

export async function run(): Promise<TestResult> {
  const start = Date.now();
  const { agent, wallet, ownAddress, friendlyAddress, actions } = await createTestnetAgent();
  const { test, testError, skip, result } = createTestContext();

  await test("agent.useStrategy exists", async () => {
    if (typeof agent.useStrategy !== "function") throw new Error("useStrategy not found");
  });

  await test("agent.runStrategy exists", async () => {
    if (typeof agent.runStrategy !== "function") throw new Error("runStrategy not found");
  });

  await test("agent.stopAllStrategies exists", async () => {
    if (typeof agent.stopAllStrategies !== "function") throw new Error("stopAllStrategies not found");
  });

  await test("defineStrategy creates valid strategy", async () => {
    const { defineStrategy } = require("../packages/strategies/src/index");
    const s = defineStrategy({ name: "test-strat", steps: [{ action: "get_balance", params: {} }] });
    if (s.name !== "test-strat") throw new Error("Wrong name");
    if (s.steps[0].id !== "step_0") throw new Error("Auto-ID not assigned");
    console.log(`     OK: ${s.name} with ${s.steps.length} step(s)`);
  });

  await test("parseSchedule works", async () => {
    const { parseSchedule } = require("../packages/strategies/src/index");
    if (parseSchedule("every 1h") !== 3600000) throw new Error("1h wrong");
    if (parseSchedule("every 30m") !== 1800000) throw new Error("30m wrong");
    if (parseSchedule("once") !== null) throw new Error("once wrong");
    console.log(`     1h=3600000 | 30m=1800000 | once=null`);
  });

  await test("Run 1-step strategy (get_balance)", async () => {
    const { defineStrategy } = require("../packages/strategies/src/index");
    const s = defineStrategy({ name: "bal-test", steps: [{ action: "get_balance", params: {} }] });
    agent.useStrategy(s);
    const r = await agent.runStrategy("bal-test");
    if (r.completedSteps !== 1) throw new Error(`Expected 1 completed, got ${r.completedSteps}`);
    console.log(`     Balance: ${r.steps[0].result?.balance} TON | Duration: ${r.totalDuration}ms`);
  });

  return result(start);
}

if (import.meta.main) {
  run().then((r) => {
    console.log(`\n${r.passed} passed, ${r.failed} failed (${r.duration}ms)`);
    if (r.errors.length) r.errors.forEach((e) => console.log(`  - ${e}`));
    process.exit(r.failed > 0 ? 1 : 0);
  });
}
