import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadEscrows, saveEscrows, voteReleaseOnContract, getLatestTxHash } from "../utils";

export const voteReleaseAction = defineAction({
  name: "vote_release",
  description:
    "Vote to release escrow funds to the beneficiary during a multi-arbiter dispute. Must be called by a registered arbiter. When majority is reached, funds are automatically released.",
  schema: z.object({
    escrowId: z.string().describe("Escrow ID to vote release on"),
  }),
  handler: async (agent, params) => {
    const escrows = loadEscrows();
    const escrow = escrows[params.escrowId];
    if (!escrow) {
      return { voted: false, message: `Escrow not found: ${params.escrowId}` };
    }

    const contractAddress = Address.parse(escrow.contractAddress);

    try {
      await voteReleaseOnContract(agent, contractAddress);

      const txHash = await getLatestTxHash(
        agent.wallet.address.toRawString(),
        agent.network,
      );

      return {
        voted: true,
        vote: "release",
        escrowId: params.escrowId,
        contractAddress: escrow.contractAddress,
        friendlyContract: toFriendlyAddress(contractAddress, agent.network),
        voter: agent.wallet.address.toRawString(),
        voteTxHash: txHash,
        message: `Voted to release escrow ${params.escrowId}. Contract will auto-execute when majority is reached.`,
      };
    } catch (err: any) {
      return {
        voted: false,
        vote: "release",
        escrowId: params.escrowId,
        error: err.message,
        message: `Vote failed: ${err.message}`,
      };
    }
  },
});
