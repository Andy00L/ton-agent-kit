import { z } from "zod";
import { defineAction, sendTransaction } from "@ton-agent-kit/core";

export const yieldWithdrawAction = defineAction<
  { poolAddress: string; amount?: string },
  { status: string; poolAddress: string }
>({
  name: "yield_withdraw",
  description:
    "Withdraw tokens from a yield farming pool by burning LP tokens.",
  schema: z.object({
    poolAddress: z
      .string()
      .describe("Pool contract address to withdraw from"),
    amount: z
      .string()
      .optional()
      .describe("Amount to withdraw. Empty = withdraw all."),
  }),
  handler: async (agent, params) => {
    /**
     * @status PRIMITIVE — Schema validated, not tested on-chain.
     * @requires Pool address from get_yield_pools
     * @see https://docs.swap.coffee
     */
    const { Address, toNano, internal, beginCell } = await import(
      "@ton/core"
    );

    const poolAddr = Address.parse(params.poolAddress);

    // Fetch pool info
    const infoRes = await fetch(
      `https://backend.swap.coffee/v2/yield/pools/${encodeURIComponent(params.poolAddress)}`,
    );
    const poolInfo: any = infoRes.ok ? await infoRes.json() : {};

    // Build withdraw TX — burn LP tokens
    // Op code 0x595f07bc = burn (standard LP burn to withdraw liquidity)
    const amountNano = params.amount
      ? toNano(params.amount)
      : BigInt(0); // 0 = withdraw all

    const body = beginCell()
      .storeUint(0x595f07bc, 32) // burn op
      .storeUint(0, 64) // query_id
      .storeCoins(amountNano)
      .endCell();

    await sendTransaction(agent, [
      internal({
        to: poolAddr,
        value: toNano("0.5"), // gas
        bounce: true,
        body,
      }),
    ]);

    return {
      status: "withdrawn",
      poolAddress: params.poolAddress,
    };
  },
});
