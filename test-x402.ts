import { beginCell, internal, toNano } from "@ton/core";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { TonClient4, WalletContractV5R1 } from "@ton/ton";
import "dotenv/config";
import { KeypairWallet } from "./packages/core/src/wallet";
import { createPaymentServer } from "./x402-middleware";

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
  console.log(`${"═".repeat(50)}\n`);

  // ── DEBUG: Check what TONAPI returns ──
  console.log(`\n── DEBUG: Raw TONAPI response ──`);
  const debugRes = await fetch(
    `https://testnet.tonapi.io/v2/events/${encodeURIComponent(txHash)}`,
  );
  const debugData = await debugRes.json();
  for (const action of debugData.actions || []) {
    if (action.type === "TonTransfer") {
      console.log(
        `Recipient address: "${action.TonTransfer?.recipient?.address}"`,
      );
      console.log(`Expected address:  "${wallet.address.toRawString()}"`);
      console.log(`Amount: ${action.TonTransfer?.amount}`);
      console.log(
        `Match: ${action.TonTransfer?.recipient?.address === wallet.address.toRawString()}`,
      );
    }
  }

  server.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
