// tests/06-analytics-plugin.ts — Section 5: Analytics Plugin
import { createTestnetAgent, createMainnetAgent, createTestContext, TestResult } from "./_setup";

export async function run(): Promise<TestResult> {
  const start = Date.now();
  const { agent, wallet, ownAddress, friendlyAddress, actions } = await createTestnetAgent();
  const { agent: mainAgent } = await createMainnetAgent();
  const { test, testError, skip, result } = createTestContext();

  await test("get_wallet_info (own)", async () => {
    const r = await agent.runAction("get_wallet_info", {});
    console.log(`     Status: ${r.status} | Balance: ${r.balance} TON`);
  });

  await test("get_wallet_info (other wallet)", async () => {
    const r = await agent.runAction("get_wallet_info", {
      address: "0QBQ-vTFmOnzUMYx66UHSljnn1DzP9iCE8qw77flvWS9VXK3",
    });
    console.log(`     Status: ${r.status}`);
  });

  await testError(
    "get_wallet_info (invalid address)",
    () => agent.runAction("get_wallet_info", { address: "garbage" }),
    "Failed",
  );

  await test("get_transaction_history (limit 3)", async () => {
    const r = await agent.runAction("get_transaction_history", { limit: 3 });
    console.log(`     Transactions: ${r.count}`);
  });

  await test("get_transaction_history (default limit)", async () => {
    const r = await agent.runAction("get_transaction_history", {});
    console.log(`     Transactions: ${r.count}`);
  });

  // ── Portfolio Metrics ──
  console.log(`\n  ── Portfolio Metrics ──`);

  await test("get_portfolio_metrics (own wallet, default)", async () => {
    const r = await agent.runAction("get_portfolio_metrics", {});
    const requiredFields = ["totalInflow", "totalOutflow", "netPnL", "roi", "totalTransactions",
      "incomingCount", "outgoingCount", "winRate", "maxDrawdown", "largestLoss",
      "largestGain", "currentBalance", "periodDays", "analyzedTransactions", "message"];
    for (const f of requiredFields) {
      if (!(f in r)) throw new Error(`Missing field: ${f}`);
    }
    console.log(`     PnL: ${r.netPnL} | ROI: ${r.roi} | TXs: ${r.totalTransactions}`);
    console.log(`     Win rate: ${r.winRate} | Drawdown: ${r.maxDrawdown}`);
    if (!r.message) throw new Error("Missing message");
  });

  await test("get_portfolio_metrics (7 days)", async () => {
    const r = await agent.runAction("get_portfolio_metrics", { days: 7 });
    if (r.periodDays !== 7) throw new Error(`Expected 7 days, got ${r.periodDays}`);
    console.log(`     7d: ${r.totalTransactions} TXs, PnL ${r.netPnL}`);
  });

  await test("get_portfolio_metrics (limit 5)", async () => {
    const r = await agent.runAction("get_portfolio_metrics", { limit: 5 });
    if (r.analyzedTransactions > 5) throw new Error(`Expected <=5, got ${r.analyzedTransactions}`);
    console.log(`     Analyzed: ${r.analyzedTransactions} TXs`);
  });

  await test("get_portfolio_metrics (other wallet)", async () => {
    const r = await agent.runAction("get_portfolio_metrics", {
      address: "0QBQ-vTFmOnzUMYx66UHSljnn1DzP9iCE8qw77flvWS9VXK3",
    });
    console.log(`     Other wallet: ${r.totalTransactions} TXs, balance ${r.currentBalance}`);
  });

  // ── Equity Curve ──
  console.log(`\n  ── Equity Curve ──`);

  await test("get_equity_curve (own wallet, default)", async () => {
    const r = await agent.runAction("get_equity_curve", {});
    if (!Array.isArray(r.points) || r.points.length === 0) throw new Error("Expected non-empty points array");
    const p = r.points[0];
    if (!p.date || !p.balance) throw new Error("Points must have date and balance");
    if (!r.message) throw new Error("Missing message");
    console.log(`     ${r.points.length} points | ${r.startBalance} → ${r.endBalance} (${r.changePercent})`);
  });

  await test("get_equity_curve (7 days)", async () => {
    const r = await agent.runAction("get_equity_curve", { days: 7 });
    if (r.periodDays !== 7) throw new Error(`Expected 7 days, got ${r.periodDays}`);
    if (r.points.length > 8) throw new Error(`Expected <=8 points, got ${r.points.length}`);
    console.log(`     7d curve: ${r.points.length} points, change ${r.change}`);
  });

  // ── Event Subscriptions ──
  console.log(`\n  ── Event Subscriptions ──`);

  await test("wait_for_transaction action registered + schema", async () => {
    const action = actions.find((a: any) => a.name === "wait_for_transaction");
    if (!action) throw new Error("wait_for_transaction not found");
    action.schema.parse({});
    action.schema.parse({ address: ownAddress, timeout: 10 });
    console.log(`     Schema valid (default + explicit params)`);
  });

  await test("wait_for_transaction (1s timeout — no activity)", async () => {
    const r = await agent.runAction("wait_for_transaction", { timeout: 1 });
    if (r.found !== false) throw new Error("Expected no transaction in 1s");
    console.log(`     ${r.message}`);
  });

  await test("subscribe_webhook action registered + schema", async () => {
    const action = actions.find((a: any) => a.name === "subscribe_webhook");
    if (!action) throw new Error("subscribe_webhook not found");
    action.schema.parse({ callbackUrl: "https://example.com/webhook" });
    console.log(`     Schema valid`);
  });

  await test("subscribe_webhook (http rejected)", async () => {
    const r = await agent.runAction("subscribe_webhook", {
      callbackUrl: "http://insecure.com/webhook",
    });
    if (r.subscribed !== false) throw new Error("Expected rejection of HTTP URL");
    console.log(`     Correctly rejected: ${r.message}`);
  });

  // ── Call Contract Method ──
  console.log(`\n  ── Call Contract Method ──`);

  await test("call_contract_method action registered + schema", async () => {
    const action = actions.find((a: any) => a.name === "call_contract_method");
    if (!action) throw new Error("call_contract_method not found");
    action.schema.parse({ address: ownAddress, method: "seqno" });
    action.schema.parse({ address: ownAddress, method: "get_wallet_data", args: [] });
    console.log(`     Schema valid`);
  });

  await test("call_contract_method (seqno on own wallet)", async () => {
    const r = await agent.runAction("call_contract_method", {
      address: ownAddress,
      method: "seqno",
    });
    if (!r.success) throw new Error(`Failed: ${r.message}`);
    if (r.resultCount < 1) throw new Error("Expected at least 1 return value");
    console.log(`     seqno = ${r.stack[0]} (exit code: ${r.exitCode})`);
  });

  await test("call_contract_method (get_jetton_data — USDT mainnet)", async () => {
    const r = await mainAgent.runAction("call_contract_method", {
      address: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
      method: "get_jetton_data",
    });
    if (!r.success) throw new Error(`Failed: ${r.message}`);
    console.log(`     ${r.resultCount} values returned | exit: ${r.exitCode}`);
  });

  await test("call_contract_method (nonexistent method)", async () => {
    const r = await agent.runAction("call_contract_method", {
      address: ownAddress,
      method: "this_method_does_not_exist_xyz",
    });
    console.log(`     success=${r.success} exit=${r.exitCode} | ${r.message}`);
  });

  await test("call_contract_method (invalid address)", async () => {
    const r = await agent.runAction("call_contract_method", {
      address: "not-a-valid-address",
      method: "seqno",
    });
    if (r.success) throw new Error("Expected failure for invalid address");
    console.log(`     Correctly rejected: ${r.message}`);
  });

  // ── Bulk Account Queries ──
  console.log(`\n  ── Bulk Account Queries ──`);

  await test("get_accounts_bulk action registered", async () => {
    const action = actions.find((a: any) => a.name === "get_accounts_bulk");
    if (!action) throw new Error("get_accounts_bulk not found");
    action.schema.parse({ addresses: ["0:abc"] });
    console.log(`     Schema valid`);
  });

  await test("get_accounts_bulk (2 wallets)", async () => {
    const r = await agent.runAction("get_accounts_bulk", {
      addresses: [
        "0:a5556ae3597e3d5dad785d3ed0d9746dfc4b5b9494d4bed9b8d5a9849dea34ed",
        "0:50faf4c598e9f350c631eba5074a58e79f50f33fd88213cab0efb7e5bd64bd55",
      ],
    });
    if (r.count !== 2) throw new Error(`Expected 2, got ${r.count}`);
    if (!r.bulkQuery) throw new Error("Not bulk");
    console.log(`     Accounts: ${r.count} | Total: ${r.totalBalance}`);
    console.log(`     A: ${r.accounts[0]?.balance} | B: ${r.accounts[1]?.balance}`);
  });

  await test("get_accounts_bulk (single address)", async () => {
    const r = await agent.runAction("get_accounts_bulk", {
      addresses: ["0:a5556ae3597e3d5dad785d3ed0d9746dfc4b5b9494d4bed9b8d5a9849dea34ed"],
    });
    if (r.count !== 1) throw new Error(`Expected 1, got ${r.count}`);
    console.log(`     Balance: ${r.accounts[0]?.balance} | Status: ${r.accounts[0]?.status}`);
  });

  await test("get_accounts_bulk (empty → schema rejects)", async () => {
    try {
      await agent.runAction("get_accounts_bulk", { addresses: [] });
      throw new Error("Should reject");
    } catch (e: any) {
      if (!e.message.includes("Invalid params")) throw e;
    }
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
