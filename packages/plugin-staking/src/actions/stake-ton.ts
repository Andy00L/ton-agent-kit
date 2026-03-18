import { defineAction, sendTransaction } from "@ton-agent-kit/core";
import { Address, beginCell, internal, toNano } from "@ton/core";

import { z } from "zod";

export const stakeTonAction = defineAction({
  name: "stake_ton",
  description:
    "Stake TON with a validator pool. Sends TON to a staking pool contract.",
  schema: z.object({
    poolAddress: z.string().describe("Staking pool contract address"),
    amount: z.string().describe("Amount of TON to stake"),
  }),
  handler: async (agent, params) => {
    const poolAddr = Address.parse(params.poolAddress);

    // Staking deposit message: send TON with a deposit op code
    const depositBody = beginCell()
      .storeUint(0x47d54391, 32) // deposit op
      .storeUint(0, 64) // query_id
      .endCell();

    await sendTransaction(agent, [
      internal({
        to: poolAddr,
        value: toNano(params.amount),
        bounce: true,
        body: depositBody,
      }),
    ]);

    return {
      status: "sent",
      pool: params.poolAddress,
      amount: params.amount,
    };
  },
});
