import { z } from "zod";
import { defineAction } from "@ton-agent-kit/core";

interface StakingPool {
  protocol: string;
  apr: number;
  tvl: number;
  minStake: string;
  address: string;
}

export const getStakingPoolsAction = defineAction<
  { sortBy?: "apr" | "tvl"; limit?: number },
  { pools: StakingPool[]; count: number }
>({
  name: "get_staking_pools",
  description:
    "List staking pools with APR from multiple protocols (TonStakers, Bemo, Hipo, etc.) via swap.coffee.",
  schema: z.object({
    sortBy: z
      .enum(["apr", "tvl"])
      .optional()
      .default("apr")
      .describe("Sort pools by APR or TVL"),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of pools to return"),
  }),
  handler: async (agent, params) => {
    /**
     * @status PRIMITIVE — Schema validated, not tested on-chain.
     * @requires No API key needed (public endpoint)
     * @see https://docs.swap.coffee
     */
    const sortBy = params.sortBy || "apr";
    const limit = params.limit || 10;

    const response = await fetch(
      "https://backend.swap.coffee/v2/staking/pools",
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`swap.coffee API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as any;
    let pools: StakingPool[] = (data.pools || data || []).map((p: any) => ({
      protocol: p.protocol || p.name || "unknown",
      apr: p.apr ?? p.apy ?? 0,
      tvl: p.tvl ?? 0,
      minStake: p.min_stake?.toString() || p.minStake?.toString() || "0",
      address: p.address || p.pool_address || "",
    }));

    // Sort
    pools.sort((a, b) =>
      sortBy === "apr" ? b.apr - a.apr : b.tvl - a.tvl,
    );

    pools = pools.slice(0, limit);

    return { pools, count: pools.length };
  },
  examples: [
    {
      input: { sortBy: "apr", limit: 3 },
      output: {
        pools: [
          {
            protocol: "TonStakers",
            apr: 5.2,
            tvl: 50000000,
            minStake: "1",
            address: "EQ...",
          },
        ],
        count: 1,
      },
      description: "Get top 3 staking pools sorted by APR",
    },
  ],
});
