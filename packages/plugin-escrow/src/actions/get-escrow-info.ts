import { z } from "zod";
import { Address, fromNano } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadEscrows, getContractState } from "../utils";

export const getEscrowInfoAction = defineAction<{ escrowId?: string }, any>({
  name: "get_escrow_info",
  description:
    "Get escrow details. Reads on-chain contract state if available. " +
    "If escrowId is provided, returns that escrow. If no escrowId, lists ALL escrows.",
  schema: z.object({
    escrowId: z
      .string()
      .optional()
      .describe("Escrow ID. If not provided, lists all escrows."),
  }) as any,
  handler: async (agent, params) => {
    const escrows = loadEscrows();

    if (params.escrowId) {
      const escrow = escrows[params.escrowId];
      if (!escrow) throw new Error(`Escrow not found: ${params.escrowId}`);

      // Try to read on-chain state
      try {
        const contractAddress = Address.parse(escrow.contractAddress);
        const onChain = await getContractState(agent, contractAddress);

        return {
          id: escrow.id,
          contractAddress: escrow.contractAddress,
          friendlyContract: toFriendlyAddress(Address.parse(escrow.contractAddress), agent.network),
          description: escrow.description,
          createdAt: escrow.createdAt,
          onChain: {
            depositor: toFriendlyAddress(onChain.depositor, agent.network),
            beneficiary: toFriendlyAddress(onChain.beneficiary, agent.network),
            reputationContract: toFriendlyAddress(onChain.reputationContract, agent.network),
            amount: fromNano(onChain.amount) + " TON",
            balance: fromNano(onChain.balance) + " TON",
            deadline: new Date(Number(onChain.deadline) * 1000).toISOString(),
            released: onChain.released,
            refunded: onChain.refunded,
            deliveryConfirmed: onChain.deliveryConfirmed,
            disputed: onChain.disputed,
            votingDeadline: onChain.votingDeadline ? new Date(Number(onChain.votingDeadline) * 1000).toISOString() : null,
            arbiterCount: Number(onChain.arbiterCount),
            votesRelease: Number(onChain.votesRelease),
            votesRefund: Number(onChain.votesRefund),
            minArbiters: Number(onChain.minArbiters),
            minStake: fromNano(onChain.minStake) + " TON",
            sellerStake: fromNano(onChain.sellerStake) + " TON",
            sellerStaked: onChain.sellerStaked,
            requireSellerStake: onChain.requireSellerStake,
            baseSellerStake: fromNano(onChain.baseSellerStake) + " TON",
            requireRepCollateral: onChain.requireRepCollateral,
            minRepScore: Number(onChain.minRepScore),
            autoReleaseAvailable: onChain.autoReleaseAvailable,
            refundAvailable: onChain.refundAvailable,
            status: onChain.released
              ? "released"
              : onChain.refunded
                ? "refunded"
                : onChain.disputed
                  ? "disputed"
                  : onChain.amount > BigInt(0)
                    ? "funded"
                    : "created",
          },
        };
      } catch (e: any) {
        // Contract not yet active or network error — fall back to index
        return {
          ...escrow,
          onChainError: e.message || "Could not read contract state (may not be deployed yet)",
        };
      }
    }

    // List all escrows from index
    const list = Object.values(escrows);
    return {
      count: list.length,
      escrows: list.map((e) => ({
        id: e.id,
        status: e.status,
        contractAddress: e.contractAddress || null,
        friendlyContract: e.contractAddress
          ? toFriendlyAddress(Address.parse(e.contractAddress), agent.network)
          : null,
        amount: e.amount + " TON",
        beneficiary: e.beneficiary,
        friendlyBeneficiary: e.beneficiary
          ? toFriendlyAddress(Address.parse(e.beneficiary), agent.network)
          : null,
        deadline: e.deadlineISO,
        description: e.description,
      })),
    };
  },
});
