import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadEscrows, saveEscrows, openDisputeOnContract, getLatestTxHash } from "../utils";

export const openDisputeAction = defineAction({
  name: "open_dispute",
  description:
    "Open a dispute on an escrow deal. Freezes the escrow so only arbiter voting (or single-arbiter decision) can settle it. Only the depositor or beneficiary can open a dispute.",
  schema: z.object({
    escrowId: z.string().describe("Escrow ID to open a dispute on"),
  }),
  handler: async (agent, params) => {
    const escrows = loadEscrows();
    const escrow = escrows[params.escrowId];
    if (!escrow) {
      return { disputed: false, message: `Escrow not found: ${params.escrowId}` };
    }

    const contractAddress = Address.parse(escrow.contractAddress);

    try {
      await openDisputeOnContract(agent, contractAddress);

      escrow.status = "disputed";
      saveEscrows(escrows);

      const txHash = await getLatestTxHash(
        agent.wallet.address.toRawString(),
        agent.network,
      );

      return {
        disputed: true,
        escrowId: params.escrowId,
        contractAddress: escrow.contractAddress,
        friendlyContract: toFriendlyAddress(contractAddress, agent.network),
        arbiterCount: escrow.arbiterCount || 1,
        arbiters: escrow.arbiters || [escrow.arbiter],
        disputeTxHash: txHash,
        message: `Dispute opened on escrow ${params.escrowId}. ${
          (escrow.arbiterCount || 1) > 1
            ? `Waiting for ${Math.floor((escrow.arbiterCount || 1) / 2) + 1}/${escrow.arbiterCount} arbiter votes.`
            : "Single arbiter can now release or refund."
        }`,
      };
    } catch (err: any) {
      return {
        disputed: false,
        escrowId: params.escrowId,
        error: err.message,
        message: `Failed to open dispute: ${err.message}`,
      };
    }
  },
});
