import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadEscrows, saveEscrows, fallbackSettleOnContract, getLatestTxHash } from "../utils";

export const fallbackSettleAction = defineAction({
  name: "fallback_settle",
  description:
    "Settle a disputed escrow after the 72h voting deadline. If not enough arbiters joined or votes are tied, " +
    "settles based on delivery status. Anyone can call after votingDeadline.",
  schema: z.object({
    escrowId: z.string().describe("Escrow ID to settle after voting timeout"),
  }),
  handler: async (agent, params) => {
    const escrows = loadEscrows();
    const escrow = escrows[params.escrowId];
    if (!escrow) {
      return { settled: false, message: `Escrow not found: ${params.escrowId}` };
    }

    const contractAddress = Address.parse(escrow.contractAddress);

    try {
      await fallbackSettleOnContract(agent, contractAddress);

      escrow.status = "fallback-settled";
      saveEscrows(escrows);

      const txHash = await getLatestTxHash(
        contractAddress.toRawString(),
        agent.network,
      );

      return {
        settled: true,
        escrowId: params.escrowId,
        contractAddress: escrow.contractAddress,
        friendlyContract: toFriendlyAddress(contractAddress, agent.network),
        settleTxHash: txHash,
        message: `Escrow ${params.escrowId} settled via fallback after voting deadline.`,
      };
    } catch (err: any) {
      return {
        settled: false,
        escrowId: params.escrowId,
        error: err.message,
        message: `Fallback settle failed: ${err.message}`,
      };
    }
  },
});
