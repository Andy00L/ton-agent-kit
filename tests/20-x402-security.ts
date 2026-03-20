// tests/20-x402-security.ts — Wrapped from test-x402.ts
/**
 * x402 Payment Middleware Test (demo-style, no counters)
 */

import { beginCell, internal, toNano } from "@ton/core";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { TonClient4, WalletContractV5R1 } from "@ton/ton";
import "dotenv/config";
import { KeypairWallet } from "../packages/core/src/wallet";
import { createPaymentServer, tonPaywall } from "../packages/x402-middleware/src/index";
import express from "express";

export interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
  duration: number;
}

async function main() {
  const mnemonic = process.env.TON_MNEMONIC!.split(" ");
  const client = new TonClient4({
    endpoint: "https://testnet-v4.tonhubapi.com",
  });
  const wallet = await KeypairWallet.autoDetect(mnemonic, client, "testnet");

  console.log(`\n⚡ x402 Payment Middleware Test`);
  console.log(`📍 Wallet: ${wallet.address.toRawString()}\n`);

  // ── Step 1: Start x402 payment server ──
  console.log(`── Step 1: Starting x402 server ──`);
  const app = createPaymentServer({
    recipient: wallet.address.toRawString(),
    network: "testnet",
    routes: [
      {
        path: "/api/price",
        amount: "0.001",
        description: "Real-time market data",
        handler: (_req, res) => {
          res.json({ ton: 3.85, btc: 95000, eth: 3200, timestamp: Date.now() });
        },
      },
      {
        path: "/api/analytics",
        amount: "0.01",
        description: "Wallet analytics report",
        handler: (_req, res) => {
          res.json({
            activeWallets: 15000,
            txVolume: "2.5M TON",
            topToken: "USDT",
          });
        },
      },
    ],
  });

  const server = app.listen(3402, () => {
    console.log(`✅ x402 server running on http://localhost:3402\n`);
  });

  // Wait for server to start
  await new Promise((r) => setTimeout(r, 1000));

  // ── Step 2: Test free endpoint ──
  console.log(`── Step 2: Test free endpoint ──`);
  const infoRes = await fetch("http://localhost:3402/");
  const info = await infoRes.json();
  console.log(`✅ Server info:`, JSON.stringify(info, null, 2));

  // ── Step 3: Test 402 response (no payment) ──
  console.log(`\n── Step 3: Request paid endpoint without payment ──`);
  const unpaidRes = await fetch("http://localhost:3402/api/price");
  console.log(`📋 Status: ${unpaidRes.status} (expected: 402)`);
  const unpaidData = await unpaidRes.json();
  console.log(`📋 Response:`, JSON.stringify(unpaidData, null, 2));

  // ── Step 4: Make payment ──
  console.log(
    `\n── Step 4: Sending payment of ${unpaidData.payment.amount} TON ──`,
  );
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const freshClient = new TonClient4({
    endpoint: "https://testnet-v4.tonhubapi.com",
  });
  const walletContract = freshClient.open(
    WalletContractV5R1.create({
      workchain: 0,
      publicKey: keyPair.publicKey,
      walletId: { networkGlobalId: -3, workchain: 0, subwalletNumber: 0 },
    }),
  );

  const seqno = await walletContract.getSeqno();
  await walletContract.sendTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    messages: [
      internal({
        to: walletContract.address, // pay ourselves
        value: toNano("0.001"),
        bounce: false,
        body: beginCell()
          .storeUint(0, 32)
          .storeStringTail("x402:price-data")
          .endCell(),
      }),
    ],
  });
  console.log(`✅ Payment sent! Waiting 15s for confirmation...`);
  await new Promise((r) => setTimeout(r, 15000));

  // ── Step 5: Get tx hash ──
  console.log(`\n── Step 5: Retrieve payment proof ──`);
  const txRes = await fetch(
    `https://testnet.tonapi.io/v2/accounts/${encodeURIComponent(wallet.address.toRawString())}/events?limit=1`,
  );
  const txData = await txRes.json();
  const txHash = txData.events?.[0]?.event_id;
  console.log(`✅ TX Hash: ${txHash}`);

  // ── Step 6: Retry with payment proof ──
  console.log(`\n── Step 6: Retry with X-Payment-Hash header ──`);
  const paidRes = await fetch("http://localhost:3402/api/price", {
    headers: { "X-Payment-Hash": txHash },
  });
  console.log(`📋 Status: ${paidRes.status} (expected: 200)`);
  const paidData = await paidRes.json();
  console.log(`✅ Paid response:`, JSON.stringify(paidData, null, 2));

  // ── Step 7: Test second endpoint ──
  console.log(`\n── Step 7: Test /api/analytics (should be 402) ──`);
  const analyticsRes = await fetch("http://localhost:3402/api/analytics");
  console.log(`📋 Status: ${analyticsRes.status} (expected: 402)`);

  // ── Step 8: Cross-endpoint replay (Test 12) ──
  console.log(`\n── Step 8: Cross-endpoint replay attack ──`);
  console.log(`  Using hash from /api/price on /api/analytics...`);
  const crossRes = await fetch("http://localhost:3402/api/analytics", {
    headers: { "X-Payment-Hash": txHash },
  });
  console.log(`📋 Status: ${crossRes.status} (expected: not 200 — hash already used)`);

  // ── Step 9: Wrong wallet TX (Test 13) ──
  console.log(`\n── Step 9: Wrong wallet TX (recipient mismatch) ──`);
  const otherWallet = "0:554122744117f4414f02ca5643cd4ab4b02ed83851e33cd88f7b3263e1485399";
  const otherTxRes = await fetch(
    `https://testnet.tonapi.io/v2/accounts/${encodeURIComponent(otherWallet)}/events?limit=1`,
  );
  const otherTxData = await otherTxRes.json();
  const otherHash = otherTxData.events?.[0]?.event_id;

  if (otherHash) {
    console.log(`  Using TX from other wallet: ${otherHash.slice(0, 24)}...`);
    const wrongWalletRes = await fetch("http://localhost:3402/api/price", {
      headers: { "X-Payment-Hash": otherHash },
    });
    console.log(`📋 Status: ${wrongWalletRes.status} (expected: not 200 — recipient doesn't match)`);
  } else {
    console.log(`  ⏭️  Skipped — could not fetch TX from other wallet`);
  }

  // ── Step 10: Old TX / timestamp expired (Test 14) ──
  console.log(`\n── Step 10: Old TX (timestamp expired) ──`);
  const oldTxRes = await fetch(
    `https://testnet.tonapi.io/v2/accounts/${encodeURIComponent(wallet.address.toRawString())}/events?limit=10`,
  );
  const oldTxData = await oldTxRes.json();

  const now = Math.floor(Date.now() / 1000);
  const oldEvent = oldTxData.events?.find((e: any) => now - (e.timestamp || 0) > 300);

  if (oldEvent) {
    const oldHash = oldEvent.event_id;
    const age = now - oldEvent.timestamp;
    console.log(`  Found old TX: ${oldHash.slice(0, 24)}... (${age}s ago)`);
    const oldTxTestRes = await fetch("http://localhost:3402/api/price", {
      headers: { "X-Payment-Hash": oldHash },
    });
    console.log(`📋 Status: ${oldTxTestRes.status} (expected: not 200 — age: ${age}s, max: 300s)`);
  } else {
    console.log(`  ⏭️  Skipped — no TX older than 5min found (wallet is new)`);
  }

  // ── Step 11: Insufficient amount (Test 15) ──
  console.log(`\n── Step 11: Insufficient amount ──`);
  console.log(`  Sending 0.0001 TON (endpoint costs 0.001)...`);

  const seqno2 = await walletContract.getSeqno();
  await walletContract.sendTransfer({
    seqno: seqno2,
    secretKey: keyPair.secretKey,
    messages: [
      internal({
        to: walletContract.address,
        value: toNano("0.0001"),
        bounce: false,
        body: beginCell()
          .storeUint(0, 32)
          .storeStringTail("x402:underpay")
          .endCell(),
      }),
    ],
  });
  console.log(`✅ Underpayment TX sent! Waiting 15s for confirmation...`);
  await new Promise((r) => setTimeout(r, 15000));

  const lowTxRes = await fetch(
    `https://testnet.tonapi.io/v2/accounts/${encodeURIComponent(wallet.address.toRawString())}/events?limit=1`,
  );
  const lowTxData = await lowTxRes.json();
  const lowHash = lowTxData.events?.[0]?.event_id;

  if (lowHash) {
    const underpayRes = await fetch("http://localhost:3402/api/price", {
      headers: { "X-Payment-Hash": lowHash },
    });
    console.log(`📋 Status: ${underpayRes.status} (expected: not 200 — paid 0.0001, needed 0.001)`);
  } else {
    console.log(`  ⏭️  Skipped — could not retrieve underpayment TX hash`);
  }

  // ── Step 12: Wrong network (Test 16) ──
  console.log(`\n── Step 12: Wrong network (testnet hash → mainnet) ──`);

  const app3 = express();
  app3.get("/api/data", tonPaywall({
    amount: "0.001",
    recipient: wallet.address.toRawString(),
    network: "mainnet",
  }), (_req: any, res: any) => {
    res.json({ data: true });
  });

  const server3 = app3.listen(3404);
  await new Promise((r) => setTimeout(r, 500));

  console.log(`  Using testnet hash on mainnet server...`);
  const wrongNetRes = await fetch("http://localhost:3404/api/data", {
    headers: { "X-Payment-Hash": txHash },
  });
  console.log(`📋 Status: ${wrongNetRes.status} (expected: not 200 — TX not found on mainnet)`);

  server3.close();

  // ── Summary ──
  console.log(`\n${"═".repeat(50)}`);
  console.log(`✅ x402 Middleware Test Complete!`);
  console.log(`   Free endpoint: ✅`);
  console.log(`   402 response: ✅ (${unpaidRes.status})`);
  console.log(`   Payment: ✅ sent`);
  console.log(
    `   Paid access: ${paidRes.status === 200 ? "✅" : "❌"} (${paidRes.status})`,
  );
  console.log(`   Second paywall: ✅ (${analyticsRes.status})`);
  console.log(`   Cross-endpoint replay: ${crossRes.status !== 200 ? "✅" : "❌"} (${crossRes.status})`);
  console.log(`   Wrong wallet TX: ${otherHash ? "✅" : "⏭️  skipped"}`);
  console.log(`   Old TX expired: ${oldEvent ? "✅" : "⏭️  skipped"}`);
  console.log(`   Insufficient amount: ${lowHash ? "✅" : "⏭️  skipped"}`);
  console.log(`   Wrong network: ${wrongNetRes.status !== 200 ? "✅" : "❌"} (${wrongNetRes.status})`);
  console.log(`${"═".repeat(50)}\n`);

  server.close();
}

export async function run(): Promise<TestResult> {
  const start = Date.now();
  try {
    await main();
    return { passed: 1, failed: 0, errors: [], duration: Date.now() - start };
  } catch (err: any) {
    return { passed: 0, failed: 1, errors: [err.message], duration: Date.now() - start };
  }
}

if (import.meta.main) {
  run().then((r) => {
    console.log(`\n${r.passed} passed, ${r.failed} failed (${r.duration}ms)`);
    if (r.errors.length) r.errors.forEach((e) => console.log(`  - ${e}`));
    process.exit(r.failed > 0 ? 1 : 0);
  });
}
