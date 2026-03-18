import { z } from "zod";
import { Address, beginCell, internal, toNano } from "@ton/core";

import { defineAction, sendTransaction } from "@ton-agent-kit/core";

export const unstakeTonAction = defineAction({
  name: "unstake_ton",
  description:
    "Unstake TON from a validator pool. Initiates withdrawal from a staking pool.",
  schema: z.object({
    poolAddress: z.string().describe("Staking pool contract address"),
  }),
  handler: async (agent, params) => {
    const poolAddr = Address.parse(params.poolAddress);

    // Withdraw op
    const withdrawBody = beginCell()
      .storeUint(0x47d54392, 32) // withdraw op
      .storeUint(0, 64) // query_id
      .endCell();

    await sendTransaction(agent, [
      internal({
        to: poolAddr,
        value: toNano("0.1"),
        bounce: true,
        body: withdrawBody,
      }),
    ]);

    return { status: "sent", pool: params.poolAddress, action: "unstake" };
  },
});
