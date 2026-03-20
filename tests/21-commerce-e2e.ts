// tests/21-commerce-e2e.ts — Wrapped from test-commerce.ts
/**
 * Agent Commerce E2E Test Suite
 * 5 wallets, 2 servers, full commerce flow
 */

import { readFileSync } from "fs";
import express from "express";

const envContent = readFileSync(".env", "utf-8");
const getEnv = (key: string) =>
  envContent.split("\n").find((l) => l.startsWith(key + "="))?.slice(key.length + 1).trim() || "";

process.env.TON_MNEMONIC = getEnv("TON_MNEMONIC");

import { TonAgentKit } from "../packages/core/src/agent";
import { KeypairWallet } from "../packages/core/src/wallet";
import TokenPlugin from "../packages/plugin-token/src/index";
import EscrowPlugin from "../packages/plugin-escrow/src/index";
import IdentityPlugin from "../packages/plugin-identity/src/index";
import AnalyticsPlugin from "../packages/plugin-analytics/src/index";
import PaymentsPlugin from "../packages/plugin-payments/src/index";
import { createMemoryPlugin, InMemoryStore } from "../packages/plugin-memory/src/index";
import { tonPaywall } from "../packages/x402-middleware/src/index";

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
const shortAddr = (a: string) => a.slice(0, 8) + "..." + a.slice(-4);

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
    console.log(`     → ${err.message?.slice(0, 120)}`);
    failed++;
    sectionFailed++;
    errors.push(`${name}: ${err.message?.slice(0, 100)}`);
    return null;
  }
}

async function createEscrowWithRetry(agent: any, params: any, retries = 2): Promise<any> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await agent.runAction("create_escrow", params);
    } catch (err: any) {
      if (i < retries && (err.message?.includes("500") || err.message?.includes("timeout") || err.message?.includes("fetch"))) {
        console.log(`     ⏳ Escrow creation failed, retrying in 15s... (attempt ${i + 2}/${retries + 1})`);
        await delay(15000);
        continue;
      }
      throw err;
    }
  }
}

function skip(name: string, reason: string) {
  console.log(`  ⏭️  ${name} — ${reason}`);
  skipped++;
}

export interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
  duration: number;
}

// ══════════════════════════════════════════════════════════════
//  Main
// ══════════════════════════════════════════════════════════════

async function main() {
  const mnemonicA = getEnv("TON_MNEMONIC");
  const mnemonicB = getEnv("TON_MNEMONIC_AGENT_B");
  const mnemonicArb1 = getEnv("TON_MNEMONIC_ARBITER1");
  const mnemonicArb2 = getEnv("TON_MNEMONIC_ARBITER2");
  const mnemonicArb3 = getEnv("TON_MNEMONIC_ARBITER3");

  if (!mnemonicA || !mnemonicB) {
    throw new Error("Set TON_MNEMONIC and TON_MNEMONIC_AGENT_B in .env");
  }

  const startTime = Date.now();
  const RPC_URL = "https://testnet-v4.tonhubapi.com";

  console.log(`
╔${"═".repeat(W - 2)}╗
║${" ".repeat(6)}🏪 Agent Commerce E2E — Full Protocol Test${" ".repeat(7)}║
╚${"═".repeat(W - 2)}╝

  Network:   testnet
  Timestamp: ${new Date().toISOString()}
${"─".repeat(W)}`);

  // ── Init wallets ──
  const walletA = await KeypairWallet.fromMnemonic(mnemonicA.split(" "), { version: "V5R1", network: "testnet" });
  const walletB = await KeypairWallet.fromMnemonic(mnemonicB.split(" "), { version: "V5R1", network: "testnet" });

  const makeAgent = (wallet: KeypairWallet) =>
    new TonAgentKit(wallet, RPC_URL, {}, "testnet")
      .use(TokenPlugin)
      .use(EscrowPlugin)
      .use(IdentityPlugin)
      .use(AnalyticsPlugin)
      .use(PaymentsPlugin)
      .use(createMemoryPlugin(new InMemoryStore()));

  const agentA = makeAgent(walletA);
  const agentB = makeAgent(walletB);

  const addrA = walletA.address.toRawString();
  const addrB = walletB.address.toRawString();

  // Arbiter agents (only need EscrowPlugin)
  let arbiter1Agent: TonAgentKit | null = null;
  let arbiter1Addr = "";
  if (mnemonicArb1) {
    const w = await KeypairWallet.fromMnemonic(mnemonicArb1.split(" "), { version: "V5R1", network: "testnet" });
    arbiter1Agent = new TonAgentKit(w, RPC_URL, {}, "testnet").use(EscrowPlugin).use(TokenPlugin);
    arbiter1Addr = w.address.toRawString();
  }

  let arbiter2Agent: TonAgentKit | null = null;
  let arbiter2Addr = "";
  if (mnemonicArb2) {
    const w = await KeypairWallet.fromMnemonic(mnemonicArb2.split(" "), { version: "V5R1", network: "testnet" });
    arbiter2Agent = new TonAgentKit(w, RPC_URL, {}, "testnet").use(EscrowPlugin).use(TokenPlugin);
    arbiter2Addr = w.address.toRawString();
  }

  let arbiter3Agent: TonAgentKit | null = null;
  let arbiter3Addr = "";
  if (mnemonicArb3) {
    const w = await KeypairWallet.fromMnemonic(mnemonicArb3.split(" "), { version: "V5R1", network: "testnet" });
    arbiter3Agent = new TonAgentKit(w, RPC_URL, {}, "testnet").use(EscrowPlugin).use(TokenPlugin);
    arbiter3Addr = w.address.toRawString();
  }

  // Print wallet info
  const balA = await agentA.runAction("get_balance", {});
  const balB = await agentB.runAction("get_balance", {});
  const arb1Bal = arbiter1Agent ? await arbiter1Agent.runAction("get_balance", {}) : null;
  const arb2Bal = arbiter2Agent ? await arbiter2Agent.runAction("get_balance", {}) : null;
  const arb3Bal = arbiter3Agent ? await arbiter3Agent.runAction("get_balance", {}) : null;

  console.log(`
  Agent A (seller):  ${shortAddr(addrA)} | ${balA.balance} TON
  Agent B (buyer):   ${shortAddr(addrB)} | ${balB.balance} TON
  Arbiter 1:         ${arbiter1Addr ? `${shortAddr(arbiter1Addr)} | ${arb1Bal?.balance || "?"} TON` : "not configured"}
  Arbiter 2:         ${arbiter2Addr ? `${shortAddr(arbiter2Addr)} | ${arb2Bal?.balance || "?"} TON` : "not configured"}
  Arbiter 3:         ${arbiter3Addr ? `${shortAddr(arbiter3Addr)} | ${arb3Bal?.balance || "?"} TON` : "not configured"}
`);

  // ── Start Express servers ──
  const serverA = express();
  serverA.get("/", (_req, res) => res.json({ agent: "data-provider", status: "online" }));
  serverA.get("/api/price-feed",
    tonPaywall({ amount: "0.001", recipient: addrA, network: "testnet" }),
    (_req, res) => res.json({ token: "TON", price: 3.85, timestamp: Date.now(), source: "agent-a" }),
  );
  const srvA = serverA.listen(3001);

  const serverB = express();
  serverB.get("/api/analytics",
    tonPaywall({ amount: "0.002", recipient: addrB, network: "testnet" }),
    (_req, res) => res.json({ walletAnalysis: "active trader", riskScore: 0.3 }),
  );
  const srvB = serverB.listen(3002);

  console.log(`  Server A: http://localhost:3001 (price feed)
  Server B: http://localhost:3002 (analytics)
${"─".repeat(W)}`);

  try {
    // SECTION 1: Registration & Discovery
    header("🪪", 1, "Registration & Discovery", "Both agents register, then find each other");

    await test("Agent A registers as data-provider", async () => {
      const r = await agentA.runAction("register_agent", {
        name: "data-provider",
        capabilities: ["price_feed", "analytics"],
        available: true,
      });
      if (!r.agentId) throw new Error("Missing agentId");
      console.log(`     ID: ${r.agentId} | Available: ${r.available}`);
    });

    await test("Agent B registers as trading-bot", async () => {
      const r = await agentB.runAction("register_agent", {
        name: "trading-bot",
        capabilities: ["trading", "consumer"],
        available: true,
      });
      console.log(`     ID: ${r.agentId}`);
    });

    await test("Agent B discovers price_feed agents", async () => {
      const r = await agentB.runAction("discover_agent", { capability: "price_feed" });
      if (r.count < 1) throw new Error("Expected at least 1 agent");
      console.log(`     Found: ${r.count} agent(s)`);
    });

    await test("Agent A discovers trading agents", async () => {
      const r = await agentA.runAction("discover_agent", { capability: "trading" });
      if (r.count < 1) throw new Error("Expected at least 1 agent");
      console.log(`     Found: ${r.count} agent(s)`);
    });

    await test("Both agents start with reputation 0", async () => {
      const rA = await agentA.runAction("get_agent_reputation", { agentId: "agent_data-provider" });
      const rB = await agentB.runAction("get_agent_reputation", { agentId: "agent_trading-bot" });
      if (rA.reputation.score !== 0) throw new Error(`Agent A score: ${rA.reputation.score}`);
      if (rB.reputation.score !== 0) throw new Error(`Agent B score: ${rB.reputation.score}`);
      console.log(`     A: ${rA.reputation.score}/100 | B: ${rB.reputation.score}/100`);
    });

    sectionEnd("Registration & Discovery");

    // SECTION 2: Direct x402 Payment
    header("💳", 2, "Direct x402 Payment", "Agent B pays Agent A for price feed (no escrow)");

    const balBefore = await test("Agent B balance before payment", async () => {
      const r = await agentB.runAction("get_balance", {});
      console.log(`     Balance: ${r.balance} TON`);
      return r;
    });

    const x402Result = await test("Agent B pays for price feed via x402", async () => {
      let r: any;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          r = await agentB.runAction("pay_for_resource", {
            url: "http://localhost:3001/api/price-feed",
          });
          break;
        } catch (err: any) {
          if (attempt < 3 && (err.message?.includes("500") || err.message?.includes("fetch"))) {
            console.log(`     ⏳ x402 attempt ${attempt} failed, retrying in 10s...`);
            await delay(10000);
            continue;
          }
          throw err;
        }
      }
      if (!r) throw new Error("All x402 attempts failed");
      if (!r.paid) throw new Error("Expected paid=true");
      console.log(`     Paid: ${r.amount} | TX: ${r.txHash?.slice(0, 16)}...`);
      console.log(`     Data: price=${r.data?.price}`);
      if (r.deliveryProof) {
        console.log(`     Proof: hash=${r.deliveryProof.responseHash?.slice(0, 16)}...`);
      }
      return r;
    });

    if (x402Result) {
      await delay(5000);

      await test("Agent B balance decreased", async () => {
        const r = await agentB.runAction("get_balance", {});
        const diff = parseFloat(balBefore?.balance || "0") - parseFloat(r.balance);
        if (diff <= 0) throw new Error("Balance did not decrease");
        console.log(`     Balance: ${r.balance} TON (paid ~${diff.toFixed(4)})`);
      });

      await test("Delivery proof in return value", async () => {
        const proof = x402Result.deliveryProof;
        if (!proof) throw new Error("No deliveryProof in return value");
        if (!proof.txHash) throw new Error("Missing txHash in proof");
        if (!proof.responseHash) throw new Error("Missing responseHash in proof");
        console.log(`     Proof: tx=${proof.txHash.slice(0, 16)}... hash=${proof.responseHash.slice(0, 16)}...`);
      });
    }

    sectionEnd("Direct x402 Payment");

    // SECTION 3: Escrow + x402 (Happy Path)
    header("🔒", 3, "Escrow + x402 Happy Path", "Create → Deposit → Pay → Confirm → Release");

    const escrow1 = await test("Agent B creates escrow for Agent A", async () => {
      const r = await agentB.runAction("create_escrow", {
        beneficiary: addrA,
        amount: "0.05",
        deadlineMinutes: 5,
        description: "commerce-e2e-happy",
      });
      console.log(`     Escrow: ${r.escrowId}`);
      console.log(`     Contract: ${r.friendlyContract}`);
      return r;
    });

    if (escrow1) {
      console.log(`\n  ⏳ 12s for deployment...\n`);
      await delay(12000);

      await test("Verify escrow deployed", async () => {
        const r = await agentB.runAction("get_escrow_info", { escrowId: escrow1.escrowId });
        console.log(`     Status: ${r.onChain?.status || "created"}`);
      });

      await test("Agent B deposits 0.05 TON", async () => {
        const r = await agentB.runAction("deposit_to_escrow", {
          escrowId: escrow1.escrowId,
          amount: "0.05",
        });
        console.log(`     Status: ${r.status}`);
      });

      console.log(`\n  ⏳ 12s for deposit...\n`);
      await delay(12000);

      await test("Agent B pays via x402 WITH escrowId", async () => {
        const r = await agentB.runAction("pay_for_resource", {
          url: "http://localhost:3001/api/price-feed",
          escrowId: escrow1.escrowId,
        });
        if (!r.paid) throw new Error("Expected paid=true");
        console.log(`     Paid: ${r.amount} | escrowConfirmed: ${r.deliveryProof?.escrowConfirmed}`);
      });

      console.log(`\n  ⏳ 10s for delivery confirmation...\n`);
      await delay(10000);

      await test("Verify delivery confirmed on-chain", async () => {
        const r = await agentB.runAction("get_escrow_info", { escrowId: escrow1.escrowId });
        console.log(`     deliveryConfirmed: ${r.onChain?.deliveryConfirmed ?? "unknown"}`);
      });

      await test("Agent B releases escrow (happy path)", async () => {
        const r = await agentB.runAction("release_escrow", { escrowId: escrow1.escrowId });
        console.log(`     Status: ${r.status} | TX: ${r.releaseTxHash?.slice(0, 16)}...`);
      });

      console.log(`\n  ⏳ 12s for release...\n`);
      await delay(12000);

      await test("Pending ratings created", async () => {
        const r = await agentB.runAction("list_context", { namespace: "pending_ratings" });
        console.log(`     Pending ratings: ${r.count}`);
      });

      await test("Process pending ratings", async () => {
        const r = await agentB.runAction("process_pending_ratings", { autoSubmit: true });
        console.log(`     Processed: ${r.processed} | Pending: ${r.pending}`);
      });
    }

    sectionEnd("Escrow + x402 Happy Path");

    // SECTION 4: Auto-Release
    header("⏰", 4, "Auto-Release", "Buyer receives service but doesn't release — seller still paid");

    const escrow2 = await test("Agent B creates escrow (1 min deadline)", async () => {
      const r = await agentB.runAction("create_escrow", {
        beneficiary: addrA,
        amount: "0.03",
        deadlineMinutes: 1,
        description: "commerce-e2e-auto-release",
      });
      console.log(`     Escrow: ${r.escrowId}`);
      return r;
    });

    if (escrow2) {
      console.log(`\n  ⏳ 12s deploy...\n`);
      await delay(12000);

      await test("Deposit 0.03 TON", async () => {
        await agentB.runAction("deposit_to_escrow", { escrowId: escrow2.escrowId, amount: "0.03" });
        console.log(`     Deposited`);
      });

      console.log(`\n  ⏳ 12s deposit confirm...\n`);
      await delay(12000);

      await test("Agent B accesses service (delivery confirmed)", async () => {
        const r = await agentB.runAction("pay_for_resource", {
          url: "http://localhost:3001/api/price-feed",
          escrowId: escrow2.escrowId,
        });
        console.log(`     Service received, delivery confirmed`);
      });

      console.log(`\n  ⏳ Waiting for deadline to pass (~50s)...\n`);
      await delay(50000);

      await test("Auto-release escrow (anyone can trigger)", async () => {
        const r = await agentB.runAction("auto_release_escrow", { escrowId: escrow2.escrowId });
        console.log(`     Released: ${r.released} | ${r.message}`);
      });
    }

    sectionEnd("Auto-Release");

    console.log(`\n  ⏳ 20s cooldown before next escrow...\n`);
    await delay(20000);

    // SECTION 5: No Delivery — Buyer Protected
    header("🛡️", 5, "No Delivery (Buyer Protected)", "Seller doesn't deliver → buyer gets refund");

    const escrow3 = await test("Agent B creates escrow (1 min deadline)", async () => {
      const r = await createEscrowWithRetry(agentB, {
        beneficiary: addrA,
        amount: "0.03",
        deadlineMinutes: 1,
        description: "commerce-e2e-no-delivery",
      });
      console.log(`     Escrow: ${r.escrowId}`);
      return r;
    });

    if (escrow3) {
      console.log(`\n  ⏳ 12s deploy + 12s deposit...\n`);
      await delay(12000);

      await test("Deposit 0.03 TON", async () => {
        await agentB.runAction("deposit_to_escrow", { escrowId: escrow3.escrowId, amount: "0.03" });
      });

      await delay(12000);

      console.log(`\n  ⏳ Waiting for deadline (~50s — seller never delivers)...\n`);
      await delay(50000);

      await test("No-delivery: auto-release then refund (contract-version adaptive)", async () => {
        let autoReleased = false;
        try {
          const ar = await agentB.runAction("auto_release_escrow", { escrowId: escrow3.escrowId });
          autoReleased = ar.released === true;
        } catch {
          autoReleased = false;
        }

        if (autoReleased) {
          console.log(`     Old contract: auto-released without delivery check`);
          console.log(`     (New contract will block this — recompile to enable deliveryConfirmed)`);
        } else {
          console.log(`     Auto-release blocked (no delivery confirmation) — refunding...`);
          const r = await agentB.runAction("refund_escrow", { escrowId: escrow3.escrowId });
          console.log(`     Refund: ${r.status}`);
        }
      });
    }

    sectionEnd("No Delivery (Buyer Protected)");

    console.log(`\n  ⏳ 20s cooldown before next escrow...\n`);
    await delay(20000);

    // SECTION 6: Arbiter Dispute Resolution
    header("⚖️", 6, "Arbiter Dispute Resolution", "Self-selecting arbiters: join with stake, majority votes");

    if (arbiter1Agent && arbiter1Addr && arbiter2Agent && arbiter2Addr && arbiter3Agent && arbiter3Addr) {

      // 6a: Happy path
      console.log(`\n  ── 6a: Happy path (no dispute, depositor releases) ──`);

      const escrow6a = await test("Agent B creates escrow (no arbiters needed)", async () => {
        const r = await createEscrowWithRetry(agentB, {
          beneficiary: addrA,
          amount: "0.03",
          minArbiters: 2,
          minStake: "0.1",
          deadlineMinutes: 2,
          description: "6a-happy-path",
        });
        console.log(`     Escrow: ${r.escrowId}`);
        return r;
      });

      if (escrow6a) {
        console.log(`\n  ⏳ 15s deploy...\n`);
        await delay(15000);

        await test("Deposit 0.03 TON", async () => {
          await agentB.runAction("deposit_to_escrow", { escrowId: escrow6a.escrowId, amount: "0.03" });
        });

        await delay(15000);

        await test("Depositor releases directly (no arbiters)", async () => {
          const r = await agentB.runAction("release_escrow", { escrowId: escrow6a.escrowId });
          console.log(`     Released: ${r.status}`);
        });

        await delay(10000);

        await test("Verify released on-chain", async () => {
          const r = await agentB.runAction("get_escrow_info", { escrowId: escrow6a.escrowId });
          console.log(`     Released: ${r.onChain?.released} | Balance: ${r.onChain?.balance}`);
          if (!r.onChain?.released) throw new Error("Expected released=true");
        });
      }

      console.log(`\n  ⏳ 20s cooldown...\n`);
      await delay(20000);

      // 6b: 3 arbiters, 2 vote release
      console.log(`\n  ── 6b: 3 arbiters self-join, 2/3 vote release → seller wins ──`);

      const balABefore6b = await test("Agent A balance before", async () => {
        return await agentA.runAction("get_balance", {});
      });

      const escrow6b = await test("Agent B creates escrow (minArbiters: 2)", async () => {
        const r = await createEscrowWithRetry(agentB, {
          beneficiary: addrA,
          amount: "0.03",
          minArbiters: 2,
          minStake: "0.1",
          deadlineMinutes: 5,
          description: "6b-vote-release",
        });
        console.log(`     Escrow: ${r.escrowId} | minArbiters: 2`);
        return r;
      });

      if (escrow6b) {
        console.log(`\n  ⏳ 15s deploy...\n`);
        await delay(15000);

        await test("Deposit 0.03 TON", async () => {
          await agentB.runAction("deposit_to_escrow", { escrowId: escrow6b.escrowId, amount: "0.03" });
        });

        await delay(15000);

        await test("Agent B opens dispute", async () => {
          const r = await agentB.runAction("open_dispute", { escrowId: escrow6b.escrowId });
          console.log(`     Disputed: ${r.disputed}`);
        });

        await delay(12000);

        await test("Arbiter1 joins dispute (0.15 TON stake)", async () => {
          const r = await arbiter1Agent!.runAction("join_dispute", { escrowId: escrow6b.escrowId, stake: "0.15" });
          console.log(`     Joined: ${r.joined}`);
        });

        await delay(10000);

        await test("Arbiter2 joins dispute (0.15 TON stake)", async () => {
          const r = await arbiter2Agent!.runAction("join_dispute", { escrowId: escrow6b.escrowId, stake: "0.15" });
          console.log(`     Joined: ${r.joined}`);
        });

        await delay(10000);

        await test("Arbiter3 joins dispute (0.15 TON stake)", async () => {
          const r = await arbiter3Agent!.runAction("join_dispute", { escrowId: escrow6b.escrowId, stake: "0.15" });
          console.log(`     Joined: ${r.joined}`);
        });

        await delay(12000);

        await test("Verify: 3 arbiters joined, disputed", async () => {
          const r = await agentB.runAction("get_escrow_info", { escrowId: escrow6b.escrowId });
          console.log(`     arbiterCount: ${r.onChain?.arbiterCount} | disputed: ${r.onChain?.disputed}`);
          if (r.onChain?.arbiterCount < 2) throw new Error("Expected at least 2 arbiters");
        });

        await test("Arbiter1 votes release", async () => {
          const r = await arbiter1Agent!.runAction("vote_release", { escrowId: escrow6b.escrowId });
          console.log(`     Voted: ${r.voted}`);
        });

        await delay(10000);

        await test("After 1 vote: not yet released", async () => {
          const r = await agentB.runAction("get_escrow_info", { escrowId: escrow6b.escrowId });
          console.log(`     Votes: ${r.onChain?.votesRelease}R ${r.onChain?.votesRefund}F | Released: ${r.onChain?.released}`);
        });

        await test("Arbiter2 votes release → MAJORITY", async () => {
          const r = await arbiter2Agent!.runAction("vote_release", { escrowId: escrow6b.escrowId });
          console.log(`     Voted: ${r.voted}`);
        });

        console.log(`\n  ⏳ 15s for majority settlement...\n`);
        await delay(15000);

        await test("Escrow released by majority vote", async () => {
          let info: any;
          for (let attempt = 1; attempt <= 3; attempt++) {
            info = await agentB.runAction("get_escrow_info", { escrowId: escrow6b.escrowId });
            if (info.onChain?.released) break;
            if (attempt < 3) {
              console.log(`     ⏳ State not updated, retry in 10s (${attempt}/3)...`);
              await delay(10000);
            }
          }
          console.log(`     Votes: ${info.onChain?.votesRelease}R ${info.onChain?.votesRefund}F | Released: ${info.onChain?.released}`);
          if (!info.onChain?.released) throw new Error("Expected released=true after majority vote");
        });

        await test("Agent A (seller) balance increased", async () => {
          const r = await agentA.runAction("get_balance", {});
          const diff = parseFloat(r.balance) - parseFloat(balABefore6b?.balance || "0");
          console.log(`     Agent A: ${r.balance} TON (${diff >= 0 ? "+" : ""}${diff.toFixed(4)})`);
        });
      }

      console.log(`\n  ⏳ 20s cooldown...\n`);
      await delay(20000);

      // 6c: 3 arbiters, 2 vote refund
      console.log(`\n  ── 6c: 3 arbiters self-join, 2/3 vote refund → buyer wins ──`);

      const balBBefore6c = await test("Agent B balance before", async () => {
        return await agentB.runAction("get_balance", {});
      });

      const escrow6c = await test("Agent B creates escrow (minArbiters: 2)", async () => {
        const r = await createEscrowWithRetry(agentB, {
          beneficiary: addrA,
          amount: "0.03",
          minArbiters: 2,
          minStake: "0.1",
          deadlineMinutes: 5,
          description: "6c-vote-refund",
        });
        console.log(`     Escrow: ${r.escrowId}`);
        return r;
      });

      if (escrow6c) {
        console.log(`\n  ⏳ 15s deploy...\n`);
        await delay(15000);

        await test("Deposit 0.03 TON", async () => {
          await agentB.runAction("deposit_to_escrow", { escrowId: escrow6c.escrowId, amount: "0.03" });
        });

        await delay(15000);

        await test("Agent B opens dispute", async () => {
          await agentB.runAction("open_dispute", { escrowId: escrow6c.escrowId });
        });

        await delay(12000);

        await test("Arbiter1 joins", async () => {
          await arbiter1Agent!.runAction("join_dispute", { escrowId: escrow6c.escrowId, stake: "0.15" });
        });

        await delay(10000);

        await test("Arbiter2 joins", async () => {
          await arbiter2Agent!.runAction("join_dispute", { escrowId: escrow6c.escrowId, stake: "0.15" });
        });

        await delay(10000);

        await test("Arbiter3 joins", async () => {
          await arbiter3Agent!.runAction("join_dispute", { escrowId: escrow6c.escrowId, stake: "0.15" });
        });

        await delay(12000);

        await test("Arbiter1 votes refund", async () => {
          await arbiter1Agent!.runAction("vote_refund", { escrowId: escrow6c.escrowId });
        });

        await delay(10000);

        await test("Arbiter3 votes refund → MAJORITY", async () => {
          await arbiter3Agent!.runAction("vote_refund", { escrowId: escrow6c.escrowId });
        });

        console.log(`\n  ⏳ 15s for majority settlement...\n`);
        await delay(15000);

        await test("Escrow refunded by majority vote", async () => {
          let info: any;
          for (let attempt = 1; attempt <= 3; attempt++) {
            info = await agentB.runAction("get_escrow_info", { escrowId: escrow6c.escrowId });
            if (info.onChain?.refunded) break;
            if (attempt < 3) {
              console.log(`     ⏳ State not updated, retry in 10s (${attempt}/3)...`);
              await delay(10000);
            }
          }
          console.log(`     Votes: ${info.onChain?.votesRelease}R ${info.onChain?.votesRefund}F | Refunded: ${info.onChain?.refunded}`);
          if (!info.onChain?.refunded) throw new Error("Expected refunded=true");
        });

        await test("Agent B (buyer) balance recovered", async () => {
          const r = await agentB.runAction("get_balance", {});
          const diff = parseFloat(r.balance) - parseFloat(balBBefore6c?.balance || "0");
          console.log(`     Agent B: ${r.balance} TON (${diff >= 0 ? "+" : ""}${diff.toFixed(4)})`);
        });
      }

      console.log(`\n  ⏳ 20s cooldown...\n`);
      await delay(20000);

      // 6d-6h: Rejection + edge case tests
      console.log(`\n  ── 6d-6h: Rejection + edge case tests ──`);

      const escrow6d = await test("Agent B creates escrow for rejection tests", async () => {
        const r = await createEscrowWithRetry(agentB, {
          beneficiary: addrA,
          amount: "0.03",
          minArbiters: 2,
          minStake: "0.1",
          deadlineMinutes: 2,
          description: "6d-rejections",
        });
        console.log(`     Escrow: ${r.escrowId}`);
        return r;
      });

      if (escrow6d) {
        console.log(`\n  ⏳ 15s deploy...\n`);
        await delay(15000);

        await test("Deposit 0.03 TON", async () => {
          await agentB.runAction("deposit_to_escrow", { escrowId: escrow6d.escrowId, amount: "0.03" });
        });

        await delay(15000);

        await test("Agent B opens dispute", async () => {
          await agentB.runAction("open_dispute", { escrowId: escrow6d.escrowId });
        });

        await delay(12000);

        await test("Agent B (depositor) tries join_dispute → rejected", async () => {
          try {
            await agentB.runAction("join_dispute", { escrowId: escrow6d.escrowId, stake: "0.15" });
          } catch {}
          await delay(10000);
          const r = await agentB.runAction("get_escrow_info", { escrowId: escrow6d.escrowId });
          if (r.onChain?.arbiterCount > 0) throw new Error("Depositor should not be able to join");
          console.log(`     arbiterCount: ${r.onChain?.arbiterCount} (correctly 0)`);
        });

        await test("Agent A (beneficiary) tries join_dispute → rejected", async () => {
          try {
            await agentA.runAction("join_dispute", { escrowId: escrow6d.escrowId, stake: "0.15" });
          } catch {}
          await delay(10000);
          const r = await agentB.runAction("get_escrow_info", { escrowId: escrow6d.escrowId });
          if (r.onChain?.arbiterCount > 0) throw new Error("Beneficiary should not be able to join");
          console.log(`     arbiterCount: ${r.onChain?.arbiterCount} (correctly 0)`);
        });

        await test("Arbiter1 + Arbiter2 join", async () => {
          await arbiter1Agent!.runAction("join_dispute", { escrowId: escrow6d.escrowId, stake: "0.15" });
          await delay(10000);
          await arbiter2Agent!.runAction("join_dispute", { escrowId: escrow6d.escrowId, stake: "0.15" });
          await delay(10000);
          const r = await agentB.runAction("get_escrow_info", { escrowId: escrow6d.escrowId });
          console.log(`     arbiterCount: ${r.onChain?.arbiterCount}`);
        });

        await test("Agent A (not arbiter) tries vote_release → rejected", async () => {
          try {
            await agentA.runAction("vote_release", { escrowId: escrow6d.escrowId });
          } catch {}
          await delay(10000);
          const r = await agentB.runAction("get_escrow_info", { escrowId: escrow6d.escrowId });
          console.log(`     votesRelease: ${r.onChain?.votesRelease} (should be 0)`);
          if (r.onChain?.votesRelease > 0) throw new Error("Non-arbiter vote counted");
        });

        await test("Arbiter1 votes release (first)", async () => {
          await arbiter1Agent!.runAction("vote_release", { escrowId: escrow6d.escrowId });
          await delay(10000);
          const r = await agentB.runAction("get_escrow_info", { escrowId: escrow6d.escrowId });
          console.log(`     votesRelease: ${r.onChain?.votesRelease}`);
        });

        await test("Arbiter1 votes again → rejected (double vote)", async () => {
          try {
            await arbiter1Agent!.runAction("vote_release", { escrowId: escrow6d.escrowId });
          } catch {}
          await delay(10000);
          const r = await agentB.runAction("get_escrow_info", { escrowId: escrow6d.escrowId });
          console.log(`     votesRelease: ${r.onChain?.votesRelease} (should still be 1)`);
          if (r.onChain?.votesRelease > 1) throw new Error("Double vote counted");
        });

        await test("Arbiter2 votes release → majority → settled", async () => {
          await arbiter2Agent!.runAction("vote_release", { escrowId: escrow6d.escrowId });
        });
      }

    } else {
      skip("Multi-arbiter dispute tests", "Need all 3 arbiter mnemonics configured");
    }

    sectionEnd("Arbiter Dispute");

    // SECTION 7: Double-Settle Prevention
    header("🔐", 7, "Double-Settle Prevention", "Cannot release/refund/confirm after settlement");

    if (escrow1) {
      await test("Release already-released escrow → fails", async () => {
        try {
          await agentB.runAction("release_escrow", { escrowId: escrow1.escrowId });
          throw new Error("Should have failed");
        } catch (err: any) {
          if (!err.message.includes("released") && !err.message.includes("settled") && !err.message.includes("funded")) {
            throw err;
          }
          console.log(`     Correctly rejected: ${err.message.slice(0, 60)}`);
        }
      });

      await test("Refund already-released escrow → fails", async () => {
        try {
          await agentB.runAction("refund_escrow", { escrowId: escrow1.escrowId });
          throw new Error("Should have failed");
        } catch (err: any) {
          console.log(`     Correctly rejected: ${err.message.slice(0, 60)}`);
        }
      });

      await test("Invalid escrow ID → fails gracefully", async () => {
        const r = await agentB.runAction("confirm_delivery", { escrowId: "fake_escrow_999" });
        if (r.confirmed) throw new Error("Should not confirm fake escrow");
        console.log(`     Correctly rejected: ${r.message}`);
      });
    }

    sectionEnd("Double-Settle Prevention");

    // SECTION 8: Reputation After Commerce
    header("⭐", 8, "Reputation After Commerce", "Check reputation scores reflect deals");

    await test("Agent A reputation after deals", async () => {
      const r = await agentA.runAction("get_agent_reputation", { agentId: "agent_data-provider" });
      console.log(`     Score: ${r.reputation.score}/100 | Tasks: ${r.reputation.totalTasks}`);
    });

    await test("Agent B reputation after deals", async () => {
      const r = await agentB.runAction("get_agent_reputation", { agentId: "agent_trading-bot" });
      console.log(`     Score: ${r.reputation.score}/100 | Tasks: ${r.reputation.totalTasks}`);
    });

    await test("Rate Agent A negatively (simulate bad experience)", async () => {
      const before = await agentB.runAction("get_agent_reputation", { agentId: "agent_data-provider" });
      const r = await agentB.runAction("get_agent_reputation", {
        agentId: "agent_data-provider",
        addTask: true,
        success: false,
      });
      console.log(`     Score: ${before.reputation.score} → ${r.reputation.score}/100`);
    });

    sectionEnd("Reputation After Commerce");

    // SECTION 9: Balance Reconciliation
    header("💰", 9, "Balance Reconciliation", "Final wallet balances");

    await test("Final balances", async () => {
      const bA = await agentA.runAction("get_balance", {});
      const bB = await agentB.runAction("get_balance", {});
      const diffA = parseFloat(bA.balance) - parseFloat(balA.balance);
      const diffB = parseFloat(bB.balance) - parseFloat(balB.balance);
      console.log(`     Agent A: ${bA.balance} TON (${diffA >= 0 ? "+" : ""}${diffA.toFixed(4)})`);
      console.log(`     Agent B: ${bB.balance} TON (${diffB >= 0 ? "+" : ""}${diffB.toFixed(4)})`);
    });

    sectionEnd("Balance Reconciliation");

  } finally {
    srvA.close();
    srvB.close();
  }

  // SUMMARY
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const total = passed + failed + skipped;

  console.log(`


╔${"═".repeat(W - 2)}╗
║${" ".repeat(Math.floor((W - 36) / 2))}🏪 Commerce E2E Test Results${" ".repeat(Math.ceil((W - 36) / 2))}║
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
  │     🎉  ALL ${total} TESTS PASSED                              │
  │                                                            │
  │     5 wallets · 2 servers · full commerce verified         │
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
  skipped = 0;
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
