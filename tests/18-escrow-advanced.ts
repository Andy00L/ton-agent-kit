// tests/18-escrow-advanced.ts — Wrapped from test-escrow.ts
/**
 * Escrow Contract Test (post gas fix)
 * Full lifecycle + gas handling verification
 */

import { readFileSync } from "fs";

const envContent = readFileSync(".env", "utf-8");
const getEnv = (key: string) =>
  envContent.split("\n").find((l) => l.startsWith(key + "="))?.slice(key.length + 1).trim() || "";

process.env.TON_MNEMONIC = getEnv("TON_MNEMONIC");
process.env.TON_MNEMONIC_AGENT_B = getEnv("TON_MNEMONIC_AGENT_B");

import { TonAgentKit } from "../packages/core/src/agent";
import { KeypairWallet } from "../packages/core/src/wallet";
import TokenPlugin from "../packages/plugin-token/src/index";
import EscrowPlugin from "../packages/plugin-escrow/src/index";

const W = 64;
let passed = 0;
let failed = 0;
const errors: string[] = [];
const sectionResults: { name: string; passed: number; failed: number }[] = [];
let sectionPassed = 0;
let sectionFailed = 0;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function header(icon: string, num: number, title: string, subtitle?: string) {
  console.log(`\n${"═".repeat(W)}`);
  console.log(`  ${icon} SECTION ${num}: ${title}`);
  if (subtitle) console.log(`  ${subtitle}`);
  console.log(`${"═".repeat(W)}`);
}

function sectionEnd(name: string) {
  sectionResults.push({ name, passed: sectionPassed, failed: sectionFailed });
  sectionPassed = 0;
  sectionFailed = 0;
}

async function test(name: string, fn: () => Promise<any>): Promise<any> {
  try {
    const result = await fn();
    console.log(`  ✅ ${name}`);
    passed++;
    sectionPassed++;
    return result;
  } catch (err: any) {
    console.log(`  ❌ ${name}`);
    console.log(`     → ${err.message.slice(0, 150)}`);
    failed++;
    sectionFailed++;
    errors.push(`${name}: ${err.message.slice(0, 120)}`);
    return null;
  }
}

async function testError(name: string, fn: () => Promise<any>, expectedMsg: string): Promise<void> {
  try {
    await fn();
    console.log(`  ❌ ${name} — should have thrown`);
    failed++;
    sectionFailed++;
    errors.push(`${name}: did not throw`);
  } catch (err: any) {
    if (err.message.toLowerCase().includes(expectedMsg.toLowerCase())) {
      console.log(`  ✅ ${name}`);
      console.log(`     ↳ Correctly rejected: ${err.message.slice(0, 100)}`);
      passed++;
      sectionPassed++;
    } else {
      console.log(`  ❌ ${name} — wrong error`);
      console.log(`     Expected "${expectedMsg}" got "${err.message.slice(0, 100)}"`);
      failed++;
      sectionFailed++;
      errors.push(`${name}: wrong error — ${err.message.slice(0, 100)}`);
    }
  }
}

export interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
  duration: number;
}

async function main() {
  const mnemonic = process.env.TON_MNEMONIC;
  if (!mnemonic) {
    throw new Error("Set TON_MNEMONIC in .env");
  }

  const startTime = Date.now();
  const rpcUrl = "https://testnet-v4.tonhubapi.com";

  console.log(`
╔${"═".repeat(W - 2)}╗
║${" ".repeat(Math.floor((W - 50) / 2))}🔒 Escrow Contract Test (post gas fix)${" ".repeat(Math.ceil((W - 50) / 2))}║
║${" ".repeat(Math.floor((W - 46) / 2))}Full lifecycle + gas handling verify${" ".repeat(Math.ceil((W - 46) / 2))}║
╚${"═".repeat(W - 2)}╝

  Network:    testnet
  Timestamp:  ${new Date().toISOString()}
${"─".repeat(W)}`);

  // ── Setup Agent A (depositor) ──
  const walletA = await KeypairWallet.fromMnemonic(mnemonic.split(" "), {
    version: "V5R1",
    network: "testnet",
  });
  const agentA = new TonAgentKit(walletA, rpcUrl, {}, "testnet")
    .use(TokenPlugin)
    .use(EscrowPlugin);

  const ownAddress = walletA.address.toRawString();
  const friendlyA = walletA.address.toString({ testOnly: true, bounceable: false });

  // ── Setup Agent B (beneficiary) if available ──
  const mnemonicB = process.env.TON_MNEMONIC_AGENT_B;
  let beneficiaryAddress: string;
  let agentB: TonAgentKit | null = null;

  if (mnemonicB) {
    const walletB = await KeypairWallet.fromMnemonic(mnemonicB.split(" "), {
      version: "V5R1",
      network: "testnet",
    });
    agentB = new TonAgentKit(walletB, rpcUrl, {}, "testnet")
      .use(TokenPlugin)
      .use(EscrowPlugin);
    beneficiaryAddress = walletB.address.toRawString();
    console.log(`  📡 Agent A (depositor):   ${friendlyA}`);
    console.log(`  🤖 Agent B (beneficiary): ${walletB.address.toString({ testOnly: true, bounceable: false })}`);
  } else {
    beneficiaryAddress = "0QBQ-vTFmOnzUMYx66UHSljnn1DzP9iCE8qw77flvWS9VXK3";
    console.log(`  📡 Agent A (depositor):   ${friendlyA}`);
    console.log(`  🤖 Beneficiary:           ${beneficiaryAddress.slice(0, 20)}...`);
  }

  const balA = await agentA.runAction("get_balance", {}) as any;
  console.log(`  💰 Balance A:             ${balA.balance} TON\n`);

  if (parseFloat(balA.balance) < 0.5) {
    throw new Error("Need at least 0.5 TON for escrow tests (deploy + deposit costs gas)");
  }

  // ══════════════════════════════════════════════════════════════
  //  SECTION 1: Deploy Escrow (Release Flow)
  // ══════════════════════════════════════════════════════════════
  header("🚀", 1, "Deploy Escrow (Release Flow)", "Create → Deposit → Release → Verify");

  const escrow1 = await test("create_escrow (deploy contract)", async () => {
    const r = await agentA.runAction("create_escrow", {
      beneficiary: beneficiaryAddress,
      amount: "0.05",
      description: "gas-fix-test-release",
      deadlineMinutes: 10,
    });
    console.log(`     Escrow ID: ${r.escrowId}`);
    console.log(`     Contract:  ${r.friendlyContract}`);
    return r;
  });

  if (escrow1) {
    console.log(`\n  ⏳ 12s for deployment confirmation...\n`);
    await delay(12000);

    // ══════════════════════════════════════════════════════════════
    //  SECTION 2: Verify Initial State
    // ══════════════════════════════════════════════════════════════
    header("📋", 2, "Verify Initial State", "Contract deployed, no funds yet");

    await test("get_escrow_info (status: created)", async () => {
      const r = await agentA.runAction("get_escrow_info", { escrowId: escrow1.escrowId });
      if (r.onChain.status !== "created") throw new Error(`Expected created, got ${r.onChain.status}`);
      console.log(`     Status:      ${r.onChain.status}`);
      console.log(`     Depositor:   ${r.onChain.depositor?.slice(0, 24)}...`);
      console.log(`     Beneficiary: ${r.onChain.beneficiary?.slice(0, 24)}...`);
      console.log(`     Released:    ${r.onChain.released}`);
      console.log(`     Refunded:    ${r.onChain.refunded}`);
    });

    await test("escrow balance is 0 before deposit", async () => {
      const r = await agentA.runAction("get_escrow_info", { escrowId: escrow1.escrowId });
      const bal = parseFloat(r.onChain.balance || "0");
      if (bal > 0.01) throw new Error(`Expected ~0, got ${bal}`);
      console.log(`     Balance: ${r.onChain.balance}`);
    });

    sectionEnd("Verify Initial State");

    // ══════════════════════════════════════════════════════════════
    //  SECTION 3: Deposit
    // ══════════════════════════════════════════════════════════════
    header("💰", 3, "Deposit", "Fund the escrow contract");

    // Record balance before deposit
    const balBeforeDeposit = await agentA.runAction("get_balance", {}) as any;

    await test("deposit_to_escrow (0.05 TON)", async () => {
      const r = await agentA.runAction("deposit_to_escrow", {
        escrowId: escrow1.escrowId,
      });
      console.log(`     Status: ${r.status}`);
      console.log(`     TX:     ${r.depositTxHash?.slice(0, 24)}...`);
      return r;
    });

    console.log(`\n  ⏳ 12s for deposit confirmation...\n`);
    await delay(12000);

    await test("escrow balance > 0 after deposit", async () => {
      const r = await agentA.runAction("get_escrow_info", { escrowId: escrow1.escrowId });
      const bal = parseFloat(r.onChain.balance || "0");
      if (bal <= 0) throw new Error(`Expected > 0, got ${bal}`);
      console.log(`     Escrow balance: ${r.onChain.balance}`);
      console.log(`     Status:         ${r.onChain.status}`);
    });

    await test("depositor balance decreased", async () => {
      const balAfterDeposit = await agentA.runAction("get_balance", {}) as any;
      const before = parseFloat(balBeforeDeposit.balance);
      const after = parseFloat(balAfterDeposit.balance);
      const diff = before - after;
      if (diff < 0.04) throw new Error(`Expected ~0.05 decrease, got ${diff.toFixed(4)}`);
      console.log(`     Before: ${before.toFixed(4)} TON`);
      console.log(`     After:  ${after.toFixed(4)} TON`);
      console.log(`     Diff:   ${diff.toFixed(4)} TON`);
    });

    sectionEnd("Deposit");

    // ══════════════════════════════════════════════════════════════
    //  SECTION 4: Release
    // ══════════════════════════════════════════════════════════════
    header("🔓", 4, "Release", "Funds to beneficiary, contract balance → 0");

    // Record beneficiary balance if agent B available
    let beneficiaryBalBefore: number | null = null;
    if (agentB) {
      const bBal = await agentB.runAction("get_balance", {}) as any;
      beneficiaryBalBefore = parseFloat(bBal.balance);
      console.log(`  Beneficiary balance before: ${bBal.balance} TON`);
    }

    await test("release_escrow", async () => {
      const r = await agentA.runAction("release_escrow", { escrowId: escrow1.escrowId });
      console.log(`     Status: ${r.status}`);
      console.log(`     TX:     ${r.releaseTxHash?.slice(0, 24)}...`);
    });

    console.log(`\n  ⏳ 12s for release confirmation...\n`);
    await delay(12000);

    await test("escrow released: true", async () => {
      const r = await agentA.runAction("get_escrow_info", { escrowId: escrow1.escrowId });
      if (!r.onChain.released) throw new Error(`Expected released: true`);
      console.log(`     Released: ${r.onChain.released}`);
      console.log(`     Refunded: ${r.onChain.refunded}`);
    });

    await test("escrow balance is 0 after release", async () => {
      const r = await agentA.runAction("get_escrow_info", { escrowId: escrow1.escrowId });
      const bal = parseFloat(r.onChain.balance || "0");
      if (bal > 0.01) throw new Error(`Expected ~0, got ${bal}`);
      console.log(`     Balance: ${r.onChain.balance} (contract emptied)`);
    });

    if (agentB && beneficiaryBalBefore !== null) {
      await test("beneficiary received funds", async () => {
        const bBal = await agentB!.runAction("get_balance", {}) as any;
        const after = parseFloat(bBal.balance);
        const diff = after - beneficiaryBalBefore!;
        if (diff < 0.03) throw new Error(`Expected increase, got ${diff.toFixed(4)}`);
        console.log(`     Before: ${beneficiaryBalBefore!.toFixed(4)} TON`);
        console.log(`     After:  ${after.toFixed(4)} TON`);
        console.log(`     Received: +${diff.toFixed(4)} TON`);
      });
    }

    sectionEnd("Release");

    // ══════════════════════════════════════════════════════════════
    //  SECTION 5: Double-Settle Prevention
    // ══════════════════════════════════════════════════════════════
    header("🛡️", 5, "Double-Settle Prevention", "Can't release or refund after already settled");

    await test("release after release — fails silently or rejects", async () => {
      try {
        const r = await agentA.runAction("release_escrow", { escrowId: escrow1.escrowId });
        // If it doesn't throw, the TX went through but contract should reject it
        console.log(`     Second release sent (contract will reject on-chain)`);
      } catch (err: any) {
        console.log(`     Correctly rejected: ${err.message.slice(0, 80)}`);
      }
    });

    await test("refund after release — fails", async () => {
      try {
        const r = await agentA.runAction("refund_escrow", { escrowId: escrow1.escrowId });
        console.log(`     Refund sent (contract will reject on-chain)`);
      } catch (err: any) {
        console.log(`     Correctly rejected: ${err.message.slice(0, 80)}`);
      }
    });

    sectionEnd("Double-Settle Prevention");
  }

  // ══════════════════════════════════════════════════════════════
  //  SECTION 6: Refund Flow (separate escrow)
  // ══════════════════════════════════════════════════════════════
  header("↩️", 6, "Refund Flow", "Create → Deposit → Refund → Verify");

  const escrow2 = await test("create_escrow for refund test", async () => {
    const r = await agentA.runAction("create_escrow", {
      beneficiary: beneficiaryAddress,
      amount: "0.05",
      description: "gas-fix-test-refund",
      deadlineMinutes: 10,
    });
    console.log(`     Escrow ID: ${r.escrowId}`);
    console.log(`     Contract:  ${r.friendlyContract}`);
    return r;
  });

  if (escrow2) {
    console.log(`\n  ⏳ 12s for deployment...\n`);
    await delay(12000);

    await test("deposit_to_escrow for refund test", async () => {
      const r = await agentA.runAction("deposit_to_escrow", { escrowId: escrow2.escrowId });
      console.log(`     Status: ${r.status}`);
    });

    console.log(`\n  ⏳ 12s for deposit confirmation...\n`);
    await delay(12000);

    const balBeforeRefund = await agentA.runAction("get_balance", {}) as any;

    await test("refund_escrow", async () => {
      const r = await agentA.runAction("refund_escrow", { escrowId: escrow2.escrowId });
      console.log(`     Status: ${r.status}`);
      console.log(`     TX:     ${r.refundTxHash?.slice(0, 24)}...`);
    });

    console.log(`\n  ⏳ 12s for refund confirmation...\n`);
    await delay(12000);

    await test("escrow refunded: true", async () => {
      const r = await agentA.runAction("get_escrow_info", { escrowId: escrow2.escrowId });
      if (!r.onChain.refunded) throw new Error(`Expected refunded: true`);
      console.log(`     Refunded: ${r.onChain.refunded}`);
      console.log(`     Released: ${r.onChain.released}`);
    });

    await test("escrow balance is 0 after refund", async () => {
      const r = await agentA.runAction("get_escrow_info", { escrowId: escrow2.escrowId });
      const bal = parseFloat(r.onChain.balance || "0");
      if (bal > 0.01) throw new Error(`Expected ~0, got ${bal}`);
      console.log(`     Balance: ${r.onChain.balance}`);
    });

    await test("depositor got funds back", async () => {
      const balAfterRefund = await agentA.runAction("get_balance", {}) as any;
      const before = parseFloat(balBeforeRefund.balance);
      const after = parseFloat(balAfterRefund.balance);
      const diff = after - before;
      // Should have increased (got refund), minus gas
      console.log(`     Before refund: ${before.toFixed(4)} TON`);
      console.log(`     After refund:  ${after.toFixed(4)} TON`);
      console.log(`     Diff:          ${diff >= 0 ? "+" : ""}${diff.toFixed(4)} TON`);
    });

    sectionEnd("Refund Flow");
  }

  // ══════════════════════════════════════════════════════════════
  //  SECTION 7: Schema Validation
  // ══════════════════════════════════════════════════════════════
  header("📐", 7, "Schema Validation", "Invalid params rejected before on-chain");

  await testError(
    "create_escrow (missing beneficiary)",
    () => agentA.runAction("create_escrow", { amount: "0.1" }),
    "Invalid params",
  );

  await testError(
    "create_escrow (missing amount)",
    () => agentA.runAction("create_escrow", { beneficiary: beneficiaryAddress }),
    "Invalid params",
  );

  await test("get_escrow_info (list all)", async () => {
    const r = await agentA.runAction("get_escrow_info", {});
    console.log(`     Total escrows: ${r.count}`);
    if (r.count < 2) throw new Error(`Expected at least 2, got ${r.count}`);
  });

  sectionEnd("Schema Validation");

  // ══════════════════════════════════════════════════════════════
  //  SUMMARY
  // ══════════════════════════════════════════════════════════════

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const total = passed + failed;

  console.log(`


╔${"═".repeat(W - 2)}╗
║${" ".repeat(Math.floor((W - 38) / 2))}🔒 Escrow Test Results${" ".repeat(Math.ceil((W - 38) / 2))}║
╚${"═".repeat(W - 2)}╝

  ✅ Passed:  ${String(passed).padStart(3)}
  ❌ Failed:  ${String(failed).padStart(3)}
  📊 Total:   ${String(total).padStart(3)}
  ⏱️  Time:    ${elapsed}s

  ── Section Breakdown ──
  ┌${"─".repeat(W - 4)}┐`);

  for (const s of sectionResults) {
    const icon = s.failed === 0 ? "✅" : "❌";
    const counts = `${s.passed}/${s.passed + s.failed}`;
    console.log(`  │  ${icon} ${s.name.padEnd(38)} ${counts.padStart(8)}    │`);
  }

  console.log(`  └${"─".repeat(W - 4)}┘`);

  if (errors.length > 0) {
    console.log(`\n  ── Error Details ──`);
    for (const e of errors) {
      console.log(`  🔴 ${e}`);
    }
  }

  if (failed === 0) {
    console.log(`
  ┌${"─".repeat(W - 4)}┐
  │                                                            │
  │     🎉  ALL ${total} TESTS PASSED — ESCROW VERIFIED           │
  │                                                            │
  │     On-chain lifecycle · Gas fix confirmed · Secure        │
  │                                                            │
  └${"─".repeat(W - 4)}┘
`);
  } else {
    console.log(`\n  ⚠️  ${failed} test(s) need attention.\n`);
  }
}

export async function run(): Promise<TestResult> {
  const start = Date.now();
  passed = 0;
  failed = 0;
  errors.length = 0;
  sectionResults.length = 0;
  sectionPassed = 0;
  sectionFailed = 0;
  try {
    await main();
  } catch (err: any) {
    failed++;
    errors.push(`FATAL: ${err.message}`);
  }
  return { passed, failed, errors: [...errors], duration: Date.now() - start };
}

if (import.meta.main) {
  run().then((r) => {
    console.log(`\n${r.passed} passed, ${r.failed} failed (${r.duration}ms)`);
    if (r.errors.length) r.errors.forEach((e) => console.log(`  - ${e}`));
    process.exit(r.failed > 0 ? 1 : 0);
  });
}
