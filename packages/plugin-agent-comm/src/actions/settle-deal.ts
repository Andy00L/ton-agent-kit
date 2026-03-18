import { z } from "zod";
import { Address, toNano, beginCell, internal } from "@ton/core";
import { defineAction, sendTransaction } from "@ton-agent-kit/core";
import { resolveContractAddress } from "../../../plugin-identity/src/reputation-config";
import { storeSettleDeal } from "../../../plugin-identity/src/contracts/Reputation_Reputation";

export const settleDealAction = defineAction({
  name: "settle_deal",
  description:
    "Settle a completed deal on-chain with a rating. This finalizes the intent and records a reputation rating for the service provider.",
  schema: z.object({
    intentIndex: z.number().describe("Index of the intent to settle"),
    rating: z.number().optional().describe("Rating for the service provider (0-100, default: 80)"),
  }),
  handler: async (agent, params) => {
    const contractAddr = resolveContractAddress(undefined, agent.network);
    if (!contractAddr) {
      return { message: "No reputation contract configured" };
    }

    const rating = params.rating !== undefined ? params.rating : 80;

    try {
      const body = beginCell()
        .store(
          storeSettleDeal({
            $$type: "SettleDeal",
            intentIndex: BigInt(params.intentIndex),
            rating: BigInt(rating),
          })
        )
        .endCell();

      await sendTransaction(agent, [
        internal({
          to: Address.parse(contractAddr),
          value: toNano("0.03"),
          bounce: true,
          body,
        }),
      ]);

      return {
        settled: true,
        intentIndex: params.intentIndex,
        rating,
        onChain: true,
        contractAddress: contractAddr,
      };
    } catch (err: any) {
      return {
        settled: false,
        intentIndex: params.intentIndex,
        error: err.message,
        message: `Failed to settle deal: ${err.message}`,
      };
    }
  },
});
