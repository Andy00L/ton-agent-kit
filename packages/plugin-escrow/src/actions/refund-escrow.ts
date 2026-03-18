import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import {
  loadEscrows,
  saveEscrows,
  refundContract,
  getLatestTxHash,
} from "../utils";

export const refundEscrowAction = defineAction<{ escrowId: string }, any>({
  name: "refund_escrow",
  description:
    "Refund escrowed funds back to the depositor via the on-chain Escrow contract. " +
    "Can refund if authorized (depositor/arbiter) or after deadline has passed.",
  schema: z.object({
    escrowId: z.string().describe("Escrow ID to refund"),
  }) as any,
  handler: async (agent, params) => {
    const escrows = loadEscrows();
    const escrow = escrows[params.escrowId];
    if (!escrow) throw new Error(`Escrow not found: ${params.escrowId}`);
    if (escrow.status !== "funded")
      throw new Error(`Escrow is ${escrow.status}, must be funded`);

    const contractAddress = Address.parse(escrow.contractAddress);

    // Send Refund message to the escrow contract
    // The contract itself enforces authorization (depositor/arbiter/past deadline)
    await refundContract(agent, contractAddress);

    // Wait for confirmation
    await new Promise((r) => setTimeout(r, 10000));

    const txHash = await getLatestTxHash(
      agent.wallet.address.toRawString(),
      agent.network,
    );

    const now = Math.floor(Date.now() / 1000);
    const pastDeadline = now > escrow.deadline;

    // Update index
    escrow.status = "refunded";
    saveEscrows(escrows);

    // Save pending bidirectional ratings (non-critical)
    // Refund = deal failed — negative ratings for both
    try {
      await (agent as any).runAction("save_context", {
        key: `pending_rating_${params.escrowId}_buyer`,
        namespace: "pending_ratings",
        value: JSON.stringify({
          escrowId: params.escrowId,
          raterRole: "buyer",
          targetAddress: escrow.beneficiary,
          suggestedSuccess: false,
          escrowOutcome: "refunded",
          timestamp: Date.now(),
        }),
      });
    } catch {}
    try {
      await (agent as any).runAction("save_context", {
        key: `pending_rating_${params.escrowId}_seller`,
        namespace: "pending_ratings",
        value: JSON.stringify({
          escrowId: params.escrowId,
          raterRole: "seller",
          targetAddress: escrow.depositor,
          suggestedSuccess: false,
          escrowOutcome: "refunded",
          timestamp: Date.now(),
        }),
      });
    } catch {}

    return {
      escrowId: params.escrowId,
      status: "refunded (on-chain)",
      contractAddress: escrow.contractAddress,
      friendlyContract: toFriendlyAddress(contractAddress, agent.network),
      amount: escrow.amount + " TON",
      depositor: escrow.depositor,
      friendlyDepositor: toFriendlyAddress(Address.parse(escrow.depositor), agent.network),
      reason: pastDeadline ? "Deadline passed" : "Authorized refund",
      refundTxHash: txHash,
    };
  },
});
