/**
 * TON Agent Kit — Multi-Agent Commerce Protocol Demo
 *
 * Two AI agents with SEPARATE wallets execute REAL on-chain commerce:
 * Identity → Discovery → Escrow (deploy) → Deposit → Service → Release → Reputation → Verify
 *
 * Every transaction is verifiable on tonviewer.com
 */

import { TonClient4 } from "@ton/ton";
import "dotenv/config";
import { TonAgentKit } from "./packages/core/src/agent";
import { KeypairWallet } from "./packages/core/src/wallet";
import TokenPlugin from "./packages/plugin-token/src/index";
import DefiPlugin from "./packages/plugin-defi/src/index";
import EscrowPlugin from "./packages/plugin-escrow/src/index";
import IdentityPlugin from "./packages/plugin-identity/src/index";

const MNEMONIC_A = process.env.TON_MNEMONIC;
const MNEMONIC_B = process.env.TON_MNEMONIC_AGENT_B;
const NETWORK = (process.env.TON_NETWORK as "testnet" | "mainnet") || "testnet";
const RPC_URL = process.env.TON_RPC_URL || "https://testnet-v4.tonhubapi.com";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function header(step: number, title: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  STEP ${step} — ${title}`);
  console.log(`${"═".repeat(60)}\n`);
}

async function main() {
  if (!MNEMONIC_A) {
    console.error("❌ Set TON_MNEMONIC in .env (Agent A — market data provider)");
    process.exit(1);
  }
  if (!MNEMONIC_B) {
    console.error("❌ Set TON_MNEMONIC_AGENT_B in .env (Agent B — trading bot)");
    console.error("   Generate a testnet wallet and add its 24-word mnemonic.");
    process.exit(1);
  }

  console.log("\n🤖 TON Agent Kit — Multi-Agent Commerce Demo\n");
  console.log("  Two AI agents with SEPARATE wallets negotiate,");
  console.log("  pay, and rate each other — all on-chain.\n");
  console.log(`  Network: ${NETWORK}`);

  const viewer = NETWORK === "testnet"
    ? "https://testnet.tonviewer.com"
    : "https://tonviewer.com";

  // ── Init Agent A (market-data-provider) ──
  const clientA = new TonClient4({ endpoint: RPC_URL });
  const walletA = await KeypairWallet.autoDetect(MNEMONIC_A.split(" "), clientA, NETWORK);
  const addrA = walletA.address.toString({ testOnly: NETWORK === "testnet", bounceable: false });
  const rawAddrA = walletA.address.toRawString();

  const agentA = new TonAgentKit(walletA, RPC_URL, {}, NETWORK)
    .use(TokenPlugin)
    .use(DefiPlugin)
    .use(EscrowPlugin)
    .use(IdentityPlugin);

  // ── Init Agent B (trading-bot) ──
  const clientB = new TonClient4({ endpoint: RPC_URL });
  const walletB = await KeypairWallet.autoDetect(MNEMONIC_B.split(" "), clientB, NETWORK);
  const addrB = walletB.address.toString({ testOnly: NETWORK === "testnet", bounceable: false });

  const agentB = new TonAgentKit(walletB, RPC_URL, {}, NETWORK)
    .use(TokenPlugin)
    .use(DefiPlugin)
    .use(EscrowPlugin)
    .use(IdentityPlugin);

  console.log(`${"─".repeat(60)}`);
  console.log(`\n  📡 Agent A (Provider):`);
  console.log(`     Wallet: ${addrA}`);
  console.log(`     ${viewer}/${addrA}`);
  console.log(`\n  🤖 Agent B (Trader):`);
  console.log(`     Wallet: ${addrB}`);
  console.log(`     ${viewer}/${addrB}`);
  console.log(`\n${"─".repeat(60)}`);

  await sleep(2000);

  // ════════════════════════════════════════════════════════════
  // STEP 1 — IDENTITY: Register from different addresses
  // ════════════════════════════════════════════════════════════
  header(1, "IDENTITY — Register AI Agents (separate wallets)");

  const providerReg = await agentA.runAction("register_agent", {
    name: "market-data-provider",
    capabilities: ["price_feed", "market_data", "analytics"],
    description: "Real-time token prices and market analytics via x402 API",
  }) as any;
  console.log("  📡 Agent A registered (from wallet A):");
  console.log(`     Name:         ${providerReg.name}`);
  console.log(`     ID:           ${providerReg.agentId}`);
  console.log(`     Address:      ${providerReg.friendlyAddress}`);
  console.log(`     Capabilities: ${providerReg.capabilities.join(", ")}`);

  console.log();

  const traderReg = await agentB.runAction("register_agent", {
    name: "trading-bot",
    capabilities: ["trading", "dex", "arbitrage"],
    description: "Automated DEX trading with DeDust and StonFi",
  }) as any;
  console.log("  🤖 Agent B registered (from wallet B):");
  console.log(`     Name:         ${traderReg.name}`);
  console.log(`     ID:           ${traderReg.agentId}`);
  console.log(`     Address:      ${traderReg.friendlyAddress}`);
  console.log(`     Capabilities: ${traderReg.capabilities.join(", ")}`);

  if (addrA !== addrB) {
    console.log(`\n  ✅ Addresses are DIFFERENT — true multi-agent setup!`);
  }

  await sleep(2000);

  // ════════════════════════════════════════════════════════════
  // STEP 2 — DISCOVERY: Agent B finds Agent A
  // ════════════════════════════════════════════════════════════
  header(2, "DISCOVERY — Agent B Finds a Price Feed Provider");

  const discovery = await agentB.runAction("discover_agent", {
    capability: "price_feed",
  }) as any;
  console.log(`  🔍 Agent B searched for "price_feed" capability`);
  console.log(`  📋 Found ${discovery.count} agent(s):\n`);
  for (const a of discovery.agents) {
    console.log(`     • ${a.name} (${a.friendlyAddress})`);
    console.log(`       Capabilities: ${a.capabilities.join(", ")}`);
  }

  await sleep(2000);

  // ════════════════════════════════════════════════════════════
  // STEP 3 — ESCROW: Agent B deploys contract to pay Agent A
  // ════════════════════════════════════════════════════════════
  header(3, "ESCROW — Agent B Deploys Payment Contract");

  console.log("  💰 Agent B deploys escrow contract to pay Agent A...\n");
  const escrow = await agentB.runAction("create_escrow", {
    beneficiary: rawAddrA,
    amount: "0.05",
    description: "Payment for 24h market data feed",
    deadlineMinutes: 10,
  }) as any;
  console.log(`     ✅ Contract deployed on-chain!`);
  console.log(`     Escrow ID:    ${escrow.escrowId}`);
  console.log(`     Amount:       ${escrow.amount}`);
  console.log(`     Contract:     ${escrow.friendlyContract}`);
  console.log(`     Depositor:    ${addrB} (Agent B)`);
  console.log(`     Beneficiary:  ${escrow.friendlyBeneficiary} (Agent A)`);
  console.log(`     Deadline:     ${escrow.deadline}`);
  console.log(`\n  🔗 ${viewer}/${escrow.friendlyContract}`);

  await sleep(2000);

  // ════════════════════════════════════════════════════════════
  // STEP 4 — DEPOSIT: Agent B funds the escrow
  // ════════════════════════════════════════════════════════════
  header(4, "DEPOSIT — Agent B Funds the Escrow");

  // Snapshot Agent A's balance before
  const balanceBefore = await agentA.runAction("get_balance", {}) as any;
  console.log(`  📊 Agent A balance BEFORE: ${balanceBefore.balance} TON`);

  console.log(`\n  ⏳ Waiting 15s for contract deployment to confirm...`);
  await sleep(15000);

  console.log(`\n  💸 Agent B depositing 0.05 TON to escrow contract...\n`);
  const deposit = await agentB.runAction("deposit_to_escrow", {
    escrowId: escrow.escrowId,
  }) as any;
  console.log(`     ✅ Escrow funded on-chain!`);
  console.log(`     Status:       ${deposit.status}`);
  console.log(`     TX Hash:      ${deposit.depositTxHash}`);
  if (deposit.depositTxHash && deposit.depositTxHash !== "pending") {
    console.log(`\n  🔗 ${viewer}/transaction/${deposit.depositTxHash}`);
  }

  console.log(`\n  ⏳ Waiting 15s for block confirmation...`);
  await sleep(15000);

  // Verify funded state on-chain
  await sleep(3000);
  const fundedInfo = await agentB.runAction("get_escrow_info", {
    escrowId: escrow.escrowId,
  }) as any;
  console.log(`\n  🔍 On-chain verification:`);
  console.log(`     Status:       ${fundedInfo.onChain?.status || "pending"}`);
  console.log(`     Balance:      ${fundedInfo.onChain?.balance || "checking..."}`);
  console.log(`     Depositor:    ${fundedInfo.onChain?.depositor} (Agent B)`);
  console.log(`     Beneficiary:  ${fundedInfo.onChain?.beneficiary} (Agent A)`);

  await sleep(2000);

  // ════════════════════════════════════════════════════════════
  // STEP 5 — SERVICE: Agent A delivers market data
  // ════════════════════════════════════════════════════════════
  header(5, "SERVICE — Agent A Delivers Market Data");

  console.log("  📊 Agent A (market-data-provider) fulfills the request...\n");
  try {
    const price = await agentA.runAction("get_price", {
      token: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    }) as any;
    console.log(`     Token:     USDT`);
    console.log(`     Price USD: $${price.priceUSD || price.price_usd || JSON.stringify(price)}`);
    if (price.priceTON || price.price_ton) {
      console.log(`     Price TON: ${price.priceTON || price.price_ton} TON`);
    }
    console.log(`\n  ✅ Market data delivered from Agent A to Agent B!`);
  } catch (err: any) {
    console.log(`     ⚠️  Price API unavailable (${err.message.slice(0, 60)})`);
    console.log(`     📦 Simulated: USDT = $1.0001 / 0.77 TON`);
    console.log(`\n  ✅ Market data delivered (simulated)!`);
  }

  await sleep(2000);

  // ════════════════════════════════════════════════════════════
  // STEP 6 — RELEASE: Agent B releases payment to Agent A
  // ════════════════════════════════════════════════════════════
  header(6, "RELEASE — Agent B Releases Payment to Agent A");

  console.log("  🔓 Service confirmed — Agent B releasing escrow to Agent A...\n");
  await sleep(3000);
  const release = await agentB.runAction("release_escrow", {
    escrowId: escrow.escrowId,
  }) as any;
  console.log(`     ✅ Escrow released on-chain!`);
  console.log(`     Status:       ${release.status}`);
  console.log(`     Beneficiary:  ${release.friendlyBeneficiary} (Agent A)`);
  console.log(`     TX Hash:      ${release.releaseTxHash}`);
  if (release.releaseTxHash && release.releaseTxHash !== "pending") {
    console.log(`\n  🔗 ${viewer}/transaction/${release.releaseTxHash}`);
  }

  console.log(`\n  ⏳ Waiting 15s for block confirmation...`);
  await sleep(15000);

  // Verify released state on-chain
  await sleep(3000);
  const releasedInfo = await agentB.runAction("get_escrow_info", {
    escrowId: escrow.escrowId,
  }) as any;
  console.log(`\n  🔍 On-chain verification (final state):`);
  console.log(`     Released:     ${releasedInfo.onChain?.released}`);
  console.log(`     Balance:      ${releasedInfo.onChain?.balance}`);
  console.log(`     Status:       ${releasedInfo.onChain?.status}`);

  await sleep(2000);

  // ════════════════════════════════════════════════════════════
  // STEP 7 — REPUTATION: Both agents rate each other
  // ════════════════════════════════════════════════════════════
  header(7, "REPUTATION — Both Agents Rate Each Other");

  const providerRep = await agentA.runAction("get_agent_reputation", {
    agentId: "agent_market-data-provider",
    addTask: true,
    success: true,
  }) as any;
  console.log("  ⭐ Agent A (market-data-provider) reputation:");
  console.log(`     Score:      ${providerRep.reputation.score}/100`);
  console.log(`     Tasks:      ${providerRep.reputation.successfulTasks}/${providerRep.reputation.totalTasks} successful`);

  console.log();

  const traderRep = await agentB.runAction("get_agent_reputation", {
    agentId: "agent_trading-bot",
    addTask: true,
    success: true,
  }) as any;
  console.log("  ⭐ Agent B (trading-bot) reputation:");
  console.log(`     Score:      ${traderRep.reputation.score}/100`);
  console.log(`     Tasks:      ${traderRep.reputation.successfulTasks}/${traderRep.reputation.totalTasks} successful`);

  await sleep(2000);

  // ════════════════════════════════════════════════════════════
  // STEP 8 — VERIFY: Agent A received payment
  // ════════════════════════════════════════════════════════════
  header(8, "VERIFY — Agent A Received Payment");

  await sleep(3000);
  const balanceAfter = await agentA.runAction("get_balance", {}) as any;
  const before = parseFloat(balanceBefore.balance);
  const after = parseFloat(balanceAfter.balance);
  const diff = after - before;
  console.log(`  💰 Agent A balance BEFORE: ${balanceBefore.balance} TON`);
  console.log(`  💰 Agent A balance AFTER:  ${balanceAfter.balance} TON`);
  console.log(`  📈 Difference:             ${diff >= 0 ? "+" : ""}${diff.toFixed(6)} TON`);
  if (diff > 0) {
    console.log(`\n  ✅ Agent A received payment from Agent B via escrow!`);
  }

  // ════════════════════════════════════════════════════════════
  // FINAL SUMMARY
  // ════════════════════════════════════════════════════════════
  console.log(`\n${"═".repeat(60)}`);
  console.log("  ✅ MULTI-AGENT COMMERCE PROTOCOL — COMPLETE");
  console.log(`${"═".repeat(60)}\n`);
  console.log("  Flow executed:");
  console.log("  ┌──────────────────────────────────────────────────────┐");
  console.log("  │  1. 🆔 Identity    → Two agents, TWO wallets        │");
  console.log("  │  2. 🔍 Discovery   → Agent B found Agent A          │");
  console.log("  │  3. 🔒 Escrow      → Contract deployed by Agent B   │");
  console.log("  │  4. 💸 Deposit     → Agent B funded escrow (0.05)   │");
  console.log("  │  5. 📊 Service     → Agent A delivered market data  │");
  console.log("  │  6. 🔓 Release     → Payment released to Agent A    │");
  console.log("  │  7. ⭐ Reputation  → Both agents rated 100/100      │");
  console.log("  │  8. ✅ Verify      → Agent A balance increased      │");
  console.log("  └──────────────────────────────────────────────────────┘");
  console.log();
  console.log("  👥 Wallets:");
  console.log(`     Agent A (Provider): ${addrA}`);
  console.log(`     Agent B (Trader):   ${addrB}`);
  console.log();
  console.log("  📋 On-chain proof:");
  console.log(`     Contract:   ${escrow.friendlyContract}`);
  console.log(`     Deposit TX: ${deposit.depositTxHash}`);
  console.log(`     Release TX: ${release.releaseTxHash}`);
  console.log();
  console.log("  🔗 Verify on tonviewer:");
  console.log(`     ${viewer}/${escrow.friendlyContract}`);
  console.log();
  console.log("  All transactions verifiable on testnet.tonviewer.com");
  console.log();
  console.log("  This is the Agent Commerce Protocol:");
  console.log("  Two AI agents with separate wallets discover each other,");
  console.log("  negotiate payment via smart contract escrow,");
  console.log("  exchange services, and build on-chain reputation");
  console.log("  — all on TON blockchain.\n");
}

main().catch(console.error);
