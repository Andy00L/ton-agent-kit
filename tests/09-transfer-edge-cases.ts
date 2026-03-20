// tests/09-transfer-edge-cases.ts — Section 8: Transfer Edge Cases
import { createTestnetAgent, createMainnetAgent, createTestContext, TestResult } from "./_setup";

export async function run(): Promise<TestResult> {
  const start = Date.now();
  const { agent, wallet, ownAddress, friendlyAddress, actions } = await createTestnetAgent();
  const { test, testError, skip, result } = createTestContext();

  await testError(
    "transfer_ton (0 amount — rejects)",
    () => agent.runAction("transfer_ton", { to: ownAddress, amount: "0" }),
    "greater than 0",
  );

  await testError(
    "transfer_ton (negative amount — rejects)",
    () => agent.runAction("transfer_ton", { to: ownAddress, amount: "-1" }),
    "greater than 0",
  );

  await testError(
    "transfer_ton (999999 TON — insufficient balance)",
    () => agent.runAction("transfer_ton", { to: ownAddress, amount: "999999" }),
    "Insufficient",
  );

  await testError(
    "transfer_ton (invalid address — rejects)",
    () => agent.runAction("transfer_ton", { to: "bad-addr", amount: "0.01" }),
    "Unknown address",
  );

  await testError(
    "transfer_ton (empty address — rejects)",
    () => agent.runAction("transfer_ton", { to: "", amount: "0.01" }),
    "",
  );

  return result(start);
}

if (import.meta.main) {
  run().then((r) => {
    console.log(`\n${r.passed} passed, ${r.failed} failed (${r.duration}ms)`);
    if (r.errors.length) r.errors.forEach((e) => console.log(`  - ${e}`));
    process.exit(r.failed > 0 ? 1 : 0);
  });
}
