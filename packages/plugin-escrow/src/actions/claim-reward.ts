import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadEscrows, claimRewardOnContract, getLatestTxHash } from "../utils";

export const claimRewardAction = defineAction({
  name: "claim_reward",
  description:
    "Claim arbiter reward after an escrow dispute is settled. Winners get back their stake + share of losers' stakes. Losers forfeit their stake.",
  schema: z.object({
    escrowId: z.string().describe("Escrow ID to claim arbiter reward from"),
  }),
  handler: async (agent, params) => {
    const escrows = loadEscrows();
    const escrow = escrows[params.escrowId];
    if (!escrow) {
      return { claimed: false, message: `Escrow not found: ${params.escrowId}` };
    }

    const contractAddress = Address.parse(escrow.contractAddress);

    try {
      await claimRewardOnContract(agent, contractAddress);

      const txHash = await getLatestTxHash(
        agent.wallet.address.toRawString(),
        agent.network,
      );

      return {
        claimed: true,
        escrowId: params.escrowId,
        contractAddress: escrow.contractAddress,
        friendlyContract: toFriendlyAddress(contractAddress, agent.network),
        arbiter: agent.wallet.address.toRawString(),
        claimTxHash: txHash,
        message: `Claim submitted for escrow ${params.escrowId}. If you voted with the majority, reward is sent to your wallet.`,
      };
    } catch (err: any) {
      return {
        claimed: false,
        escrowId: params.escrowId,
        error: err.message,
        message: `Failed to claim reward: ${err.message}`,
      };
    }
  },
});
