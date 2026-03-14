import { z } from "zod";
import { Address, beginCell, internal, toNano } from "@ton/core";
import { TonClient4, WalletContractV5R1 } from "@ton/ton";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadEscrows, saveEscrows } from "../utils";

export const depositToEscrowAction = defineAction({
  name: "deposit_to_escrow",
  description:
    "Deposit TON into an escrow deal. Sends TON to a holding address and marks the escrow as funded.",
  schema: z.object({
    escrowId: z.string().describe("Escrow ID from create_escrow"),
  }),
  handler: async (agent, params) => {
    const escrows = loadEscrows();
    const escrow = escrows[params.escrowId];
    if (!escrow) throw new Error(`Escrow not found: ${params.escrowId}`);
    if (escrow.status !== "created")
      throw new Error(`Escrow already ${escrow.status}`);

    // Send TON to ourselves (holding) with escrow ID as comment
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
      .storeStringTail(`escrow:${params.escrowId}`)
      .endCell();

    const seqno = await walletContract.getSeqno();
    await walletContract.sendTransfer({
      seqno,
      secretKey,
      messages: [
        internal({
          to: walletContract.address,
          value: toNano(escrow.amount),
          bounce: false,
          body: commentBody,
        }),
      ],
    });

    // Wait for confirmation
    await new Promise((r) => setTimeout(r, 10000));

    // Get tx hash
    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";
    const txRes = await fetch(
      `${apiBase}/accounts/${encodeURIComponent(agent.wallet.address.toRawString())}/events?limit=1`,
    );
    const txData = await txRes.json();
    const txHash = txData.events?.[0]?.event_id || "pending";

    // Update escrow
    escrow.status = "funded";
    escrow.depositTxHash = txHash;
    saveEscrows(escrows);

    return {
      escrowId: params.escrowId,
      status: "funded",
      amount: escrow.amount + " TON",
      depositTxHash: txHash,
      beneficiary: escrow.beneficiary,
      friendlyBeneficiary: toFriendlyAddress(Address.parse(escrow.beneficiary), agent.network),
      deadline: escrow.deadlineISO,
    };
  },
});
