import { z } from "zod";
import { Address, internal, toNano, beginCell } from "@ton/core";
import { defineAction, sendTransaction } from "@ton-agent-kit/core";
import { resolveContractAddress } from "../reputation-config";
import { storeTriggerCleanup } from "../contracts/Reputation_Reputation";

export const triggerCleanupAction = defineAction({
  name: "trigger_cleanup",
  description:
    "Manually trigger cleanup of inactive, ghost, or low-score agents from the reputation contract. " +
    "Cleanup also runs automatically on every registration and rating. " +
    "Conditions: score<20 with 100+ ratings, inactive 30+ days, ghost (0 ratings after 7 days).",
  schema: z.object({
    maxClean: z.coerce.number().optional().describe("Max agents to clean. Default 10, max 50."),
  }),
  handler: async (agent, params) => {
    const addr = resolveContractAddress(undefined, agent.network);
    if (!addr) {
      return { triggered: false, message: "No reputation contract configured" };
    }

    const maxClean = Math.min(params.maxClean || 10, 50);
    const body = beginCell()
      .store(storeTriggerCleanup({ $$type: "TriggerCleanup", maxClean: BigInt(maxClean) }))
      .endCell();

    await sendTransaction(agent, [
      internal({
        to: Address.parse(addr),
        value: toNano("0.03"),
        bounce: true,
        body,
      }),
    ]);

    return {
      triggered: true,
      maxClean,
      contractAddress: addr,
      message: `Cleanup triggered for up to ${maxClean} agents.`,
    };
  },
});
