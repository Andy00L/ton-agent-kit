import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadEscrows, saveEscrows, confirmDeliveryOnContract, getLatestTxHash } from "../utils";

export const confirmDeliveryAction = defineAction({
  name: "confirm_delivery",
  description:
    "Confirm that a service was delivered for an escrow deal. Only the depositor (buyer) can call this. Once confirmed, auto-release becomes available after the deadline. The x402TxHash serves as an audit trail linking the payment to the delivery.",
  schema: z.object({
    escrowId: z
      .string()
      .describe("Escrow ID to confirm delivery for"),
    x402TxHash: z
      .string()
      .optional()
      .describe("Optional x402 payment TX hash as proof of service delivery"),
  }),
  handler: async (agent, params) => {
    const escrows = loadEscrows();
    const escrow = escrows[params.escrowId];
    if (!escrow) {
      return {
        confirmed: false,
        message: `Escrow not found: ${params.escrowId}`,
      };
    }

    const contractAddress = Address.parse(escrow.contractAddress);

    try {
      await confirmDeliveryOnContract(agent, contractAddress, params.x402TxHash || "");

      escrow.status = "delivery-confirmed";
      saveEscrows(escrows);

      const txHash = await getLatestTxHash(
        contractAddress.toRawString(),
        agent.network,
      );

      return {
        confirmed: true,
        escrowId: params.escrowId,
        contractAddress: escrow.contractAddress,
        friendlyContract: toFriendlyAddress(contractAddress, agent.network),
        x402TxHash: params.x402TxHash || null,
        confirmTxHash: txHash,
        message: `Delivery confirmed on-chain for escrow ${params.escrowId}. Auto-release will be available after deadline.`,
      };
    } catch (err: any) {
      return {
        confirmed: false,
        escrowId: params.escrowId,
        error: err.message,
        message: `Failed to confirm delivery: ${err.message}`,
      };
    }
  },
});
