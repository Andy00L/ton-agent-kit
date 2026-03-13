import { mnemonicNew, mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV4 } from "@ton/ton";

async function main() {
  const mnemonic = await mnemonicNew(24);
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
  });

  console.log("=== TON TESTNET WALLET ===");
  console.log("Mnemonic:", mnemonic.join(" "));
  console.log("Address:", wallet.address.toString({ testOnly: true }));
  console.log("\nSave the mnemonic in your .env file!");
  console.log("Then send testnet TON to the address above.");
}

main();
