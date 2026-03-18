import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadEscrows, saveEscrows, autoReleaseOnContract, getLatestTxHash } from "../utils";

export const autoReleaseEscrowAction = defineAction({
  name: "auto_release_escrow",
  description:
    "Auto-release escrow funds to the beneficiary after the deadline has passed. Requires delivery confirmation from the buyer (confirm_delivery). Fails if delivery was never confirmed or if escrow is disputed.",
  schema: z.object({
    escrowId: z
      .string()
      .describe("Escrow ID to auto-release after deadline"),
  }),
  handler: async (agent, params) => {
    const escrows = loadEscrows();
    const escrow = escrows[params.escrowId];
    if (!escrow) throw new Error(`Escrow not found: ${params.escrowId}`);

    const contractAddress = Address.parse(escrow.contractAddress);

    await autoReleaseOnContract(agent, contractAddress);

    escrow.status = "auto-released";
    saveEscrows(escrows);

    const txHash = await getLatestTxHash(
      contractAddress.toRawString(),
      agent.network,
    );

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
          escrowOutcome: "auto-released",
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
          escrowOutcome: "auto-released",
          timestamp: Date.now(),
        }),
      });
    } catch {}

    return {
      released: true,
      escrowId: params.escrowId,
      contractAddress: escrow.contractAddress,
      friendlyContract: toFriendlyAddress(contractAddress, agent.network),
      beneficiary: escrow.beneficiary,
      autoReleaseTxHash: txHash,
      message: `Escrow ${params.escrowId} auto-released to beneficiary after deadline.`,
    };
  },
});
