import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadEscrows, saveEscrows } from "../utils";

export const refundEscrowAction = defineAction({
  name: "refund_escrow",
  description:
    "Refund escrowed funds back to the depositor. Can refund if authorized or after deadline.",
  schema: z.object({
    escrowId: z.string().describe("Escrow ID to refund"),
  }),
  handler: async (agent, params) => {
    const escrows = loadEscrows();
    const escrow = escrows[params.escrowId];
    if (!escrow) throw new Error(`Escrow not found: ${params.escrowId}`);
    if (escrow.status !== "funded")
      throw new Error(`Escrow is ${escrow.status}, must be funded`);

    // Check deadline for auto-refund
    const now = Math.floor(Date.now() / 1000);
    const isDepositor =
      agent.wallet.address.toRawString() === escrow.depositor;
    const isArbiter = agent.wallet.address.toRawString() === escrow.arbiter;
    const pastDeadline = now > escrow.deadline;

    if (!isDepositor && !isArbiter && !pastDeadline) {
      throw new Error(
        "Not authorized: only depositor/arbiter can refund before deadline",
      );
    }

    // Refund is just keeping the TON (since deposit was a self-transfer)
    escrow.status = "refunded";
    escrow.settleTxHash = "self-refund";
    saveEscrows(escrows);

    return {
      escrowId: params.escrowId,
      status: "refunded",
      amount: escrow.amount + " TON",
      depositor: escrow.depositor,
      friendlyDepositor: toFriendlyAddress(Address.parse(escrow.depositor), agent.network),
      reason: pastDeadline ? "Deadline passed" : "Authorized refund",
    };
  },
});
