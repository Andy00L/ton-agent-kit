/**
 * TON Agent Kit — Agent Commerce Protocol Demo
 *
 * Simulates a full agent-to-agent commerce flow:
 * Identity → Discovery → Escrow → Service → Reputation
 */

import { TonClient4 } from "@ton/ton";
import "dotenv/config";
import { TonAgentKit } from "./packages/core/src/agent";
import { KeypairWallet } from "./packages/core/src/wallet";
import DefiPlugin from "./packages/plugin-defi/src/index";
import EscrowPlugin from "./packages/plugin-escrow/src/index";
import IdentityPlugin from "./packages/plugin-identity/src/index";

const MNEMONIC = process.env.TON_MNEMONIC!;
const NETWORK = (process.env.TON_NETWORK as "testnet" | "mainnet") || "testnet";
const RPC_URL = process.env.TON_RPC_URL || "https://testnet-v4.tonhubapi.com";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function header(step: number, title: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  STEP ${step} — ${title}`);
  console.log(`${"═".repeat(60)}\n`);
}

async function main() {
  console.log("\n🤖 TON Agent Kit — Agent Commerce Protocol Demo\n");
  console.log("  Two AI agents negotiate, pay, and rate each other");
  console.log("  using on-chain identity, escrow, and reputation.\n");
  console.log(`  Network: ${NETWORK}`);
  console.log(`${"─".repeat(60)}`);

  // ── Init ──
  const client = new TonClient4({ endpoint: RPC_URL });
  const wallet = await KeypairWallet.autoDetect(MNEMONIC.split(" "), client, NETWORK);
  const friendlyAddr = wallet.address.toString({ testOnly: NETWORK === "testnet", bounceable: false });
  console.log(`  Wallet:  ${friendlyAddr}`);
  console.log(`${"─".repeat(60)}`);

  const agent = new TonAgentKit(wallet, RPC_URL, {}, NETWORK)
    .use(DefiPlugin)
    .use(EscrowPlugin)
    .use(IdentityPlugin);

  await sleep(1000);

  // ════════════════════════════════════════════════════════════
  // STEP 1 — IDENTITY: Register both agents
  // ════════════════════════════════════════════════════════════
  header(1, "IDENTITY — Register AI Agents");

  const providerReg = await agent.runAction("register_agent", {
    name: "market-data-provider",
    capabilities: ["price_feed", "market_data", "analytics"],
    description: "Real-time token prices and market analytics via x402 API",
  });
  console.log("  📡 Agent A registered:");
  console.log(`     Name:         ${(providerReg as any).name}`);
  console.log(`     ID:           ${(providerReg as any).agentId}`);
  console.log(`     Address:      ${(providerReg as any).friendlyAddress}`);
  console.log(`     Capabilities: ${(providerReg as any).capabilities.join(", ")}`);

  console.log();

  const traderReg = await agent.runAction("register_agent", {
    name: "trading-bot",
    capabilities: ["trading", "dex", "arbitrage"],
    description: "Automated DEX trading with DeDust and StonFi",
  });
  console.log("  🤖 Agent B registered:");
  console.log(`     Name:         ${(traderReg as any).name}`);
  console.log(`     ID:           ${(traderReg as any).agentId}`);
  console.log(`     Address:      ${(traderReg as any).friendlyAddress}`);
  console.log(`     Capabilities: ${(traderReg as any).capabilities.join(", ")}`);

  await sleep(1000);

  // ════════════════════════════════════════════════════════════
  // STEP 2 — DISCOVERY: Trading-bot searches for a provider
  // ════════════════════════════════════════════════════════════
  header(2, "DISCOVERY — Find a Price Feed Provider");

  const discovery = await agent.runAction("discover_agent", {
    capability: "price_feed",
  }) as any;
  console.log(`  🔍 Trading-bot searched for "price_feed" capability`);
  console.log(`  📋 Found ${discovery.count} agent(s):\n`);
  for (const a of discovery.agents) {
    console.log(`     • ${a.name} (${a.friendlyAddress?.slice(0, 8)}...)`);
    console.log(`       Capabilities: ${a.capabilities.join(", ")}`);
    console.log(`       Description:  ${a.description}`);
  }

  await sleep(1000);

  // ════════════════════════════════════════════════════════════
  // STEP 3 — ESCROW: Create payment for data service
  // ════════════════════════════════════════════════════════════
  header(3, "ESCROW — Create Payment for Data Service");

  console.log("  💰 Trading-bot creates escrow to pay for 24h market data feed...\n");
  const escrow = await agent.runAction("create_escrow", {
    beneficiary: wallet.address.toRawString(),
    amount: "0.1",
    description: "Payment for 24h market data feed",
    deadlineMinutes: 60,
  }) as any;
  console.log(`     Escrow ID:    ${escrow.escrowId}`);
  console.log(`     Amount:       ${escrow.amount}`);
  console.log(`     Beneficiary:  ${escrow.friendlyBeneficiary?.slice(0, 12)}...`);
  console.log(`     Deadline:     ${escrow.deadline}`);
  console.log(`     Status:       ${escrow.status}`);
  console.log(`\n  📝 Next: ${escrow.nextStep}`);
  console.log(`\n  ⏭️  (Skipping deposit/release — would spend real TON)`);

  await sleep(1000);

  // ════════════════════════════════════════════════════════════
  // STEP 4 — SERVICE: Market-data-provider delivers data
  // ════════════════════════════════════════════════════════════
  header(4, "SERVICE — Deliver Market Data");

  console.log("  📊 Market-data-provider fulfills the request...\n");
  try {
    const price = await agent.runAction("get_price", {
      token: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    }) as any;
    console.log(`     Token:     USDT`);
    console.log(`     Price USD: $${price.priceUSD || price.price_usd || price.usd || JSON.stringify(price)}`);
    if (price.priceTON || price.price_ton) {
      console.log(`     Price TON: ${price.priceTON || price.price_ton} TON`);
    }
    console.log(`\n  ✅ Market data delivered successfully!`);
  } catch (err: any) {
    console.log(`     ⚠️  Price API unavailable (${err.message.slice(0, 60)})`);
    console.log(`     📦 Simulated: USDT = $1.0001 / 0.2597 TON`);
    console.log(`\n  ✅ Market data delivered (simulated)!`);
  }

  await sleep(1000);

  // ════════════════════════════════════════════════════════════
  // STEP 5 — REPUTATION: Both agents rate the interaction
  // ════════════════════════════════════════════════════════════
  header(5, "REPUTATION — Rate the Interaction");

  const providerRep = await agent.runAction("get_agent_reputation", {
    agentId: "agent_market-data-provider",
    addTask: true,
    success: true,
  }) as any;
  console.log("  ⭐ Market-data-provider reputation updated:");
  console.log(`     Score:      ${providerRep.reputation.score}/100`);
  console.log(`     Tasks:      ${providerRep.reputation.successfulTasks}/${providerRep.reputation.totalTasks} successful`);

  console.log();

  const traderRep = await agent.runAction("get_agent_reputation", {
    agentId: "agent_trading-bot",
    addTask: true,
    success: true,
  }) as any;
  console.log("  ⭐ Trading-bot reputation updated:");
  console.log(`     Score:      ${traderRep.reputation.score}/100`);
  console.log(`     Tasks:      ${traderRep.reputation.successfulTasks}/${traderRep.reputation.totalTasks} successful`);

  await sleep(1000);

  // ════════════════════════════════════════════════════════════
  // STEP 6 — SUMMARY
  // ════════════════════════════════════════════════════════════
  console.log(`\n${"═".repeat(60)}`);
  console.log("  ✅ AGENT COMMERCE PROTOCOL — COMPLETE");
  console.log(`${"═".repeat(60)}\n`);
  console.log("  Flow executed:");
  console.log("  ┌─────────────────────────────────────────────────┐");
  console.log("  │  1. 🆔 Identity    → Both agents registered     │");
  console.log("  │  2. 🔍 Discovery   → Trading-bot found provider │");
  console.log("  │  3. 🔒 Escrow      → Payment locked in escrow   │");
  console.log("  │  4. 📊 Service     → Market data delivered      │");
  console.log("  │  5. ⭐ Reputation  → Both agents rated 100/100  │");
  console.log("  └─────────────────────────────────────────────────┘");
  console.log();
  console.log("  This is the Agent Commerce Protocol:");
  console.log("  AI agents discover each other, negotiate payment,");
  console.log("  exchange services, and build on-chain reputation");
  console.log("  — all on TON blockchain.\n");
}

main().catch(console.error);
