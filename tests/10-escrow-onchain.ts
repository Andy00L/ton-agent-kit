// tests/10-escrow-onchain.ts — Section 9: Escrow On-Chain
import { createTestnetAgent, createTestContext, TestResult } from "./_setup";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function run(): Promise<TestResult> {
  const start = Date.now();
  const { agent, wallet, ownAddress, friendlyAddress, actions } = await createTestnetAgent();
  const { test, testError, skip, result } = createTestContext();

  const escrow = await test("create_escrow (deploy contract)", async () => {
    const r = await agent.runAction("create_escrow", {
      beneficiary: "0QBQ-vTFmOnzUMYx66UHSljnn1DzP9iCE8qw77flvWS9VXK3",
      amount: "0.05",
      description: "test-all-actions escrow",
      deadlineMinutes: 10,
    });
    console.log(`     Escrow ID: ${r.escrowId}`);
    console.log(`     Contract:  ${r.friendlyContract}`);
    return r;
  });

  if (escrow) {
    console.log(`\n  ⏳ 12s for deployment...\n`);
    await delay(12000);

    await test("get_escrow_info (after create — status: created)", async () => {
      const r = await agent.runAction("get_escrow_info", { escrowId: escrow.escrowId });
      console.log(`     On-chain status: ${r.onChain.status}`);
      console.log(`     Depositor:  ${r.onChain.depositor?.slice(0, 24)}...`);
      console.log(`     Beneficiary: ${r.onChain.beneficiary?.slice(0, 24)}...`);
    });

    await test("deposit_to_escrow (0.05 TON)", async () => {
      const r = await agent.runAction("deposit_to_escrow", {
        escrowId: escrow.escrowId,
        amount: "0.05",
      });
      console.log(`     Status: ${r.status} | TX: ${r.depositTxHash}`);
    });

    console.log(`\n  ⏳ 12s for deposit confirmation...\n`);
    await delay(12000);

    await test("get_escrow_info (after deposit — status: funded)", async () => {
      const r = await agent.runAction("get_escrow_info", { escrowId: escrow.escrowId });
      console.log(`     Status: ${r.onChain.status} | Balance: ${r.onChain.balance}`);
      if (r.onChain.status !== "funded") throw new Error(`Expected funded, got ${r.onChain.status}`);
    });

    await test("release_escrow (funds → beneficiary)", async () => {
      const r = await agent.runAction("release_escrow", { escrowId: escrow.escrowId });
      console.log(`     Status: ${r.status} | TX: ${r.releaseTxHash}`);
    });

    console.log(`\n  ⏳ 12s for release confirmation...\n`);
    await delay(12000);

    await test("get_escrow_info (after release — released: true, balance: 0)", async () => {
      const r = await agent.runAction("get_escrow_info", { escrowId: escrow.escrowId });
      console.log(`     Released: ${r.onChain.released} | Balance: ${r.onChain.balance}`);
      if (!r.onChain.released) throw new Error("Expected released: true");
    });
  }

  await testError(
    "create_escrow (missing beneficiary — schema rejects)",
    () => agent.runAction("create_escrow", { amount: "0.1" }),
    "Invalid params",
  );

  await testError(
    "create_escrow (missing amount — schema rejects)",
    () => agent.runAction("create_escrow", { beneficiary: "0QBQ-vTFmOnzUMYx66UHSljnn1DzP9iCE8qw77flvWS9VXK3" }),
    "Invalid params",
  );

  await test("get_escrow_info (list all escrows)", async () => {
    const r = await agent.runAction("get_escrow_info", {});
    console.log(`     Total escrows: ${r.count}`);
  });

  await testError(
    "get_escrow_info (nonexistent ID — rejects)",
    () => agent.runAction("get_escrow_info", { escrowId: "escrow_fake_123" }),
    "not found",
  );

  // ── Delivery Confirmation + Auto-Release ──
  console.log(`\n  ── Delivery Confirmation + Auto-Release ──`);

  await test("confirm_delivery action registered", async () => {
    const action = actions.find((a: any) => a.name === "confirm_delivery");
    if (!action) throw new Error("confirm_delivery not found");
    action.schema.parse({ escrowId: "escrow_test" });
    action.schema.parse({ escrowId: "escrow_test", x402TxHash: "abc123" });
    console.log(`     Schema valid`);
  });

  await test("auto_release_escrow action registered", async () => {
    const action = actions.find((a: any) => a.name === "auto_release_escrow");
    if (!action) throw new Error("auto_release_escrow not found");
    action.schema.parse({ escrowId: "escrow_test" });
    console.log(`     Schema valid`);
  });

  // ── Dispute + Multi-Arbiter Voting ──
  console.log(`\n  ── Dispute + Multi-Arbiter Voting ──`);

  await test("open_dispute action registered", async () => {
    const action = actions.find((a: any) => a.name === "open_dispute");
    if (!action) throw new Error("open_dispute not found");
    action.schema.parse({ escrowId: "escrow_test" });
    console.log(`     Schema valid`);
  });

  await test("vote_release action registered", async () => {
    const action = actions.find((a: any) => a.name === "vote_release");
    if (!action) throw new Error("vote_release not found");
    action.schema.parse({ escrowId: "escrow_test" });
    console.log(`     Schema valid`);
  });

  await test("vote_refund action registered", async () => {
    const action = actions.find((a: any) => a.name === "vote_refund");
    if (!action) throw new Error("vote_refund not found");
    action.schema.parse({ escrowId: "escrow_test" });
    console.log(`     Schema valid`);
  });

  await test("join_dispute action registered", async () => {
    const action = actions.find((a: any) => a.name === "join_dispute");
    if (!action) throw new Error("join_dispute not found");
    action.schema.parse({ escrowId: "escrow_test" });
    action.schema.parse({ escrowId: "escrow_test", stake: "1.0" });
    console.log(`     Schema valid`);
  });

  await test("claim_reward action registered", async () => {
    const action = actions.find((a: any) => a.name === "claim_reward");
    if (!action) throw new Error("claim_reward not found");
    action.schema.parse({ escrowId: "escrow_test" });
    console.log(`     Schema valid`);
  });

  await test("fallback_settle action registered", async () => {
    const action = actions.find((a: any) => a.name === "fallback_settle");
    if (!action) throw new Error("fallback_settle not found");
    action.schema.parse({ escrowId: "escrow_test" });
    console.log(`     Schema valid`);
  });

  // ── Seller Stake ──
  console.log(`\n  ── Seller Stake (Bidirectional) ──`);

  await test("seller_stake_escrow action registered", async () => {
    const action = actions.find((a: any) => a.name === "seller_stake_escrow");
    if (!action) throw new Error("seller_stake_escrow not found");
    action.schema.parse({ escrowId: "test" });
    action.schema.parse({ contractAddress: "0:abc", stakeAmount: "0.5" });
    console.log(`     Schema valid`);
  });

  // ── Dispute Registry ──
  console.log(`\n  ── Dispute Registry ──`);

  await test("get_open_disputes action registered", async () => {
    const action = actions.find((a: any) => a.name === "get_open_disputes");
    if (!action) throw new Error("get_open_disputes not found");
    action.schema.parse({});
    action.schema.parse({ limit: 10 });
    console.log(`     Schema valid`);
  });

  // ── Agent Cleanup ──
  console.log(`\n  ── Agent Cleanup ──`);

  await test("trigger_cleanup action registered", async () => {
    const action = actions.find((a: any) => a.name === "trigger_cleanup");
    if (!action) throw new Error("trigger_cleanup not found");
    action.schema.parse({});
    action.schema.parse({ maxClean: 10 });
    console.log(`     Schema valid`);
  });

  await test("get_agent_cleanup_info action registered", async () => {
    const action = actions.find((a: any) => a.name === "get_agent_cleanup_info");
    if (!action) throw new Error("get_agent_cleanup_info not found");
    action.schema.parse({ agentIndex: 0 });
    console.log(`     Schema valid`);
  });

  // ── Agent Communication Protocol ──
  console.log(`\n  ── Agent Communication Protocol ──`);

  await test("broadcast_intent action registered", async () => {
    const action = actions.find((a: any) => a.name === "broadcast_intent");
    if (!action) throw new Error("broadcast_intent not found");
    action.schema.parse({ service: "price_feed", budget: "0.1" });
    action.schema.parse({ service: "web_search", budget: "0.5", deadlineMinutes: 30, requirements: "BTC price" });
    console.log(`     Schema valid`);
  });

  await test("discover_intents action registered", async () => {
    const action = actions.find((a: any) => a.name === "discover_intents");
    if (!action) throw new Error("discover_intents not found");
    action.schema.parse({});
    action.schema.parse({ service: "price_feed", limit: 5 });
    console.log(`     Schema valid`);
  });

  await test("send_offer action registered", async () => {
    const action = actions.find((a: any) => a.name === "send_offer");
    if (!action) throw new Error("send_offer not found");
    action.schema.parse({ intentIndex: 0, price: "0.05", endpoint: "https://bot.com/api" });
    console.log(`     Schema valid`);
  });

  await test("get_offers action registered", async () => {
    const action = actions.find((a: any) => a.name === "get_offers");
    if (!action) throw new Error("get_offers not found");
    action.schema.parse({ intentIndex: 0 });
    console.log(`     Schema valid`);
  });

  await test("accept_offer action registered", async () => {
    const action = actions.find((a: any) => a.name === "accept_offer");
    if (!action) throw new Error("accept_offer not found");
    action.schema.parse({ offerIndex: 0 });
    console.log(`     Schema valid`);
  });

  await test("settle_deal action registered", async () => {
    const action = actions.find((a: any) => a.name === "settle_deal");
    if (!action) throw new Error("settle_deal not found");
    action.schema.parse({ intentIndex: 0 });
    action.schema.parse({ intentIndex: 0, rating: 90 });
    console.log(`     Schema valid`);
  });

  await test("cancel_intent action registered", async () => {
    const action = actions.find((a: any) => a.name === "cancel_intent");
    if (!action) throw new Error("cancel_intent not found");
    action.schema.parse({ intentIndex: 0 });
    console.log(`     Schema valid`);
  });

  // ── Delivery Proof ──
  console.log(`\n  ── Delivery Proof ──`);

  await test("get_delivery_proof action registered", async () => {
    const action = actions.find((a: any) => a.name === "get_delivery_proof");
    if (!action) throw new Error("get_delivery_proof not found");
    action.schema.parse({ txHash: "abc123" });
    action.schema.parse({ escrowId: "escrow_1" });
    action.schema.parse({});
    console.log(`     Schema valid`);
  });

  await test("get_delivery_proof (not found)", async () => {
    const r = await agent.runAction("get_delivery_proof", { txHash: "nonexistent_hash" });
    if (r.found !== false) throw new Error("Expected not found");
    console.log(`     ${r.message}`);
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
