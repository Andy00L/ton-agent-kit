import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadEscrows, saveEscrows, voteRefundOnContract, getLatestTxHash } from "../utils";

export const voteRefundAction = defineAction({
  name: "vote_refund",
  description:
    "Vote to refund escrow funds to the depositor during a multi-arbiter dispute. Must be called by a registered arbiter. When majority is reached, funds are automatically refunded.",
  schema: z.object({
    escrowId: z.string().describe("Escrow ID to vote refund on"),
  }),
  handler: async (agent, params) => {
    const escrows = loadEscrows();
    const escrow = escrows[params.escrowId];
    if (!escrow) {
      return { voted: false, message: `Escrow not found: ${params.escrowId}` };
    }

    const contractAddress = Address.parse(escrow.contractAddress);

    try {
      await voteRefundOnContract(agent, contractAddress);

      const txHash = await getLatestTxHash(
        agent.wallet.address.toRawString(),
        agent.network,
      );

      return {
        voted: true,
        vote: "refund",
        escrowId: params.escrowId,
        contractAddress: escrow.contractAddress,
        friendlyContract: toFriendlyAddress(contractAddress, agent.network),
        voter: agent.wallet.address.toRawString(),
        voteTxHash: txHash,
        message: `Voted to refund escrow ${params.escrowId}. Contract will auto-execute when majority is reached.`,
      };
    } catch (err: any) {
      return {
        voted: false,
        vote: "refund",
        escrowId: params.escrowId,
        error: err.message,
        message: `Vote failed: ${err.message}`,
      };
    }
  },
});
