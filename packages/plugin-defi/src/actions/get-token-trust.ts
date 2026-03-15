import { z } from "zod";
import { defineAction } from "@ton-agent-kit/core";

export const getTokenTrustAction = defineAction<
  { token: string },
  {
    token: string;
    symbol: string;
    trustScore: number;
    assessment: string;
    holders: number;
    marketCap: number;
    flags: string[];
  }
>({
  name: "get_token_trust",
  description:
    "Get token trust score and analytics from DYOR.io. Detects scams, honeypots, and low-trust tokens. Requires DYOR_API_KEY in agent config.",
  schema: z.object({
    token: z.string().describe("Token address or symbol"),
  }),
  handler: async (agent, params) => {
    /**
     * @status PRIMITIVE — Schema validated, not tested on-chain.
     * @requires DYOR_API_KEY in agent config or env
     * @see https://dyor.io
     */
    const apiKey = agent.config?.dyorKey || process.env.DYOR_API_KEY;
    if (!apiKey) {
      return {
        error: "DYOR_API_KEY not configured",
        hint: "Set DYOR_API_KEY in your .env or pass dyorKey in agent config",
      } as any;
    }

    const response = await fetch(
      `https://api.dyor.io/v1/token/${encodeURIComponent(params.token)}`,
      {
        headers: {
          "X-API-Key": apiKey,
        },
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DYOR.io API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as any;

    const trustScore: number = data.trust_score ?? data.trustScore ?? 0;
    let assessment: string;
    if (trustScore >= 70) assessment = "HIGH";
    else if (trustScore >= 40) assessment = "MEDIUM";
    else assessment = "LOW";

    return {
      token: params.token,
      symbol: data.symbol || data.ticker || "unknown",
      trustScore,
      assessment,
      holders: data.holders ?? data.holder_count ?? 0,
      marketCap: data.market_cap ?? data.marketCap ?? 0,
      flags: data.flags || data.warnings || [],
    };
  },
  examples: [
    {
      input: { token: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs" },
      output: {
        token: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
        symbol: "USDT",
        trustScore: 95,
        assessment: "HIGH",
        holders: 500000,
        marketCap: 100000000,
        flags: [],
      },
      description: "Check trust score for USDT token",
    },
  ],
});
