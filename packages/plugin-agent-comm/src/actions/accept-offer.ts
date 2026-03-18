import { z } from "zod";
import { Address, toNano, beginCell, internal } from "@ton/core";
import { defineAction, sendTransaction } from "@ton-agent-kit/core";
import { resolveContractAddress } from "../../../plugin-identity/src/reputation-config";
import { storeAcceptOffer } from "../../../plugin-identity/src/contracts/Reputation_Reputation";

export const acceptOfferAction = defineAction({
  name: "accept_offer",
  description:
    "Accept an offer on-chain. This marks the offer as accepted in the reputation contract. Escrow creation is handled separately by the user or orchestration strategy.",
  schema: z.object({
    offerIndex: z.number().describe("Index of the offer to accept"),
  }),
  handler: async (agent, params) => {
    const contractAddr = resolveContractAddress(undefined, agent.network);
    if (!contractAddr) {
      return { message: "No reputation contract configured" };
    }

    try {
      const body = beginCell()
        .store(
          storeAcceptOffer({
            $$type: "AcceptOffer",
            offerIndex: BigInt(params.offerIndex),
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
        accepted: true,
        offerIndex: params.offerIndex,
        onChain: true,
        contractAddress: contractAddr,
      };
    } catch (err: any) {
      return {
        accepted: false,
        offerIndex: params.offerIndex,
        error: err.message,
        message: `Failed to accept offer: ${err.message}`,
      };
    }
  },
});
