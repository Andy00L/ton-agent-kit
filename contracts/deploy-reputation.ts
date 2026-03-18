/**
 * Deploy a Reputation contract to TON testnet.
 *
 * Usage:
 *   bun run contracts/deploy-reputation.ts
 *
 * Requires .env with TON_MNEMONIC, TON_NETWORK, TON_RPC_URL
 */
import "dotenv/config";
import { Address, internal, toNano, beginCell } from "@ton/core";
import { TonClient4, WalletContractV5R1 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { Reputation, storeDeploy } from "./output/Reputation_Reputation";

async function main() {
  const mnemonic = process.env.TON_MNEMONIC;
  if (!mnemonic) throw new Error("TON_MNEMONIC not set in .env");

  const rpcUrl = process.env.TON_RPC_URL || "https://testnet-v4.tonhubapi.com";
  const network = (process.env.TON_NETWORK || "testnet") as "testnet" | "mainnet";
  const networkId = network === "testnet" ? -3 : -239;

  // Derive keypair
  const keyPair = await mnemonicToPrivateKey(mnemonic.split(" "));

  // Open wallet
  const client = new TonClient4({ endpoint: rpcUrl });
  const walletContract = client.open(
    WalletContractV5R1.create({
      workchain: 0,
      publicKey: keyPair.publicKey,
      walletId: {
        networkGlobalId: networkId,
        workchain: 0,
        subwalletNumber: 0,
      },
    }),
  );

  const walletAddress = walletContract.address;
  console.log("Wallet address:", walletAddress.toString({ testOnly: network === "testnet", bounceable: false }));

  // Create reputation contract with wallet as owner
  const reputation = await Reputation.fromInit(walletAddress);

  console.log("Reputation contract address:", reputation.address.toString({ testOnly: network === "testnet", bounceable: false }));

  // Deploy
  const deployBody = beginCell()
    .store(storeDeploy({ $$type: "Deploy", queryId: 0n }))
    .endCell();

  const seqno = await walletContract.getSeqno();
  await walletContract.sendTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    messages: [
      internal({
        to: reputation.address,
        value: toNano("0.15"),
        bounce: false,
        init: reputation.init!,
        body: deployBody,
      }),
    ],
  });

  console.log("Deploy transaction sent! Waiting for confirmation...");
  await new Promise((r) => setTimeout(r, 15000));

  // Verify deployment
  try {
    const opened = client.open(Reputation.fromAddress(reputation.address));
    const count = await opened.getAgentCount();
    const balance = await opened.getContractBalance();
    console.log("\nReputation contract deployed successfully!");
    console.log("Agent count:", count.toString());
    console.log("Balance:", balance.toString());
  } catch (e: any) {
    console.log("Contract may not be active yet. Address:", reputation.address.toString({ testOnly: network === "testnet", bounceable: false }));
    console.log("Check on explorer in a few seconds.");
  }

  console.log("\nREPUTATION_CONTRACT_ADDRESS=" + reputation.address.toRawString());
}

main().catch(console.error);
