import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadEscrows } from "../utils";

export const getEscrowInfoAction = defineAction({
  name: "get_escrow_info",
  description:
    "Get escrow details. If escrowId is provided, returns that escrow. If no escrowId, lists ALL escrows.",
  schema: z.object({
    escrowId: z
      .string()
      .optional()
      .describe("Escrow ID. If not provided, lists all escrows."),
  }),
  handler: async (agent, params) => {
    const escrows = loadEscrows();

    if (params.escrowId) {
      const escrow = escrows[params.escrowId];
      if (!escrow) throw new Error(`Escrow not found: ${params.escrowId}`);
      return escrow;
    }

    // List all escrows
    const list = Object.values(escrows);
    return {
      count: list.length,
      escrows: list.map((e: any) => ({
        id: e.id,
        status: e.status,
        amount: e.amount + " TON",
        beneficiary: e.beneficiary,
        friendlyBeneficiary: toFriendlyAddress(Address.parse(e.beneficiary), agent.network),
        deadline: e.deadlineISO,
        description: e.description,
      })),
    };
  },
});
