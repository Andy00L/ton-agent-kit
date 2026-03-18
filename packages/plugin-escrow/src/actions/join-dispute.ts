import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadEscrows, joinDisputeOnContract, getLatestTxHash } from "../utils";

export const joinDisputeAction = defineAction({
  name: "join_dispute",
  description:
    "Join an escrow dispute as an arbiter by staking TON. Self-selecting: any agent can join (except depositor/beneficiary). " +
    "A 2% fee is deducted from the stake. Winners get back their stake + share of losers' stakes. Losers forfeit.",
  schema: z.object({
    escrowId: z.string().describe("Escrow ID to join as arbiter"),
    stake: z.string().optional().describe("Stake amount in TON (sent to contract, 2% fee deducted). Default 0.5."),
  }),
  handler: async (agent, params) => {
    const escrows = loadEscrows();
    const escrow = escrows[params.escrowId];
    if (!escrow) {
      return { joined: false, message: `Escrow not found: ${params.escrowId}` };
    }

    const contractAddress = Address.parse(escrow.contractAddress);
    const stakeAmount = params.stake || escrow.minStake || "0.5";

    // Add 3% buffer to cover the 2% fee + gas
    const stakeNum = parseFloat(stakeAmount);
    const withBuffer = (stakeNum * 1.03).toFixed(9);

    try {
      await joinDisputeOnContract(agent, contractAddress, withBuffer);

      const txHash = await getLatestTxHash(
        agent.wallet.address.toRawString(),
        agent.network,
      );

      return {
        joined: true,
        escrowId: params.escrowId,
        contractAddress: escrow.contractAddress,
        friendlyContract: toFriendlyAddress(contractAddress, agent.network),
        arbiter: agent.wallet.address.toRawString(),
        stakeAmount: stakeAmount + " TON",
        stakeTxHash: txHash,
        message: `Joined dispute on escrow ${params.escrowId} with ${stakeAmount} TON stake. Vote with vote_release or vote_refund.`,
      };
    } catch (err: any) {
      return {
        joined: false,
        escrowId: params.escrowId,
        error: err.message,
        message: `Failed to join dispute: ${err.message}`,
      };
    }
  },
});
