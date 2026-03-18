import { z } from "zod";
import { Address, toNano, beginCell, internal } from "@ton/core";
import { defineAction, sendTransaction } from "@ton-agent-kit/core";
import { resolveContractAddress } from "../../../plugin-identity/src/reputation-config";
import { storeCancelIntent } from "../../../plugin-identity/src/contracts/Reputation_Reputation";

export const cancelIntentAction = defineAction({
  name: "cancel_intent",
  description:
    "Cancel an open intent on-chain. Only the original buyer (intent creator) can cancel their own intent.",
  schema: z.object({
    intentIndex: z.number().describe("Index of the intent to cancel"),
  }),
  handler: async (agent, params) => {
    const contractAddr = resolveContractAddress(undefined, agent.network);
    if (!contractAddr) {
      return { message: "No reputation contract configured" };
    }

    try {
      const body = beginCell()
        .store(
          storeCancelIntent({
            $$type: "CancelIntent",
            intentIndex: BigInt(params.intentIndex),
          })
        )
        .endCell();

      await sendTransaction(agent, [
        internal({
          to: Address.parse(contractAddr),
          value: toNano("0.12"),
          bounce: true,
          body,
        }),
      ]);

      return {
        cancelled: true,
        intentIndex: params.intentIndex,
        onChain: true,
        contractAddress: contractAddr,
      };
    } catch (err: any) {
      return {
        cancelled: false,
        intentIndex: params.intentIndex,
        error: err.message,
        message: `Failed to cancel intent: ${err.message}`,
      };
    }
  },
});
