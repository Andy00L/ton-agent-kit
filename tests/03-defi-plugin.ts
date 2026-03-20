// tests/03-defi-plugin.ts — Section 2: DeFi Plugin
import { createTestnetAgent, createMainnetAgent, createTestContext, TestResult } from "./_setup";

export async function run(): Promise<TestResult> {
  const start = Date.now();
  const { agent, wallet, ownAddress, friendlyAddress, actions } = await createTestnetAgent();
  const { agent: mainAgent } = await createMainnetAgent();
  const { test, testError, skip, result } = createTestContext();

  await test("get_price (USDT — by address)", async () => {
    const r = await mainAgent.runAction("get_price", {
      token: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    });
    console.log(`     $${r.priceUSD} USD | ${r.priceTON} TON`);
    if (r.priceUSD === "unknown") throw new Error("Unknown price");
  });

  await test("get_price (USDT — by symbol)", async () => {
    const r = await mainAgent.runAction("get_price", { token: "USDT" });
    console.log(`     $${r.priceUSD} USD`);
  });

  await test("get_price (invalid token — returns unknown)", async () => {
    const r = await mainAgent.runAction("get_price", { token: "invalid-token-xyz" });
    if (r.priceUSD !== "unknown") throw new Error("Expected unknown");
    console.log(`     Price: ${r.priceUSD} (correctly unknown)`);
  });

  // ── swap_best_price (schema-only — no real swap in automated tests) ──
  console.log(`\n  ── swap_best_price ──`);

  await test("swap_best_price action registered", async () => {
    const action = actions.find((a: any) => a.name === "swap_best_price");
    if (!action) throw new Error("swap_best_price action not found");
    const props = Object.keys(action.schema._zod?.def?.shape || {});
    console.log(`     Found: swap_best_price`);
  });

  await test("swap_best_price schema validates", async () => {
    const action = actions.find((a: any) => a.name === "swap_best_price");
    if (!action) throw new Error("Not found");
    action.schema.parse({ fromToken: "TON", toToken: "USDT", amount: "1" });
    action.schema.parse({ fromToken: "TON", toToken: "USDT", amount: "10", slippage: 0.5, quoteTimeout: 3 });
    console.log(`     Schema valid (required + optional params)`);
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
