import {
  Omniston,
  SettlementMethod,
  Blockchain,
  GaslessSettlement,
} from "@ston-fi/omniston-sdk";

const omniston = new Omniston({ apiUrl: "wss://omni-ws.ston.fi" });

console.log("Connecting to Omniston production...");
console.log("Requesting quotes for 1 TON → USDT...\n");

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
    },
  });

setTimeout(() => {
  console.log("\n⏱️ Timeout — closing connection");
  sub.unsubscribe();
  process.exit(0);
}, 8000);
