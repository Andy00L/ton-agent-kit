import { z } from "zod";
import { Address, fromNano } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadEscrows, sellerStakeOnContract, getContractState, getLatestTxHash } from "../utils";

export const sellerStakeAction = defineAction({
  name: "seller_stake_escrow",
  description:
    "Seller (beneficiary) deposits their stake into an escrow that requires reputation collateral. " +
    "Must be called before buyer deposits. Stake amount can be adjusted by reputation: " +
    "score 90-100 = 50% of base, 60-89 = 100%, 30-59 = 150%, below minRepScore = blocked.",
  schema: z.object({
    escrowId: z.string().optional().describe("Escrow ID"),
    contractAddress: z.string().optional().describe("Contract address (alternative to escrowId)"),
    stakeAmount: z.string().optional().describe("Stake amount in TON. If not provided, uses baseSellerStake from escrow."),
  }),
  handler: async (agent, params) => {
    const escrows = loadEscrows();
    let escrow: any;
    if (params.escrowId) {
      escrow = escrows[params.escrowId];
    } else if (params.contractAddress) {
      escrow = Object.values(escrows).find((e: any) => e.contractAddress === params.contractAddress);
    }
    if (!escrow) {
      return { staked: false, message: "Escrow not found" };
    }

    const contractAddress = Address.parse(escrow.contractAddress);

    // Read on-chain state to check requirements
    try {
      const state = await getContractState(agent, contractAddress);

      if (!state.requireSellerStake) {
        return { staked: false, message: "This escrow does not require seller stake" };
      }
      if (state.sellerStaked) {
        return { staked: false, message: "Seller has already staked" };
      }

      const stakeAmount = params.stakeAmount || fromNano(state.baseSellerStake);

      await sellerStakeOnContract(agent, contractAddress, stakeAmount);

      const txHash = await getLatestTxHash(
        agent.wallet.address.toRawString(),
        agent.network,
      );

      return {
        staked: true,
        amount: stakeAmount + " TON",
        escrowId: escrow.id,
        contractAddress: escrow.contractAddress,
        friendlyContract: toFriendlyAddress(contractAddress, agent.network),
        stakeTxHash: txHash,
        message: `Seller staked ${stakeAmount} TON. Buyer can now deposit.`,
      };
    } catch (err: any) {
      return {
        staked: false,
        escrowId: escrow.id,
        error: err.message,
        message: `Failed to stake: ${err.message}`,
      };
    }
  },
});
