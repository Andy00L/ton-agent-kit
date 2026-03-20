// tests/07-staking-plugin.ts — Section 6: Staking Plugin
import { createTestnetAgent, createMainnetAgent, createTestContext, TestResult } from "./_setup";

export async function run(): Promise<TestResult> {
  const start = Date.now();
  const { agent, wallet, ownAddress, friendlyAddress, actions } = await createTestnetAgent();
  const { test, testError, skip, result } = createTestContext();

  await test("get_staking_info (own)", async () => {
    const r = await agent.runAction("get_staking_info", {});
    console.log(`     Pools: ${r.pools?.length || 0}`);
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
