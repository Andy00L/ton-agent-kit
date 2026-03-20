// tests/25-omniston.ts — Wrapped from test-omniston.ts
/**
 * Omniston SDK Demo (no counters)
 * Connects to Omniston production websocket and requests quotes.
 */

import {
  Omniston,
  SettlementMethod,
  Blockchain,
  GaslessSettlement,
} from "@ston-fi/omniston-sdk";

export interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
  duration: number;
}

async function main() {
  const omniston = new Omniston({ apiUrl: "wss://omni-ws.ston.fi" });

  console.log("Connecting to Omniston production...");
  console.log("Requesting quotes for 1 TON → USDT...\n");

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      sub.unsubscribe();
      resolve();
    }, 8000);

    const sub = omniston
      .requestForQuote({
        settlementMethods: [SettlementMethod.SETTLEMENT_METHOD_SWAP],
        bidAssetAddress: {
          blockchain: Blockchain.TON,
          address: "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c",
        },
        askAssetAddress: {
          blockchain: Blockchain.TON,
          address: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
        },
        amount: {
          bidUnits: "1000000000",
        },
        settlementParams: {
          maxPriceSlippageBps: 100,
          maxOutgoingMessages: 4,
          gaslessSettlement: GaslessSettlement.GASLESS_SETTLEMENT_POSSIBLE,
        },
      })
      .subscribe({
        next: (event) => {
          switch (event.type) {
            case "ack":
              console.log(`✅ Quote request acknowledged: ${event.rfqId}`);
              break;
            case "quoteUpdated":
              const q = event.quote;
              const askAmount = (Number(q.askUnits) / 1e6).toFixed(4);
              console.log(
                `💰 ${q.resolverName}: ${askAmount} USDT (quote: ${q.quoteId.slice(0, 8)}...)`,
              );
              break;
            case "noQuote":
              console.log("❌ No quotes available for this pair");
              break;
            case "unsubscribed":
              console.log("🔌 Unsubscribed");
              break;
          }
        },
        error: (err) => {
          console.error("❌ WebSocket error:", err.message || err);
          clearTimeout(timeout);
          reject(err);
        },
      });
  });

  console.log("\n⏱️ Timeout — connection closed");
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
