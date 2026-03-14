/**
 * Deploy a test Escrow contract to TON testnet.
 *
 * Usage:
 *   npx ts-node contracts/deploy-escrow.ts
 *
 * Requires .env with TON_MNEMONIC, TON_NETWORK, TON_RPC_URL
 */
import "dotenv/config";
import { Address, internal, toNano } from "@ton/core";
import { TonClient4, WalletContractV5R1 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { Escrow, storeDeploy } from "./output/Escrow_Escrow";
import { beginCell } from "@ton/core";

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

  // Create a test escrow: depositor = wallet, beneficiary = wallet, arbiter = wallet
  // Deadline = 1 hour from now
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const escrow = await Escrow.fromInit(walletAddress, walletAddress, walletAddress, deadline);

  console.log("Escrow contract address:", escrow.address.toString({ testOnly: network === "testnet", bounceable: false }));

  // Deploy message body
  const deployBody = beginCell().store(storeDeploy({ $$type: "Deploy", queryId: 0n })).endCell();

  const seqno = await walletContract.getSeqno();
  await walletContract.sendTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    messages: [
      internal({
        to: escrow.address,
        value: toNano("0.05"),
        bounce: false,
        init: escrow.init!,
        body: deployBody,
      }),
    ],
  });

  console.log("Deploy transaction sent! Waiting for confirmation...");
  await new Promise((r) => setTimeout(r, 15000));

  // Verify deployment
  try {
    const opened = client.open(Escrow.fromAddress(escrow.address));
    const data = await opened.getEscrowData();
    console.log("\nEscrow deployed successfully!");
    console.log("On-chain state:", {
      depositor: data.depositor.toString(),
      beneficiary: data.beneficiary.toString(),
      arbiter: data.arbiter.toString(),
      amount: data.amount.toString(),
      deadline: data.deadline.toString(),
      released: data.released,
      refunded: data.refunded,
    });
  } catch (e: any) {
    console.log("Contract may not be active yet. Address:", escrow.address.toString({ testOnly: network === "testnet", bounceable: false }));
    console.log("Check on explorer in a few seconds.");
  }

  console.log("\nESCROW_CONTRACT_ADDRESS=" + escrow.address.toRawString());
}

main().catch(console.error);
