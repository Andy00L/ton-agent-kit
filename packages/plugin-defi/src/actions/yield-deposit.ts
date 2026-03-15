import { z } from "zod";
import { defineAction, sendTransaction } from "@ton-agent-kit/core";

export const yieldDepositAction = defineAction<
  { poolAddress: string; amount: string },
  { status: string; poolAddress: string; amount: string; protocol: string }
>({
  name: "yield_deposit",
  description:
    "Deposit tokens into a yield farming pool. Requires pool address from get_yield_pools.",
  schema: z.object({
    poolAddress: z
      .string()
      .describe("Pool contract address (from get_yield_pools)"),
    amount: z.string().describe("Amount to deposit in token units"),
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
    const amountNano = toNano(params.amount);

    // Fetch pool info to determine protocol
    const infoRes = await fetch(
      `https://backend.swap.coffee/v2/yield/pools/${encodeURIComponent(params.poolAddress)}`,
    );
    const poolInfo: any = infoRes.ok ? await infoRes.json() : {};
    const protocol: string =
      poolInfo.protocol || poolInfo.dex || "unknown";

    // Build deposit TX — generic LP deposit message
    // Op code 0x3ebe5431 = provide_liquidity (common across STON.fi / DeDust pools)
    const body = beginCell()
      .storeUint(0x3ebe5431, 32) // provide_liquidity op
      .storeUint(0, 64) // query_id
      .storeCoins(amountNano)
      .endCell();

    await sendTransaction(agent, [
      internal({
        to: poolAddr,
        value: amountNano + toNano("0.5"), // amount + gas
        bounce: true,
        body,
      }),
    ]);

    return {
      status: "deposited",
      poolAddress: params.poolAddress,
      amount: params.amount,
      protocol,
    };
  },
});
