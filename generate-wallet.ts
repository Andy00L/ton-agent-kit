import { KeypairWallet } from "./packages/core/src/wallet";

async function main() {
  // --- Single wallet ---
  console.log("=== SINGLE WALLET (V5R1, testnet) ===\n");
  const [single] = await KeypairWallet.generateMultiple(1, { network: "testnet" });
  console.log("Address:", single.wallet.address.toString({ testOnly: true, bounceable: false }));
  console.log("Mnemonic:", single.mnemonic.join(" "));

  // --- Multiple wallets ---
  console.log("\n=== 3 WALLETS (V5R1, testnet) ===\n");
  const wallets = await KeypairWallet.generateMultiple(3, { network: "testnet" });
  for (let i = 0; i < wallets.length; i++) {
    const { wallet, mnemonic } = wallets[i];
    console.log(`Wallet ${i + 1}:`);
    console.log("  Address:", wallet.address.toString({ testOnly: true, bounceable: false }));
    console.log("  Mnemonic:", mnemonic.join(" "));
  }

  console.log("\nSave the mnemonics in your .env file!");
  console.log("Then send testnet TON to the addresses above.");
}

main();
