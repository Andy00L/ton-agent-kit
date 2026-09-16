/**
 * Deploy the Reputation contract to TON.
 *
 * Usage:
 *   bun contracts/deploy-reputation.ts
 *
 * Requires .env with TON_MNEMONIC, and optionally TON_NETWORK and TON_RPC_URL.
 * The deploying wallet becomes the contract owner, which is the only address
 * that can withdraw fees or register an escrow.
 *
 * This script was covered by no tsconfig until 2026-09-16 and had drifted out
 * of date: it built the wallet id with workchain at the wrong nesting level
 * (the defect core fixed in 1.1.0) and sent a transfer with no send mode
 * (likewise). Neither could be caught, because nothing typechecked the file.
 */
import "dotenv/config";
import { beginCell, internal, toNano } from "@ton/core";
import { TonClient4 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import {
  createWalletContract,
  describeError,
  sendFromWalletContract,
  sleep,
  type WalletConfig,
} from "@ton-agent-kit/core";
// The bindings live with the package that publishes them. See deploy-escrow.ts.
import { Reputation, storeDeploy } from "../packages/plugin-identity/src/contracts/Reputation_Reputation";

/** Value attached to the deploy message, in TON. */
const DEPLOY_VALUE = "0.15";

/** How long to wait before reading the contract back, in milliseconds. */
const CONFIRMATION_WAIT_MS = 15_000;

async function main(): Promise<void> {
  const mnemonic = process.env.TON_MNEMONIC;
  if (!mnemonic) throw new Error("[deployReputation] TON_MNEMONIC not set in .env");

  const rpcUrl = process.env.TON_RPC_URL || "https://testnet-v4.tonhubapi.com";
  const network = (process.env.TON_NETWORK || "testnet") === "mainnet" ? "mainnet" : "testnet";
  const walletConfig: WalletConfig = { version: "V5R1", network, workchain: 0 };

  const keyPair = await mnemonicToPrivateKey(mnemonic.split(" "));
  const client = new TonClient4({ endpoint: rpcUrl });
  const walletAddress = createWalletContract(keyPair.publicKey, walletConfig).address;

  const friendly = { testOnly: network === "testnet", bounceable: false };
  console.log("[deployReputation] wallet address, and contract owner:", walletAddress.toString(friendly));

  const reputation = await Reputation.fromInit(walletAddress);
  console.log("[deployReputation] contract address:", reputation.address.toString(friendly));

  const deployBody = beginCell().store(storeDeploy({ $$type: "Deploy", queryId: 0n })).endCell();
  const stateInit = reputation.init;
  if (!stateInit) throw new Error("[deployReputation] the generated wrapper produced no state init");

  await sendFromWalletContract({
    client,
    publicKey: keyPair.publicKey,
    secretKey: keyPair.secretKey,
    config: walletConfig,
    messages: [
      internal({
        to: reputation.address,
        value: toNano(DEPLOY_VALUE),
        bounce: false,
        init: stateInit,
        body: deployBody,
      }),
    ],
  });

  console.log("[deployReputation] deploy sent, waiting for the contract to become active");
  await sleep(CONFIRMATION_WAIT_MS);

  try {
    const deployed = client.open(Reputation.fromAddress(reputation.address));
    const [agentCount, balance] = await Promise.all([
      deployed.getAgentCount(),
      deployed.getContractBalance(),
    ]);
    console.log("[deployReputation] on-chain state:", {
      agentCount: agentCount.toString(),
      balance: balance.toString(),
    });
  } catch (caught: unknown) {
    console.log(
      `[deployReputation] the contract is not readable yet (${describeError(caught)}). Check the explorer in a few seconds.`,
    );
  }

  console.log("[deployReputation] REPUTATION_CONTRACT_ADDRESS=" + reputation.address.toRawString());
}

main().catch((caught: unknown) => {
  console.error("[deployReputation] failed:", describeError(caught));
  process.exitCode = 1;
});
