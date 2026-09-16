/**
 * Deploy an Escrow contract to TON.
 *
 * Usage:
 *   bun contracts/deploy-escrow.ts
 *
 * Requires .env with TON_MNEMONIC, and optionally TON_NETWORK, TON_RPC_URL and
 * REPUTATION_CONTRACT_ADDRESS.
 *
 * This script was covered by no tsconfig until 2026-09-16 and had drifted seven
 * type errors out of date: it built the wallet id with workchain at the wrong
 * nesting level (the defect core fixed in 1.1.0), sent a transfer with no send
 * mode (likewise), called Escrow.fromInit with the four arguments of a contract
 * version that had a single arbiter, and read a field the struct no longer has.
 * None of that could be caught, because nothing typechecked the file.
 */
import "dotenv/config";
import { Address, beginCell, internal, toNano } from "@ton/core";
import { TonClient4 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import {
  createWalletContract,
  describeError,
  sendFromWalletContract,
  sleep,
  type WalletConfig,
} from "@ton-agent-kit/core";
// The bindings live with the package that publishes them. An identical copy
// used to sit in contracts/output and both were committed, so a Tact rebuild
// could update one and leave the other in place.
import { Escrow, storeDeploy } from "../packages/plugin-escrow/src/contracts/Escrow_Escrow";

/** How long the deal stays open, in seconds. */
const DEADLINE_HORIZON_SECONDS = 3600;

/** Arbiters that must join before a dispute vote can be counted. */
const MIN_ARBITERS = 3n;

/** Smallest stake an arbiter may join with, in TON. */
const MIN_ARBITER_STAKE = "0.5";

/** Value attached to the deploy message, in TON. */
const DEPLOY_VALUE = "0.05";

/** How long to wait before reading the contract back, in milliseconds. */
const CONFIRMATION_WAIT_MS = 15_000;

async function main(): Promise<void> {
  const mnemonic = process.env.TON_MNEMONIC;
  if (!mnemonic) throw new Error("[deployEscrow] TON_MNEMONIC not set in .env");

  const rpcUrl = process.env.TON_RPC_URL || "https://testnet-v4.tonhubapi.com";
  const network = (process.env.TON_NETWORK || "testnet") === "mainnet" ? "mainnet" : "testnet";
  const walletConfig: WalletConfig = { version: "V5R1", network, workchain: 0 };

  const keyPair = await mnemonicToPrivateKey(mnemonic.split(" "));
  const client = new TonClient4({ endpoint: rpcUrl });
  const walletAddress = createWalletContract(keyPair.publicKey, walletConfig).address;

  const friendly = { testOnly: network === "testnet", bounceable: false };
  console.log("[deployEscrow] wallet address:", walletAddress.toString(friendly));

  // Without a reputation contract the escrow cannot notify anyone of a dispute,
  // so it is named explicitly rather than silently falling back to the wallet.
  const reputationAddress = process.env.REPUTATION_CONTRACT_ADDRESS;
  if (!reputationAddress) {
    throw new Error(
      "[deployEscrow] REPUTATION_CONTRACT_ADDRESS not set. Deploy the reputation contract first with contracts/deploy-reputation.ts.",
    );
  }

  // Both sides are this wallet: the point is to get a contract on chain to
  // read, not to run a real deal.
  const deadline = BigInt(Math.floor(Date.now() / 1000) + DEADLINE_HORIZON_SECONDS);
  const escrow = await Escrow.fromInit(
    walletAddress,
    walletAddress,
    deadline,
    MIN_ARBITERS,
    toNano(MIN_ARBITER_STAKE),
    Address.parse(reputationAddress),
    false,
    0n,
    0n,
  );

  console.log("[deployEscrow] escrow address:", escrow.address.toString(friendly));

  const deployBody = beginCell().store(storeDeploy({ $$type: "Deploy", queryId: 0n })).endCell();
  const stateInit = escrow.init;
  if (!stateInit) throw new Error("[deployEscrow] the generated wrapper produced no state init");

  await sendFromWalletContract({
    client,
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
    config: walletConfig,
    messages: [
      internal({
        to: escrow.address,
        value: toNano(DEPLOY_VALUE),
        bounce: false,
        init: stateInit,
        body: deployBody,
      }),
    ],
  });

  console.log("[deployEscrow] deploy sent, waiting for the contract to become active");
  await sleep(CONFIRMATION_WAIT_MS);

  try {
    const deployed = client.open(Escrow.fromAddress(escrow.address));
    const data = await deployed.getEscrowData();
    console.log("[deployEscrow] on-chain state:", {
      depositor: data.depositor.toString(),
      beneficiary: data.beneficiary.toString(),
      reputationContract: data.reputationContract.toString(),
      amount: data.amount.toString(),
      deadline: data.deadline.toString(),
      minArbiters: data.minArbiters.toString(),
      arbiterCount: data.arbiterCount.toString(),
      released: data.released,
      refunded: data.refunded,
    });
  } catch (caught: unknown) {
    console.log(
      `[deployEscrow] the contract is not readable yet (${describeError(caught)}). Check the explorer in a few seconds.`,
    );
  }

  console.log("[deployEscrow] ESCROW_CONTRACT_ADDRESS=" + escrow.address.toRawString());
}

main().catch((caught: unknown) => {
  console.error("[deployEscrow] failed:", describeError(caught));
  process.exitCode = 1;
});
