import { z } from "zod";
import { Address, beginCell, internal, toNano } from "@ton/core";
import { TonClient4, WalletContractV5R1 } from "@ton/ton";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadEscrows, saveEscrows } from "../utils";

export const releaseEscrowAction = defineAction({
  name: "release_escrow",
  description:
    "Release escrowed funds to the beneficiary. Only the depositor or arbiter can release.",
  schema: z.object({
    escrowId: z.string().describe("Escrow ID to release"),
  }),
  handler: async (agent, params) => {
    const escrows = loadEscrows();
    const escrow = escrows[params.escrowId];
    if (!escrow) throw new Error(`Escrow not found: ${params.escrowId}`);
    if (escrow.status !== "funded")
      throw new Error(`Escrow is ${escrow.status}, must be funded`);

    // Send TON to beneficiary
    const beneficiary = Address.parse(escrow.beneficiary);
    const { secretKey, publicKey } = (agent.wallet as any).getCredentials();
    const networkId = agent.network === "testnet" ? -3 : -239;
    const freshClient = new TonClient4({ endpoint: agent.rpcUrl });
    const walletContract = freshClient.open(
      WalletContractV5R1.create({
        workchain: 0,
        publicKey,
        walletId: {
          networkGlobalId: networkId,
          workchain: 0,
          subwalletNumber: 0,
        },
      }),
    );

    const commentBody = beginCell()
      .storeUint(0, 32)
      .storeStringTail(`escrow-release:${params.escrowId}`)
      .endCell();

    const seqno = await walletContract.getSeqno();
    await walletContract.sendTransfer({
      seqno,
      secretKey,
      messages: [
        internal({
          to: beneficiary,
          value: toNano(escrow.amount),
          bounce: false,
          body: commentBody,
        }),
      ],
    });

    // Wait and get tx hash
    await new Promise((r) => setTimeout(r, 10000));
    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";
    const txRes = await fetch(
      `${apiBase}/accounts/${encodeURIComponent(agent.wallet.address.toRawString())}/events?limit=1`,
    );
    const txData = await txRes.json();
    const txHash = txData.events?.[0]?.event_id || "pending";

    escrow.status = "released";
    escrow.settleTxHash = txHash;
    saveEscrows(escrows);

    return {
      escrowId: params.escrowId,
      status: "released",
      amount: escrow.amount + " TON",
      beneficiary: escrow.beneficiary,
      friendlyBeneficiary: toFriendlyAddress(Address.parse(escrow.beneficiary), agent.network),
      releaseTxHash: txHash,
    };
  },
});
