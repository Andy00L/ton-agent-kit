// tests/04-nft-plugin.ts — Section 3: NFT Plugin
import { createTestnetAgent, createMainnetAgent, createTestContext, TestResult } from "./_setup";

export async function run(): Promise<TestResult> {
  const start = Date.now();
  const { agent: mainAgent } = await createMainnetAgent();
  const { test, testError, skip, result } = createTestContext();

  await test("get_nft_collection (Telegram Usernames — mainnet)", async () => {
    const r = await mainAgent.runAction("get_nft_collection", {
      collectionAddress: "EQCA14o1-VWhS2efqoh_9M1b_A9DtKTuoqfmkn83AbJzwnPi",
    });
    console.log(`     Collection: ${r.name || "found"}`);
  });

  await testError(
    "get_nft_collection (invalid address)",
    () => mainAgent.runAction("get_nft_collection", { collectionAddress: "invalid" }),
    "Failed",
  );

  skip("get_nft_info", "needs known NFT address on testnet");

  return result(start);
}

if (import.meta.main) {
  run().then((r) => {
    console.log(`\n${r.passed} passed, ${r.failed} failed (${r.duration}ms)`);
    if (r.errors.length) r.errors.forEach((e) => console.log(`  - ${e}`));
    process.exit(r.failed > 0 ? 1 : 0);
  });
}
