// tests/05-dns-plugin.ts — Section 4: DNS Plugin
import { createTestnetAgent, createMainnetAgent, createTestContext, TestResult } from "./_setup";

export async function run(): Promise<TestResult> {
  const start = Date.now();
  const { agent, wallet, ownAddress, friendlyAddress, actions } = await createTestnetAgent();
  const { test, testError, skip, result } = createTestContext();

  const domain = await test("resolve_domain (foundation.ton)", async () => {
    const r = await agent.runAction("resolve_domain", { domain: "foundation.ton" });
    if (!r.resolved) throw new Error("Not resolved");
    console.log(`     → ${r.address.slice(0, 24)}...`);
    return r;
  });

  await test("resolve_domain (auto-add .ton suffix)", async () => {
    const r = await agent.runAction("resolve_domain", { domain: "foundation" });
    console.log(`     Auto-suffix: ${r.resolved}`);
  });

  await test("resolve_domain (nonexistent domain)", async () => {
    const r = await agent.runAction("resolve_domain", { domain: "thisdoesnotexist99999.ton" });
    if (r.resolved !== false) throw new Error("Should not resolve");
    console.log(`     Resolved: false (correct)`);
  });

  if (domain?.address) {
    await test("lookup_address (reverse — foundation.ton address)", async () => {
      const r = await agent.runAction("lookup_address", { address: domain.address });
      console.log(`     Found domain info for ${domain.address.slice(0, 20)}...`);
    });
  }

  await test("get_domain_info (foundation.ton)", async () => {
    const r = await agent.runAction("get_domain_info", { domain: "foundation.ton" });
    console.log(`     Domain: ${r.domain}`);
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
