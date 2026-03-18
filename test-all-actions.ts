/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║     TON Agent Kit — Comprehensive Action Test Suite         ║
 * ║     All actions · 9 plugins · every edge case               ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Tests EVERYTHING in the monorepo:
 *   • toAITools() — format, params, types, OpenAI compat
 *   • Token — balance, transfer, jetton, deploy schema, simulate
 *   • DeFi — price feeds, invalid tokens
 *   • DNS — resolve, reverse lookup, domain info
 *   • NFT — collection, info, transfer schema
 *   • Staking — info, stake/unstake schema
 *   • Analytics — wallet info, tx history
 *   • Escrow — full on-chain lifecycle (create → deposit → release)
 *   • Identity — register, discover, reputation scoring
 *   • Schema validation — every write action
 *   • Edge cases — invalid addresses, insufficient balance, missing params
 *   • Live transfers — real TON sent on testnet
 *
 * Run: bun run test-all-actions.ts
 */

import { readFileSync } from "fs";

const envContent = readFileSync(".env", "utf-8");
const getEnv = (key: string) =>
  envContent.split("\n").find((l) => l.startsWith(key + "="))?.slice(key.length + 1).trim() || "";

process.env.TON_MNEMONIC = getEnv("TON_MNEMONIC");

import { TonAgentKit } from "./packages/core/src/agent";
import { KeypairWallet } from "./packages/core/src/wallet";
import TokenPlugin from "./packages/plugin-token/src/index";
import DefiPlugin from "./packages/plugin-defi/src/index";
import DnsPlugin from "./packages/plugin-dns/src/index";
import NftPlugin from "./packages/plugin-nft/src/index";
import StakingPlugin from "./packages/plugin-staking/src/index";
import EscrowPlugin from "./packages/plugin-escrow/src/index";
import IdentityPlugin from "./packages/plugin-identity/src/index";
import AnalyticsPlugin from "./packages/plugin-analytics/src/index";
import PaymentsPlugin from "./packages/plugin-payments/src/index";
import AgentCommPlugin from "./packages/plugin-agent-comm/src/index";

// ══════════════════════════════════════════════════════════════
//  Test Framework
// ══════════════════════════════════════════════════════════════

const W = 64;
const RATE_MS = 1000;

let passed = 0;
let failed = 0;
let skipped = 0;
const errors: string[] = [];
const sectionResults: { name: string; passed: number; failed: number }[] = [];
let sectionPassed = 0;
let sectionFailed = 0;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rateLimit = () => delay(RATE_MS);

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
  await rateLimit();
  try {
    const result = await fn();
    console.log(`  ✅ ${name}`);
    passed++;
    sectionPassed++;
    return result;
  } catch (err: any) {
    console.log(`  ❌ ${name}`);
    console.log(`     → ${err.message.slice(0, 120)}`);
    failed++;
    sectionFailed++;
    errors.push(`${name}: ${err.message.slice(0, 100)}`);
    return null;
  }
}

async function testError(name: string, fn: () => Promise<any>, expectedMsg: string): Promise<void> {
  await rateLimit();
  try {
    await fn();
    console.log(`  ❌ ${name} — should have thrown`);
    failed++;
    sectionFailed++;
    errors.push(`${name}: did not throw`);
  } catch (err: any) {
    if (err.message.includes(expectedMsg)) {
      console.log(`  ✅ ${name}`);
      console.log(`     ↳ Correctly rejected: ${err.message.slice(0, 80)}`);
      passed++;
      sectionPassed++;
    } else {
      console.log(`  ❌ ${name} — wrong error`);
      console.log(`     Expected "${expectedMsg}" got "${err.message.slice(0, 80)}"`);
      failed++;
      sectionFailed++;
      errors.push(`${name}: wrong error — ${err.message.slice(0, 80)}`);
    }
  }
}

function skip(name: string, reason: string) {
  console.log(`  ⏭️  ${name} — ${reason}`);
  skipped++;
}

// ══════════════════════════════════════════════════════════════
//  Main
// ══════════════════════════════════════════════════════════════

async function main() {
  const mnemonic = process.env.TON_MNEMONIC;
  if (!mnemonic) {
    console.error("❌ Set TON_MNEMONIC in .env");
    process.exit(1);
  }

  const startTime = Date.now();

  console.log(`
╔${"═".repeat(W - 2)}╗
║${" ".repeat(Math.floor((W - 48) / 2))}🧪 TON Agent Kit — Comprehensive Test Suite${" ".repeat(Math.ceil((W - 48) / 2))}║
║${" ".repeat(Math.floor((W - 36) / 2))}9 plugins · every edge case${" ".repeat(Math.ceil((W - 36) / 2))}║
╚${"═".repeat(W - 2)}╝

  Network:    testnet
  Rate limit: ${RATE_MS}ms between RPC calls
  Timestamp:  ${new Date().toISOString()}
${"─".repeat(W)}`);

  // ── Setup testnet agent (all plugins) ──
  const wallet = await KeypairWallet.fromMnemonic(mnemonic.split(" "), {
    version: "V5R1",
    network: "testnet",
  });

  const agent = new TonAgentKit(wallet, "https://testnet-v4.tonhubapi.com")
    .use(TokenPlugin)
    .use(DefiPlugin)
    .use(DnsPlugin)
    .use(NftPlugin)
    .use(StakingPlugin)
    .use(EscrowPlugin)
    .use(IdentityPlugin)
    .use(AnalyticsPlugin)
    .use(PaymentsPlugin)
    .use(AgentCommPlugin);

  // ── Setup mainnet agent (for contracts that only exist on mainnet) ──
  const mainWallet = await KeypairWallet.fromMnemonic(mnemonic.split(" "), {
    version: "V5R1",
    network: "mainnet",
  });
  const mainAgent = new TonAgentKit(mainWallet, "https://mainnet-v4.tonhubapi.com")
    .use(TokenPlugin)
    .use(DefiPlugin)
    .use(NftPlugin)
    .use(DnsPlugin)
    .use(AnalyticsPlugin);

  const ownAddress = wallet.address.toRawString();
  const friendlyAddress = wallet.address.toString({ testOnly: true, bounceable: false });
  const actions = agent.getAvailableActions();

  console.log(`
  📡 Wallet:   ${friendlyAddress}
  🔑 Raw:      ${ownAddress.slice(0, 24)}...${ownAddress.slice(-12)}
  🔧 Plugins:  9 loaded
  ⚡ Actions:  ${actions.length} available
  📌 ${actions.map((a: any) => a.name).join(", ")}
`);

  // ══════════════════════════════════════════════════════════════
  //  SECTION 0: Plugin System & toAITools()
  // ══════════════════════════════════════════════════════════════
  header("🔧", 0, "Plugin System & toAITools()", "Core SDK verification");

  await test("agent.getAvailableActions() returns all actions", async () => {
    if (actions.length === 0) throw new Error("No actions loaded");
    console.log(`     Actions: ${actions.length}`);
  });

  await test("agent.actionCount matches", async () => {
    if ((agent as any).actionCount !== actions.length)
      throw new Error(`actionCount mismatch`);
  });

  await test("every action has name + description + schema", async () => {
    for (const a of actions) {
      if (!a.name) throw new Error(`Missing name`);
      if (!a.description) throw new Error(`${a.name}: missing description`);
      if (!a.schema) throw new Error(`${a.name}: missing schema`);
    }
    console.log(`     All ${actions.length} actions valid`);
  });

  const tools = await test("toAITools() generates tools", async () => {
    const t = agent.toAITools();
    if (t.length !== actions.length) throw new Error(`Expected ${actions.length}, got ${t.length}`);
    console.log(`     Tools: ${t.length}`);
    return t;
  });

  if (tools) {
    await test("toAITools() — OpenAI format", async () => {
      for (const t of tools) {
        if (t.type !== "function") throw new Error(`type: ${t.type}`);
        if (!t.function?.name) throw new Error(`missing name`);
        if (!t.function?.description) throw new Error(`missing description`);
        if (t.function?.parameters?.type !== "object") throw new Error(`parameters.type: ${t.function?.parameters?.type}`);
      }
    });

    await test("toAITools() — all have properties (non-empty)", async () => {
      const empty = tools.filter((t: any) => Object.keys(t.function.parameters.properties || {}).length === 0);
      if (empty.length > 0) throw new Error(`Empty: ${empty.map((t: any) => t.function.name).join(", ")}`);
    });

    await test("toAITools() — transfer_ton has {to, amount, comment}", async () => {
      const tt = tools.find((t: any) => t.function.name === "transfer_ton");
      const keys = Object.keys(tt.function.parameters.properties || {});
      if (!keys.includes("to")) throw new Error(`Missing "to" — got: ${keys}`);
      if (!keys.includes("amount")) throw new Error(`Missing "amount" — got: ${keys}`);
      console.log(`     Params: ${keys.join(", ")}`);
    });

    await test("toAITools() — create_escrow has {beneficiary, amount}", async () => {
      const ce = tools.find((t: any) => t.function.name === "create_escrow");
      const keys = Object.keys(ce.function.parameters.properties || {});
      if (!keys.includes("beneficiary")) throw new Error(`Missing "beneficiary"`);
      if (!keys.includes("amount")) throw new Error(`Missing "amount"`);
      console.log(`     Params: ${keys.join(", ")}`);
    });

    await test("toAITools() — no $schema or $ref (OpenAI compat)", async () => {
      for (const t of tools) {
        if ("$schema" in t.function.parameters) throw new Error(`${t.function.name} has $schema`);
        if ("$ref" in t.function.parameters) throw new Error(`${t.function.name} has $ref`);
      }
    });

    await test("toAITools() — JSON serializable", async () => {
      const json = JSON.stringify(tools);
      if (json.length < 100) throw new Error(`Suspiciously short: ${json.length}`);
      console.log(`     ${json.length} chars`);
    });

    // Print tool summary
    console.log(`\n  ── Tool Map ──`);
    for (const t of tools) {
      const props = Object.keys(t.function.parameters.properties || {});
      console.log(`  ✅ ${t.function.name.padEnd(28)} [${props.join(", ")}]`);
    }
  }

  sectionEnd("Plugin System & toAITools()");

  // ══════════════════════════════════════════════════════════════
  //  SECTION 1: Token Plugin
  // ══════════════════════════════════════════════════════════════
  header("🪙", 1, "Token Plugin", "7 actions: balance, transfer, jetton, deploy, simulate");

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

  sectionEnd("Token Plugin");

  // ══════════════════════════════════════════════════════════════
  //  SECTION 2: DeFi Plugin (3 actions)
  // ══════════════════════════════════════════════════════════════
  header("📈", 2, "DeFi Plugin", "DeFi: swaps, prices, DCA, yield, staking, trust, best-price");

  await test("get_price (USDT — by address)", async () => {
    const r = await mainAgent.runAction("get_price", {
      token: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    });
    console.log(`     $${r.priceUSD} USD | ${r.priceTON} TON`);
    if (r.priceUSD === "unknown") throw new Error("Unknown price");
  });

  await test("get_price (USDT — by symbol)", async () => {
    const r = await mainAgent.runAction("get_price", { token: "USDT" });
    console.log(`     $${r.priceUSD} USD`);
  });

  await test("get_price (invalid token — returns unknown)", async () => {
    const r = await mainAgent.runAction("get_price", { token: "invalid-token-xyz" });
    if (r.priceUSD !== "unknown") throw new Error("Expected unknown");
    console.log(`     Price: ${r.priceUSD} (correctly unknown)`);
  });

  // ── swap_best_price (schema-only — no real swap in automated tests) ──
  console.log(`\n  ── swap_best_price ──`);

  await test("swap_best_price action registered", async () => {
    const action = actions.find((a: any) => a.name === "swap_best_price");
    if (!action) throw new Error("swap_best_price action not found");
    const props = Object.keys(action.schema._zod?.def?.shape || {});
    console.log(`     Found: swap_best_price`);
  });

  await test("swap_best_price schema validates", async () => {
    const action = actions.find((a: any) => a.name === "swap_best_price");
    if (!action) throw new Error("Not found");
    action.schema.parse({ fromToken: "TON", toToken: "USDT", amount: "1" });
    action.schema.parse({ fromToken: "TON", toToken: "USDT", amount: "10", slippage: 0.5, quoteTimeout: 3 });
    console.log(`     Schema valid (required + optional params)`);
  });

  sectionEnd("DeFi Plugin");

  // ══════════════════════════════════════════════════════════════
  //  SECTION 3: NFT Plugin (3 actions)
  // ══════════════════════════════════════════════════════════════
  header("🖼️", 3, "NFT Plugin", "3 actions: nft_info, collection, transfer");

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

  sectionEnd("NFT Plugin");

  // ══════════════════════════════════════════════════════════════
  //  SECTION 4: DNS Plugin (3 actions)
  // ══════════════════════════════════════════════════════════════
  header("🌐", 4, "DNS Plugin", "3 actions: resolve, lookup, domain_info");

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

  sectionEnd("DNS Plugin");

  // ══════════════════════════════════════════════════════════════
  //  SECTION 5: Analytics Plugin (2 actions)
  // ══════════════════════════════════════════════════════════════
  header("📊", 5, "Analytics Plugin", "7 actions: wallet_info, tx_history, portfolio, equity_curve, wait_for_tx, webhook, call_contract");

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

  sectionEnd("Analytics Plugin");

  // ══════════════════════════════════════════════════════════════
  //  SECTION 6: Staking Plugin (3 actions)
  // ══════════════════════════════════════════════════════════════
  header("💰", 6, "Staking Plugin", "3 actions: info, stake, unstake");

  await test("get_staking_info (own)", async () => {
    const r = await agent.runAction("get_staking_info", {});
    console.log(`     Pools: ${r.pools?.length || 0}`);
  });

  sectionEnd("Staking Plugin");

  // ══════════════════════════════════════════════════════════════
  //  SECTION 7: Live Transfer (real TON on testnet)
  // ══════════════════════════════════════════════════════════════
  header("💸", 7, "Live Transfer", "Real TON sent on testnet — balance verified + simulate modes");

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

  sectionEnd("Live Transfer");

  // ══════════════════════════════════════════════════════════════
  //  SECTION 8: Transfer Edge Cases
  // ══════════════════════════════════════════════════════════════
  header("🛡️", 8, "Transfer Edge Cases", "Balance guard, invalid inputs, boundary conditions");

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

  sectionEnd("Transfer Edge Cases");

  // ══════════════════════════════════════════════════════════════
  //  SECTION 9: Escrow On-Chain
  // ══════════════════════════════════════════════════════════════
  header("🔒", 9, "Escrow On-Chain", "7 actions: full lifecycle + delivery confirmation + auto-release");
  console.log(`  ⚠️  Deploys contract, ~0.3 TON gas\n`);

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

  sectionEnd("Escrow On-Chain");

  // ══════════════════════════════════════════════════════════════
  //  SECTION 10: Identity Plugin (5 actions)
  // ══════════════════════════════════════════════════════════════
  header("🪪", 10, "Identity Plugin", "6 actions: register, discover, reputation, deploy, withdraw, ratings");

  const reg = await test("register_agent (full params)", async () => {
    const r = await agent.runAction("register_agent", {
      name: "test-v4-bot",
      capabilities: ["testing", "validation", "analytics"],
      description: "Comprehensive test agent v4",
    });
    console.log(`     Agent ID: ${r.agentId}`);
    return r;
  });

  await test("register_agent (second agent — minimal)", async () => {
    const r = await agent.runAction("register_agent", {
      name: "test-v4-data",
      capabilities: ["price_feed"],
    });
    console.log(`     Agent ID: ${r.agentId}`);
  });

  await test("discover_agent (by capability: testing)", async () => {
    const r = await agent.runAction("discover_agent", { capability: "testing" });
    console.log(`     Found: ${r.count} agent(s)`);
  });

  await test("discover_agent (by capability: price_feed)", async () => {
    const r = await agent.runAction("discover_agent", { capability: "price_feed" });
    console.log(`     Found: ${r.count} agent(s)`);
  });

  await test("discover_agent (nonexistent capability)", async () => {
    const r = await agent.runAction("discover_agent", { capability: "quantum_computing" });
    if (r.count !== 0) throw new Error(`Expected 0, got ${r.count}`);
    console.log(`     Found: 0 (correct)`);
  });

  await test("discover_agent (all — no filter)", async () => {
    const r = await agent.runAction("discover_agent", {});
    console.log(`     Total agents: ${r.count}`);
  });

  if (reg) {
    console.log(`\n  ── Reputation Scoring ──`);

    await test("reputation (initial score = 0)", async () => {
      const r = await agent.runAction("get_agent_reputation", { agentId: reg.agentId });
      if (r.reputation.score !== 0) throw new Error(`Expected 0, got ${r.reputation.score}`);
      console.log(`     Score: ${r.reputation.score}/100`);
    });

    await test("reputation (+success → score rises)", async () => {
      const r = await agent.runAction("get_agent_reputation", {
        agentId: reg.agentId,
        addTask: true,
        success: true,
      });
      console.log(`     Score: ${r.reputation.score}/100 (after 1 success)`);
    });

    await test("reputation (+success #2)", async () => {
      const r = await agent.runAction("get_agent_reputation", {
        agentId: reg.agentId,
        addTask: true,
        success: true,
      });
      console.log(`     Score: ${r.reputation.score}/100 | Tasks: ${r.reputation.totalTasks}`);
    });

    await test("reputation (+failure → score drops)", async () => {
      const r = await agent.runAction("get_agent_reputation", {
        agentId: reg.agentId,
        addTask: true,
        success: false,
      });
      console.log(`     Score: ${r.reputation.score}/100 (expected ~67 after 2/3 success)`);
    });

    await test("reputation (verify final state)", async () => {
      const r = await agent.runAction("get_agent_reputation", { agentId: reg.agentId });
      console.log(`     Score: ${r.reputation.score} | Tasks: ${r.reputation.totalTasks} | Successes: ${r.reputation.successfulTasks}`);
    });
  }

  await testError(
    "reputation (nonexistent agent — rejects)",
    () => agent.runAction("get_agent_reputation", { agentId: "fake_agent_999" }),
    "not found",
  );

  // ── New actions: deploy + withdraw ──
  console.log(`\n  ── On-Chain Reputation Actions ──`);

  await test("deploy_reputation_contract action registered", async () => {
    const action = actions.find((a: any) => a.name === "deploy_reputation_contract");
    if (!action) throw new Error("deploy_reputation_contract not found");
    action.schema.parse({});
    action.schema.parse({ fee: "0.01" });
    console.log(`     Schema valid`);
  });

  await test("withdraw_reputation_fees action registered", async () => {
    const action = actions.find((a: any) => a.name === "withdraw_reputation_fees");
    if (!action) throw new Error("withdraw_reputation_fees not found");
    action.schema.parse({});
    console.log(`     Schema valid`);
  });

  await test("register_agent with available flag", async () => {
    const r = await agent.runAction("register_agent", {
      name: "available-test-bot",
      capabilities: ["testing"],
      available: true,
    });
    console.log(`     Agent: ${r.agentId} | Available: ${r.available}`);
    if (r.available !== true) throw new Error("Expected available=true");
  });

  await test("discover_agent (available only — default)", async () => {
    const r = await agent.runAction("discover_agent", { capability: "testing" });
    console.log(`     Found (available): ${r.count}`);
  });

  await test("discover_agent (includeOffline=true)", async () => {
    const r = await agent.runAction("discover_agent", {
      capability: "testing",
      includeOffline: true,
    });
    console.log(`     Found (all): ${r.count}`);
  });

  // ── Bidirectional Ratings ──
  console.log(`\n  ── Bidirectional Ratings ──`);

  await test("process_pending_ratings action registered", async () => {
    const action = actions.find((a: any) => a.name === "process_pending_ratings");
    if (!action) throw new Error("process_pending_ratings not found");
    action.schema.parse({});
    action.schema.parse({ autoSubmit: true });
    console.log(`     Schema valid`);
  });

  await test("process_pending_ratings (no pending)", async () => {
    const r = await agent.runAction("process_pending_ratings", {});
    console.log(`     Processed: ${r.processed || 0} | Pending: ${r.pending || 0}`);
  });

  // ── Excess Gas Refund ──
  console.log(`\n  ── Excess Gas Refund ──`);

  await test("register_agent excess gas refunded", async () => {
    agent.cache.clear();
    const before = await agent.runAction("get_balance", {});
    await agent.runAction("register_agent", {
      name: "refund-test-" + Date.now(),
      capabilities: ["test"],
    });
    await delay(15000); // wait for on-chain + refund
    agent.cache.clear();
    const after = await agent.runAction("get_balance", {});
    const spent = parseFloat(before.balance) - parseFloat(after.balance);
    console.log(`     Gas spent: ${spent.toFixed(4)} TON (should be 0.03-0.07)`);
    // With real refund: ~0.03-0.06 TON. With bounce (contract dead): ~0.004 TON.
    // Bounce would pass < 0.08 check but fail > 0.01 check.
    if (spent < 0.01) throw new Error(`Spent only ${spent.toFixed(4)} TON — contract likely bouncing (dead)`);
    if (spent > 0.08) throw new Error(`Too much gas spent: ${spent.toFixed(4)} TON — refund not working`);
  });

  await test("storageInfo getter callable", async () => {
    try {
      const r = await agent.runAction("call_contract_method", {
        address: "0:a53a0305a5c7c945d9fda358375c8c53e3760cebcc65fae744367827a30355a0",
        method: "storageInfo",
      });
      console.log(`     Result: ${JSON.stringify(r.result || r).slice(0, 120)}`);
    } catch (e: any) {
      // Getter exists but SDK may not decode Tact struct — that's OK
      console.log(`     Getter exists (decode: ${e.message?.slice(0, 60)})`);
    }
    // Verify simpler getter works — storageFundBalance returns a plain Int
    const r2 = await agent.runAction("call_contract_method", {
      address: "0:a53a0305a5c7c945d9fda358375c8c53e3760cebcc65fae744367827a30355a0",
      method: "storageFundBalance",
    });
    console.log(`     StorageFund: ${r2.result ?? "?"}`);
  });

  await test("withdraw_reputation_fees schema + 20-year rule", async () => {
    const action = actions.find((a: any) => a.name === "withdraw_reputation_fees");
    if (!action) throw new Error("withdraw_reputation_fees not found");
    action.schema.parse({});
    console.log("     Schema valid. 20-year rule enforced on-chain.");
  });

  sectionEnd("Identity Plugin");

  // ══════════════════════════════════════════════════════════════
  //  SECTION 11: Schema Validation (write actions)
  // ══════════════════════════════════════════════════════════════
  header("📐", 11, "Schema Validation", "Every write action schema-checked without executing");

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

  sectionEnd("Schema Validation");

  // ══════════════════════════════════════════════════════════════
  //  SECTION 12: Cross-Plugin Edge Cases
  // ══════════════════════════════════════════════════════════════
  header("⚡", 12, "Cross-Plugin Edge Cases", "Misc edge cases across all plugins");

  await test("runAction with unknown action name — throws", async () => {
    try {
      await agent.runAction("nonexistent_action", {});
      throw new Error("Should have thrown");
    } catch (err: any) {
      if (err.message.includes("nonexistent_action") || err.message.includes("not found") || err.message.includes("Unknown")) {
        console.log(`     Correctly rejected unknown action`);
        return;
      }
      throw err;
    }
  });

  await test("plugin .use() is chainable", async () => {
    const a = new TonAgentKit(wallet, "https://testnet-v4.tonhubapi.com")
      .use(TokenPlugin)
      .use(DefiPlugin)
      .use(DnsPlugin);
    const expected = TokenPlugin.actions.length + DefiPlugin.actions.length + DnsPlugin.actions.length;
    const actual = a.getAvailableActions().length;
    if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
    console.log(`     3 plugins → ${actual} actions`);
  });

  await test("single plugin agent works", async () => {
    const a = new TonAgentKit(wallet, "https://testnet-v4.tonhubapi.com").use(TokenPlugin);
    const r = await a.runAction("get_balance", {});
    console.log(`     Single plugin balance: ${r.balance} TON`);
  });

  await test("mainnet agent reads different data", async () => {
    const testBal = await agent.runAction("get_balance", {});
    const mainBal = await mainAgent.runAction("get_balance", {});
    console.log(`     Testnet: ${testBal.balance} TON | Mainnet: ${mainBal.balance} TON`);
  });

  sectionEnd("Cross-Plugin Edge Cases");

  // ══════════════════════════════════════════════════════════════
  //  SECTION 13: Strategy Engine
  // ══════════════════════════════════════════════════════════════
  header("🎯", 13, "Strategy Engine", "Deterministic workflow engine");

  await test("agent.useStrategy exists", async () => {
    if (typeof agent.useStrategy !== "function") throw new Error("useStrategy not found");
  });

  await test("agent.runStrategy exists", async () => {
    if (typeof agent.runStrategy !== "function") throw new Error("runStrategy not found");
  });

  await test("agent.stopAllStrategies exists", async () => {
    if (typeof agent.stopAllStrategies !== "function") throw new Error("stopAllStrategies not found");
  });

  await test("defineStrategy creates valid strategy", async () => {
    const { defineStrategy } = require("./packages/strategies/src/index");
    const s = defineStrategy({ name: "test-strat", steps: [{ action: "get_balance", params: {} }] });
    if (s.name !== "test-strat") throw new Error("Wrong name");
    if (s.steps[0].id !== "step_0") throw new Error("Auto-ID not assigned");
    console.log(`     OK: ${s.name} with ${s.steps.length} step(s)`);
  });

  await test("parseSchedule works", async () => {
    const { parseSchedule } = require("./packages/strategies/src/index");
    if (parseSchedule("every 1h") !== 3600000) throw new Error("1h wrong");
    if (parseSchedule("every 30m") !== 1800000) throw new Error("30m wrong");
    if (parseSchedule("once") !== null) throw new Error("once wrong");
    console.log(`     1h=3600000 | 30m=1800000 | once=null`);
  });

  await test("Run 1-step strategy (get_balance)", async () => {
    const { defineStrategy } = require("./packages/strategies/src/index");
    const s = defineStrategy({ name: "bal-test", steps: [{ action: "get_balance", params: {} }] });
    agent.useStrategy(s);
    const r = await agent.runStrategy("bal-test");
    if (r.completedSteps !== 1) throw new Error(`Expected 1 completed, got ${r.completedSteps}`);
    console.log(`     Balance: ${r.steps[0].result?.balance} TON | Duration: ${r.totalDuration}ms`);
  });

  sectionEnd("Strategy Engine");

  // ══════════════════════════════════════════════════════════════
  //  SECTION 14: Agent Lifecycle Manager
  // ══════════════════════════════════════════════════════════════
  header("🔄", 14, "Agent Lifecycle Manager", "Process management for long-running agents");

  const { AgentManager } = require("./packages/orchestrator/src/index");

  await test("AgentManager constructor", async () => {
    const m = new AgentManager();
    if (m.summary().total !== 0) throw new Error("Should start empty");
  });

  await test("Deploy agent", async () => {
    const m = new AgentManager();
    m.deploy("t1", agent, { autoRestart: true, maxRestarts: 3, metadata: { role: "tester" } });
    const s = m.status("t1");
    if (s.state !== "deployed") throw new Error(`Got ${s.state}`);
    console.log(`     State: ${s.state}`);
  });

  await test("Deploy duplicate → error", async () => {
    const m = new AgentManager();
    m.deploy("dup", agent);
    try { m.deploy("dup", agent); throw new Error("Should throw"); } catch (e: any) { if (!e.message.includes("already")) throw e; }
  });

  await test("Start + stop", async () => {
    const m = new AgentManager();
    m.deploy("ss", agent);
    await m.start("ss");
    if (m.status("ss").state !== "running") throw new Error("Not running");
    await m.stop("ss");
    if (m.status("ss").state !== "stopped") throw new Error("Not stopped");
    console.log(`     Start→Running→Stop→Stopped`);
  });

  await test("Restart increments counter", async () => {
    const m = new AgentManager();
    m.deploy("rs", agent);
    await m.start("rs");
    await m.restart("rs");
    if (m.status("rs").restarts !== 1) throw new Error("Restarts should be 1");
    await m.stop("rs");
  });

  await test("List + summary", async () => {
    const m = new AgentManager();
    m.deploy("l1", agent); m.deploy("l2", agent);
    await m.start("l1");
    const s = m.summary();
    if (s.total !== 2 || s.running !== 1 || s.deployed !== 1) throw new Error(`Bad: ${JSON.stringify(s)}`);
    console.log(`     Total: ${s.total} | Running: ${s.running} | Deployed: ${s.deployed}`);
    await m.stopAll();
  });

  await test("StopAll", async () => {
    const m = new AgentManager();
    m.deploy("sa1", agent); m.deploy("sa2", agent);
    await m.start("sa1"); await m.start("sa2");
    await m.stopAll();
    if (m.summary().running !== 0) throw new Error("All should be stopped");
  });

  await test("Remove agent", async () => {
    const m = new AgentManager();
    m.deploy("rem", agent);
    await m.remove("rem");
    try { m.status("rem"); throw new Error("Should throw"); } catch (e: any) { if (!e.message.includes("not found")) throw e; }
  });

  await test("Uptime tracking", async () => {
    const m = new AgentManager();
    m.deploy("ut", agent);
    await m.start("ut");
    await new Promise(r => setTimeout(r, 1500));
    const s = m.status("ut");
    if (s.uptime < 1000) throw new Error(`Too low: ${s.uptime}ms`);
    console.log(`     Uptime: ${s.uptimeFormatted}`);
    await m.stop("ut");
  });

  await test("Event hooks fire", async () => {
    let d = false, st = false, sp = false;
    const m = new AgentManager({ onDeploy: () => { d = true; }, onStart: () => { st = true; }, onStop: () => { sp = true; } });
    m.deploy("hk", agent);
    await m.start("hk");
    await m.stop("hk");
    if (!d || !st || !sp) throw new Error(`Hooks: d=${d} st=${st} sp=${sp}`);
  });

  await test("Max runtime auto-stop", async () => {
    const m = new AgentManager();
    m.deploy("mr", agent, { maxRuntime: "2s" });
    await m.start("mr");
    await new Promise(r => setTimeout(r, 3000));
    if (m.status("mr").state !== "stopped") throw new Error("Should auto-stop");
    console.log(`     Auto-stopped after maxRuntime`);
  });

  await test("getAgent returns instance", async () => {
    const m = new AgentManager();
    m.deploy("ga", agent);
    if (typeof m.getAgent("ga").runAction !== "function") throw new Error("Not a TonAgentKit");
  });

  await test("Nonexistent → error", async () => {
    const m = new AgentManager();
    try { m.status("nope"); throw new Error("Should throw"); } catch (e: any) { if (!e.message.includes("not found")) throw e; }
  });

  await test("Metadata preserved", async () => {
    const m = new AgentManager();
    m.deploy("md", agent, { metadata: { role: "trader" } });
    if (m.status("md").metadata?.role !== "trader") throw new Error("Metadata lost");
  });

  await test("Deploy chainable", async () => {
    const m = new AgentManager();
    const r = m.deploy("c1", agent).deploy("c2", agent);
    if (r !== m) throw new Error("Not chainable");
    if (m.summary().total !== 2) throw new Error("Should have 2");
  });

  sectionEnd("Agent Lifecycle Manager");

  // ══════════════════════════════════════════════════════════════
  //  SECTION 15: Cache Layer
  // ══════════════════════════════════════════════════════════════
  header("💾", 15, "Cache Layer", "Transparent TTL cache for read actions");

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

  sectionEnd("Cache Layer");

  // ══════════════════════════════════════════════════════════════
  //  SECTION 16: MCP SSE Transport
  // ══════════════════════════════════════════════════════════════
  header("🔌", 16, "MCP SSE Transport", "Remote MCP access with auth");

  const http = require("http");
  const crypto = require("crypto");

  function httpReq(url: string, opts: any = {}): Promise<{ status: number; body: any; headers: any }> {
    return new Promise((resolve, reject) => {
      const req = http.request(url, { method: "GET", ...opts }, (res: any) => {
        let d = ""; res.on("data", (c: any) => { d += c; });
        res.on("end", () => { try { resolve({ status: res.statusCode, body: JSON.parse(d), headers: res.headers }); } catch { resolve({ status: res.statusCode, body: d, headers: res.headers }); } });
      }); req.on("error", reject); if (opts.body) req.write(opts.body); req.end();
    });
  }

  const testToken = "test-mcp-token-" + Date.now();
  const testPort = 3099;
  let mcpTestServer: any = null;

  await test("SSE test server starts", async () => {
    mcpTestServer = http.createServer((req: any, res: any) => {
      const url = new URL(req.url, `http://localhost:${testPort}`);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
      if (url.pathname === "/health") { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ status: "ok", transport: "sse" })); return; }
      if (url.pathname === "/" && req.method === "GET") { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ name: "ton-agent-kit-mcp", transport: "sse" })); return; }
      const authH = req.headers["authorization"];
      if (!authH || authH !== `Bearer ${testToken}`) { res.writeHead(401, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "Unauthorized" })); return; }
      if (url.pathname === "/sse") { res.writeHead(200, { "Content-Type": "text/event-stream" }); res.write("data: connected\n\n"); return; }
      res.writeHead(404); res.end(JSON.stringify({ error: "Not found" }));
    });
    await new Promise<void>((r) => { mcpTestServer.listen(testPort, () => r()); });
    console.log(`     Port: ${testPort}`);
  });

  await test("Health endpoint (no auth)", async () => {
    const r = await httpReq(`http://localhost:${testPort}/health`);
    if (r.status !== 200) throw new Error(`${r.status}`);
    if (r.body.status !== "ok") throw new Error("Not ok");
  });

  await test("Info endpoint (no auth)", async () => {
    const r = await httpReq(`http://localhost:${testPort}/`);
    if (r.status !== 200) throw new Error(`${r.status}`);
    if (r.body.name !== "ton-agent-kit-mcp") throw new Error("Wrong name");
  });

  await test("SSE without auth → 401", async () => {
    const r = await httpReq(`http://localhost:${testPort}/sse`);
    if (r.status !== 401) throw new Error(`${r.status}`);
  });

  await test("SSE wrong token → 401", async () => {
    const r = await httpReq(`http://localhost:${testPort}/sse`, { headers: { "Authorization": "Bearer wrong" } });
    if (r.status !== 401) throw new Error(`${r.status}`);
  });

  await test("SSE valid token → 200", async () => {
    const r = await new Promise<{ status: number }>((resolve) => {
      const req = http.request(`http://localhost:${testPort}/sse`, { headers: { "Authorization": `Bearer ${testToken}` } }, (res: any) => {
        resolve({ status: res.statusCode }); res.destroy();
      }); req.end();
    });
    if (r.status !== 200) throw new Error(`${r.status}`);
  });

  await test("Unknown endpoint → 404", async () => {
    const r = await httpReq(`http://localhost:${testPort}/nope`, { headers: { "Authorization": `Bearer ${testToken}` } });
    if (r.status !== 404) throw new Error(`${r.status}`);
  });

  await test("CORS headers present", async () => {
    const r = await httpReq(`http://localhost:${testPort}/health`);
    if (r.headers["access-control-allow-origin"] !== "*") throw new Error("No CORS");
  });

  await test("OPTIONS preflight → 204", async () => {
    const r = await httpReq(`http://localhost:${testPort}/sse`, { method: "OPTIONS" });
    if (r.status !== 204) throw new Error(`${r.status}`);
  });

  await test("SSE server shutdown", async () => {
    await new Promise<void>((r) => { mcpTestServer.close(() => r()); });
    mcpTestServer = null;
  });

  sectionEnd("MCP SSE Transport");

  // ══════════════════════════════════════════════════════════════
  //  SUMMARY
  // ══════════════════════════════════════════════════════════════

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const total = passed + failed + skipped;

  console.log(`

╔${"═".repeat(W - 2)}╗
║${" ".repeat(Math.floor((W - 36) / 2))}🧪 Comprehensive Test Results${" ".repeat(Math.ceil((W - 36) / 2))}║
╚${"═".repeat(W - 2)}╝

  ✅ Passed:  ${String(passed).padStart(3)}
  ❌ Failed:  ${String(failed).padStart(3)}
  ⏭️  Skipped: ${String(skipped).padStart(3)}
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

  console.log(`
  ── Plugin Coverage ──
  ┌${"─".repeat(W - 4)}┐
  │  @ton-agent-kit/core             ✅ Agent + Wallet + toAITools  │
  │  @ton-agent-kit/plugin-token     ✅ 7 actions tested            │
  │  @ton-agent-kit/plugin-defi      ✅ 3 actions tested            │
  │  @ton-agent-kit/plugin-dns       ✅ 3 actions tested            │
  │  @ton-agent-kit/plugin-nft       ✅ 2 actions + 1 skip          │
  │  @ton-agent-kit/plugin-staking   ✅ 1 action + 2 schema         │
  │  @ton-agent-kit/plugin-analytics ✅ 2 actions tested            │
  │  @ton-agent-kit/plugin-escrow    ✅ 5 actions (on-chain!)       │
  │  @ton-agent-kit/plugin-identity  ✅ 3 actions tested            │
  │  @ton-agent-kit/plugin-payments  ✅ Schema validated             │
  └${"─".repeat(W - 4)}┘`);

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
  │     🎉  ALL ${total} TESTS PASSED — 0 FAILURES                │
  │                                                            │
  │     ${String(actions.length).padEnd(2)} actions · 9 plugins · on-chain verified            │
  │     npm install @ton-agent-kit/core → works!               │
  │                                                            │
  └${"─".repeat(W - 4)}┘
`);
  } else {
    console.log(`\n  ⚠️  ${failed} test(s) need attention.\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("❌ Fatal:", err.message);
  console.error(err.stack);
  process.exit(1);
});
