// tests/13-cross-plugin-edge.ts — Section 12: Cross-Plugin Edge Cases
import {
  createTestnetAgent,
  createMainnetAgent,
  createTestContext,
  TestResult,
  TonAgentKit,
  TokenPlugin,
  DefiPlugin,
  DnsPlugin,
} from "./_setup";

export async function run(): Promise<TestResult> {
  const start = Date.now();
  const { agent, wallet, ownAddress, friendlyAddress, actions } = await createTestnetAgent();
  const { agent: mainAgent } = await createMainnetAgent();
  const { test, testError, skip, result } = createTestContext();

  await test("runAction with unknown action name — throws", async () => {
    try {
      await agent.runAction("nonexistent_action", {});
      throw new Error("Should have thrown");
    } catch (err: any) {
      if (err.message.includes("nonexistent_action") || err.message.includes("not found") || err.message.includes("Unknown")) {
        console.log(`     Correctly rejected unknown action`);
        return;
      }
      throw err;
    }
  });

  await test("plugin .use() is chainable", async () => {
    const a = new TonAgentKit(wallet, "https://testnet-v4.tonhubapi.com")
      .use(TokenPlugin)
      .use(DefiPlugin)
      .use(DnsPlugin);
    const expected = TokenPlugin.actions.length + DefiPlugin.actions.length + DnsPlugin.actions.length;
    const actual = a.getAvailableActions().length;
    if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
    console.log(`     3 plugins → ${actual} actions`);
  });

  await test("single plugin agent works", async () => {
    const a = new TonAgentKit(wallet, "https://testnet-v4.tonhubapi.com").use(TokenPlugin);
    const r = await a.runAction("get_balance", {});
    console.log(`     Single plugin balance: ${r.balance} TON`);
  });

  await test("mainnet agent reads different data", async () => {
    const testBal = await agent.runAction("get_balance", {});
    const mainBal = await mainAgent.runAction("get_balance", {});
    console.log(`     Testnet: ${testBal.balance} TON | Mainnet: ${mainBal.balance} TON`);
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
