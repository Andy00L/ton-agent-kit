// tests/16-cache-layer.ts — Section 15: Cache Layer
import { createTestnetAgent, createTestContext, TestResult } from "./_setup";

export async function run(): Promise<TestResult> {
  const start = Date.now();
  const { agent, wallet, ownAddress, friendlyAddress, actions } = await createTestnetAgent();
  const { test, testError, skip, result } = createTestContext();

  await test("Cache exists on agent", async () => {
    if (!agent.cache) throw new Error("cache not found");
    const s = agent.cache.stats();
    console.log(`     Enabled: ${s.enabled} | Size: ${s.size}`);
  });

  await test("Cache hit on repeated call", async () => {
    agent.cache.clear();
    const r1 = await agent.runAction("get_balance", {});
    const r2 = await agent.runAction("get_balance", {});
    const s = agent.cache.stats();
    if (s.hits < 1) throw new Error("Expected hit");
    if (r1.balance !== r2.balance) throw new Error("Results differ");
    console.log(`     Hits: ${s.hits} | Balance: ${r1.balance}`);
  });

  await test("Different params = different entries", async () => {
    agent.cache.clear();
    await agent.runAction("get_balance", {});
    await agent.runAction("get_balance", { address: "0:50faf4c598e9f350c631eba5074a58e79f50f33fd88213cab0efb7e5bd64bd55" });
    if (agent.cache.stats().size < 2) throw new Error("Should be 2 entries");
    console.log(`     Size: ${agent.cache.stats().size}`);
  });

  await test("Write actions NOT cached", async () => {
    if (agent.cache.isCacheable("transfer_ton")) throw new Error("transfer_ton cacheable");
    if (agent.cache.isCacheable("create_escrow")) throw new Error("create_escrow cacheable");
  });

  await test("Read actions ARE cached", async () => {
    if (!agent.cache.isCacheable("get_balance")) throw new Error("get_balance not cacheable");
    if (!agent.cache.isCacheable("get_price")) throw new Error("get_price not cacheable");
  });

  await test("invalidate clears action", async () => {
    agent.cache.clear();
    await agent.runAction("get_balance", {});
    agent.cache.invalidate("get_balance");
    if (agent.cache.stats().size !== 0) throw new Error("Not cleared");
  });

  await test("clear resets everything", async () => {
    await agent.runAction("get_balance", {});
    agent.cache.clear();
    const s = agent.cache.stats();
    if (s.size !== 0 || s.hits !== 0) throw new Error("Not reset");
  });

  await test("invalidateRelated works", async () => {
    agent.cache.clear();
    await agent.runAction("get_balance", {});
    agent.cache.invalidateRelated("transfer_ton");
    if (agent.cache.get("get_balance", {}) !== null) throw new Error("Should be invalidated");
  });

  await test("TTL per action", async () => {
    if (agent.cache.getTTL("get_price") !== 30000) throw new Error("price TTL");
    if (agent.cache.getTTL("get_balance") !== 10000) throw new Error("balance TTL");
    if (agent.cache.getTTL("resolve_domain") !== 300000) throw new Error("domain TTL");
    console.log(`     price=30s | balance=10s | domain=5m`);
  });

  await test("Hit rate calculation", async () => {
    agent.cache.clear();
    await agent.runAction("get_balance", {});
    await agent.runAction("get_balance", {});
    await agent.runAction("get_balance", {});
    const s = agent.cache.stats();
    if (s.hits < 2) throw new Error(`Hits: ${s.hits}`);
    console.log(`     Rate: ${s.hitRate}`);
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
