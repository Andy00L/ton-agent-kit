// tests/02-token-plugin.ts — Section 1: Token Plugin
import { createTestnetAgent, createMainnetAgent, createTestContext, TestResult } from "./_setup";

export async function run(): Promise<TestResult> {
  const start = Date.now();
  const { agent, wallet, ownAddress, friendlyAddress, actions } = await createTestnetAgent();
  const { agent: mainAgent } = await createMainnetAgent();
  const { test, testError, skip, result } = createTestContext();

  const bal = await test("get_balance (own wallet — no params)", async () => {
    const r = await agent.runAction("get_balance", {});
    console.log(`     Balance: ${r.balance} TON`);
    if (parseFloat(r.balance) <= 0) throw new Error("Balance is 0");
    return r;
  });

  await test("get_balance (own — explicit raw address)", async () => {
    const r = await agent.runAction("get_balance", { address: ownAddress });
    console.log(`     Balance: ${r.balance} TON`);
  });

  await test("get_balance (own — friendly address)", async () => {
    const r = await agent.runAction("get_balance", { address: friendlyAddress });
    console.log(`     Balance: ${r.balance} TON`);
  });

  await test("get_balance (other wallet)", async () => {
    const r = await agent.runAction("get_balance", {
      address: "0QBQ-vTFmOnzUMYx66UHSljnn1DzP9iCE8qw77flvWS9VXK3",
    });
    console.log(`     Balance: ${r.balance} TON`);
  });

  await test("get_balance (empty string — fallback to own)", async () => {
    const r = await agent.runAction("get_balance", { address: "" });
    console.log(`     Balance: ${r.balance} TON (own wallet fallback)`);
  });

  await testError(
    "get_balance (invalid address — rejects)",
    () => agent.runAction("get_balance", { address: "not-an-address" }),
    "Unknown address",
  );

  await testError(
    "get_balance (random string — rejects)",
    () => agent.runAction("get_balance", { address: "abc123xyz" }),
    "Unknown address",
  );

  await test("get_jetton_balance (USDT on testnet)", async () => {
    const r = await agent.runAction("get_jetton_balance", {
      jettonAddress: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    });
    console.log(`     Balance: ${r.balance} | Symbol: ${r.symbol}`);
  });

  await test("get_jetton_info (USDT — mainnet)", async () => {
    const r = await mainAgent.runAction("get_jetton_info", {
      jettonAddress: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    });
    console.log(`     Name: ${r.name || r.friendlyAddress?.slice(0, 24) + "..."}`);
  });

  // ── Simulate Transaction ──
  console.log(`\n  ── Simulate Transaction ──`);

  await test("simulate_transaction (0.01 TON — valid transfer)", async () => {
    const r = await agent.runAction("simulate_transaction", {
      to: "0QBQ-vTFmOnzUMYx66UHSljnn1DzP9iCE8qw77flvWS9VXK3",
      amount: "0.01",
      comment: "simulation-test",
    });
    console.log(`     Success: ${r.success} | Fee: ${r.estimatedFee} | Risk: ${r.risk}`);
    console.log(`     Balance Δ: ${r.balanceChange} | Dest Δ: ${r.destinationBalanceChange}`);
    console.log(`     Message: ${r.message}`);
    if (!r.success) throw new Error(`Expected success, got: ${r.message}`);
    if (r.estimatedFee === "0") throw new Error("Expected non-zero fee");
  });

  await test("simulate_transaction (999999 TON — emulation does not check balance)", async () => {
    const r = await agent.runAction("simulate_transaction", {
      to: "0QBQ-vTFmOnzUMYx66UHSljnn1DzP9iCE8qw77flvWS9VXK3",
      amount: "999999",
    });
    // TONAPI emulation validates message structure, NOT sender balance.
    // The balance guard in transfer_ton is what catches insufficient funds.
    // So emulation succeeds here — the message is structurally valid.
    console.log(`     Success: ${r.success} | Risk: ${r.risk}`);
    console.log(`     Message: ${r.message}`);
    if (!r.success) throw new Error("Emulation should succeed (it doesn't check balance)");
    if (!r.estimatedFee || r.estimatedFee === "0") throw new Error("Expected non-zero fee estimate");
  });

  await test("simulate_transaction (result has expected fields)", async () => {
    const r = await agent.runAction("simulate_transaction", {
      to: ownAddress,
      amount: "0.001",
    });
    const requiredFields = ["success", "gasUsed", "balanceChange", "destinationBalanceChange", "estimatedFee", "risk", "message"];
    for (const field of requiredFields) {
      if (!(field in r)) throw new Error(`Missing field: ${field}`);
    }
    console.log(`     All ${requiredFields.length} required fields present`);
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
