import { z } from "zod";
import { defineAction } from "@ton-agent-kit/core";

interface YieldPool {
  protocol: string;
  pair: string;
  apr: number;
  tvl: number;
  address: string;
  riskLevel: string;
}

export const getYieldPoolsAction = defineAction<
  {
    sortBy?: "apr" | "tvl" | "volume";
    protocol?: string;
    minApr?: number;
    limit?: number;
  },
  { pools: YieldPool[]; count: number }
>({
  name: "get_yield_pools",
  description:
    "List yield farming / liquidity pools sorted by APR, TVL, or volume. Aggregates 2000+ pools from 16 protocols via swap.coffee.",
  schema: z.object({
    sortBy: z
      .enum(["apr", "tvl", "volume"])
      .optional()
      .default("apr")
      .describe("Sort pools by this metric"),
    protocol: z
      .string()
      .optional()
      .describe(
        "Filter by protocol name (e.g. stonfi, dedust, tonco, evaa)",
      ),
    minApr: z.number().optional().describe("Minimum APR filter"),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe("Maximum number of pools to return"),
  }),
  handler: async (agent, params) => {
    /**
     * @status PRIMITIVE — Schema validated, not tested on-chain.
     * @requires SWAP_COFFEE_API_KEY in agent config or env
     * @see https://docs.swap.coffee
     */
    const sortBy = params.sortBy || "apr";
    const limit = params.limit || 10;

    const url = `https://backend.swap.coffee/v2/yield/pools?sort=${sortBy}&limit=${limit * 5}`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`swap.coffee API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as any;
    let pools: YieldPool[] = (data.pools || data || []).map((p: any) => ({
      protocol: p.protocol || p.dex || "unknown",
      pair: p.pair || p.name || `${p.token0_symbol}/${p.token1_symbol}`,
      apr: p.apr ?? p.apy ?? 0,
      tvl: p.tvl ?? 0,
      address: p.address || p.pool_address || "",
      riskLevel: p.risk_level || p.risk || "unknown",
    }));

    // Client-side filters
    if (params.protocol) {
      const proto = params.protocol.toLowerCase();
      pools = pools.filter((p) => p.protocol.toLowerCase().includes(proto));
    }
    if (params.minApr !== undefined) {
      pools = pools.filter((p) => p.apr >= params.minApr!);
    }

    pools = pools.slice(0, limit);

    return { pools, count: pools.length };
  },
  examples: [
    {
      input: { sortBy: "apr", limit: 5 },
      output: {
        pools: [
          {
            protocol: "stonfi",
            pair: "TON/USDT",
            apr: 42.5,
            tvl: 1500000,
            address: "EQ...",
            riskLevel: "low",
          },
        ],
        count: 1,
      },
      description: "Get top 5 yield pools sorted by APR",
    },
  ],
});
