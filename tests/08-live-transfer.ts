// tests/08-live-transfer.ts — Section 7: Live Transfer
import { createTestnetAgent, createMainnetAgent, createTestContext, TestResult } from "./_setup";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function run(): Promise<TestResult> {
  const start = Date.now();
  const { agent, wallet, ownAddress, friendlyAddress, actions } = await createTestnetAgent();
  const { test, testError, skip, result } = createTestContext();

  // Get initial balance for later verification
  const bal = await test("get_balance (initial — for later verification)", async () => {
    const r = await agent.runAction("get_balance", {});
    console.log(`     Balance: ${r.balance} TON`);
    if (parseFloat(r.balance) <= 0) throw new Error("Balance is 0");
    return r;
  });

  // ── simulate flag (dry-run) ──
  await test("transfer_ton simulate=true (dry-run — does NOT send)", async () => {
    const r = await agent.runAction("transfer_ton", {
      to: "0QBQ-vTFmOnzUMYx66UHSljnn1DzP9iCE8qw77flvWS9VXK3",
      amount: "0.01",
      simulate: true,
    });
    console.log(`     simulated=${r.simulated} sent=${r.sent} success=${r.success}`);
    console.log(`     gasUsed=${r.gasUsed} fee=${r.estimatedFee} risk=${r.risk}`);
    if (r.simulated !== true) throw new Error("Expected simulated=true");
    if (r.sent !== false) throw new Error("Expected sent=false (dry-run)");
    if (!r.success) throw new Error(`Expected success, got: ${r.message}`);
    if (!r.balanceChange || !r.balanceChange.startsWith("-")) throw new Error(`Expected negative balanceChange, got: ${r.balanceChange}`);
  });

  // ── simulateFirst flag (success path) ──
  await test("transfer_ton simulateFirst=true (sim OK → sends)", async () => {
    const r = await agent.runAction("transfer_ton", {
      to: "0QBQ-vTFmOnzUMYx66UHSljnn1DzP9iCE8qw77flvWS9VXK3",
      amount: "0.01",
      simulateFirst: true,
      comment: "simulateFirst-test",
    });
    console.log(`     sent=${r.sent} simulated=${r.simulated} status=${r.status}`);
    if (r.sent !== true) throw new Error("Expected sent=true");
    if (r.simulated !== true) throw new Error("Expected simulated=true");
  });

  console.log(`\n  ⏳ Waiting 10s for TX confirmation...\n`);
  await delay(10000);

  // ── simulateFirst flag (failure path) ──
  await test("transfer_ton simulateFirst=true (999999 TON — aborts)", async () => {
    // Note: the balance check fires before BOC construction, so this throws
    // directly. That's the correct behavior — fast-fail for obvious cases.
    try {
      const r = await agent.runAction("transfer_ton", {
        to: "0QBQ-vTFmOnzUMYx66UHSljnn1DzP9iCE8qw77flvWS9VXK3",
        amount: "999999",
        simulateFirst: true,
      });
      // If we reach here, the handler returned without throwing (balance check bypassed)
      if (r.sent !== false) throw new Error("Expected sent=false");
      if (r.success !== false) throw new Error("Expected success=false");
      console.log(`     Aborted: ${r.reason || r.message}`);
    } catch (err: any) {
      // Balance guard threw — also correct
      if (err.message.includes("Insufficient")) {
        console.log(`     Correctly rejected: ${err.message.slice(0, 80)}`);
      } else {
        throw err;
      }
    }
  });

  // ── Normal mode (unchanged behavior) ──
  await test("transfer_ton (0.01 TON → wallet B — normal mode)", async () => {
    const r = await agent.runAction("transfer_ton", {
      to: "0QBQ-vTFmOnzUMYx66UHSljnn1DzP9iCE8qw77flvWS9VXK3",
      amount: "0.01",
      comment: "test-all-actions-v4",
    });
    console.log(`     Status: ${r.status} | Explorer: ${r.explorerUrl}`);
    if (r.simulated !== undefined) throw new Error("Normal mode should NOT have simulated field");
  });

  console.log(`\n  ⏳ Waiting 10s for TX confirmation...\n`);
  await delay(10000);

  await test("verify balance decreased after transfer", async () => {
    const r = await agent.runAction("get_balance", {});
    const diff = parseFloat(bal!.balance) - parseFloat(r.balance);
    console.log(`     Balance: ${r.balance} TON (−${diff.toFixed(4)} TON)`);
    if (diff <= 0) throw new Error("Balance did not decrease");
  });

  await test("transfer_ton (self-transfer 0.001 TON)", async () => {
    const r = await agent.runAction("transfer_ton", {
      to: ownAddress,
      amount: "0.001",
      comment: "self-test",
    });
    console.log(`     Status: ${r.status}`);
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
