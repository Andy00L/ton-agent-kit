// tests/12-schema-validation.ts — Section 11: Schema Validation
import { createTestnetAgent, createTestContext, TestResult } from "./_setup";

export async function run(): Promise<TestResult> {
  const start = Date.now();
  const { agent, wallet, ownAddress, friendlyAddress, actions } = await createTestnetAgent();
  const { test, testError, skip, result } = createTestContext();

  const schemas: { name: string; params: any }[] = [
    { name: "simulate_transaction", params: { to: ownAddress, amount: "1", comment: "test" } },
    { name: "transfer_ton", params: { to: ownAddress, amount: "1", comment: "test" } },
    { name: "transfer_jetton", params: { to: ownAddress, amount: "100", jettonAddress: "0:abc" } },
    { name: "transfer_nft", params: { nftAddress: "0:abc", to: "0:def" } },
    { name: "deploy_jetton", params: { name: "Test", symbol: "TST", supply: "1000000" } },
    { name: "swap_dedust", params: { fromToken: "TON", toToken: "0:abc", amount: "10", slippage: 1 } },
    { name: "swap_stonfi", params: { fromToken: "TON", toToken: "0:abc", amount: "5", slippage: 0.5 } },
    { name: "swap_best_price", params: { fromToken: "TON", toToken: "USDT", amount: "1" } },
    { name: "stake_ton", params: { poolAddress: "0:abc", amount: "10" } },
    { name: "unstake_ton", params: { poolAddress: "0:abc" } },
    { name: "get_portfolio_metrics", params: { days: 30, limit: 100 } },
    { name: "get_equity_curve", params: { days: 30 } },
    { name: "wait_for_transaction", params: { timeout: 10 } },
    { name: "subscribe_webhook", params: { callbackUrl: "https://example.com/hook" } },
    { name: "call_contract_method", params: { address: ownAddress, method: "seqno" } },
    { name: "deploy_reputation_contract", params: {} },
    { name: "withdraw_reputation_fees", params: { confirm: true } },
    { name: "process_pending_ratings", params: {} },
    { name: "confirm_delivery", params: { escrowId: "escrow_test" } },
    { name: "auto_release_escrow", params: { escrowId: "escrow_test" } },
    { name: "open_dispute", params: { escrowId: "escrow_test" } },
    { name: "join_dispute", params: { escrowId: "escrow_test" } },
    { name: "vote_release", params: { escrowId: "escrow_test" } },
    { name: "vote_refund", params: { escrowId: "escrow_test" } },
    { name: "claim_reward", params: { escrowId: "escrow_test" } },
    { name: "fallback_settle", params: { escrowId: "escrow_test" } },
    { name: "get_open_disputes", params: {} },
    { name: "seller_stake_escrow", params: { escrowId: "escrow_test" } },
    { name: "trigger_cleanup", params: {} },
    { name: "get_agent_cleanup_info", params: { agentIndex: 0 } },
    { name: "broadcast_intent", params: { service: "test", budget: "0.1" } },
    { name: "discover_intents", params: {} },
    { name: "send_offer", params: { intentIndex: 0, price: "0.05", endpoint: "https://x.com" } },
    { name: "get_offers", params: { intentIndex: 0 } },
    { name: "accept_offer", params: { offerIndex: 0 } },
    { name: "settle_deal", params: { intentIndex: 0 } },
    { name: "cancel_intent", params: { intentIndex: 0 } },
    { name: "get_accounts_bulk", params: { addresses: ["0:abc"] } },
    { name: "get_delivery_proof", params: { txHash: "abc123" } },
  ];

  for (const s of schemas) {
    await test(`schema: ${s.name}`, async () => {
      const action = actions.find((a: any) => a.name === s.name);
      if (!action) throw new Error(`Action ${s.name} not found`);
      action.schema.parse(s.params);
      console.log(`     ✓ Valid`);
    });
  }

  return result(start);
}

if (import.meta.main) {
  run().then((r) => {
    console.log(`\n${r.passed} passed, ${r.failed} failed (${r.duration}ms)`);
    if (r.errors.length) r.errors.forEach((e) => console.log(`  - ${e}`));
    process.exit(r.failed > 0 ? 1 : 0);
  });
}
