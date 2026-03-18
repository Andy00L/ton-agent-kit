import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import {
  loadEscrows,
  saveEscrows,
  releaseContract,
  getLatestTxHash,
} from "../utils";

export const releaseEscrowAction = defineAction<{ escrowId: string }, any>({
  name: "release_escrow",
  description:
    "Release escrowed funds to the beneficiary via the on-chain Escrow contract. Only the depositor or arbiter can release.",
  schema: z.object({
    escrowId: z.string().describe("Escrow ID to release"),
  }) as any,
  handler: async (agent, params) => {
    const escrows = loadEscrows();
    const escrow = escrows[params.escrowId];
    if (!escrow) throw new Error(`Escrow not found: ${params.escrowId}`);
    if (escrow.status !== "funded")
      throw new Error(`Escrow is ${escrow.status}, must be funded`);

    const contractAddress = Address.parse(escrow.contractAddress);

    // Send Release message to the escrow contract
    await releaseContract(agent, contractAddress);

    // Wait for confirmation
    await new Promise((r) => setTimeout(r, 10000));

    const txHash = await getLatestTxHash(
      agent.wallet.address.toRawString(),
      agent.network,
    );

    // Update index
    escrow.status = "released";
    saveEscrows(escrows);

    // Save pending bidirectional ratings (non-critical)
    try {
      await (agent as any).runAction("save_context", {
        key: `pending_rating_${params.escrowId}_buyer`,
        namespace: "pending_ratings",
        value: JSON.stringify({
          escrowId: params.escrowId,
          raterRole: "buyer",
          targetAddress: escrow.beneficiary,
          suggestedSuccess: true,
          escrowOutcome: "released",
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
          suggestedSuccess: true,
          escrowOutcome: "released",
          timestamp: Date.now(),
        }),
      });
    } catch {}

    return {
      escrowId: params.escrowId,
      status: "released (on-chain)",
      contractAddress: escrow.contractAddress,
      friendlyContract: toFriendlyAddress(contractAddress, agent.network),
      amount: escrow.amount + " TON",
      beneficiary: escrow.beneficiary,
      friendlyBeneficiary: toFriendlyAddress(Address.parse(escrow.beneficiary), agent.network),
      releaseTxHash: txHash,
    };
  },
});
