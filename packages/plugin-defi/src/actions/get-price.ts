import { z } from "zod";
import { Address, toNano, fromNano } from "@ton/core";
import { defineAction } from "@ton-agent-kit/core";

export const getPriceAction = defineAction<
  { token: string; quoteToken?: string },
  { price: string; token: string; quoteToken: string; dex: string }
>({
  name: "get_price",
  description:
    "Get the current price of a token on TON DEXes. Returns the price in TON or a specified quote token.",
  schema: z.object({
    token: z.string().describe("Token to price: Jetton master address"),
    quoteToken: z.string().optional().default("TON").describe("Quote token (default: TON)"),
  }),
  handler: async (agent, params) => {
    const { Factory, MAINNET_FACTORY_ADDR, Asset, PoolType } = await import("@dedust/sdk");

    const factory = (agent.connection as any).open(
      Factory.createFromAddress(MAINNET_FACTORY_ADDR)
    );

    const tokenAsset = Asset.jetton(Address.parse(params.token));
    const quoteAsset =
      (params.quoteToken || "TON").toUpperCase() === "TON"
        ? Asset.native()
        : Asset.jetton(Address.parse(params.quoteToken!));

    const pool = (agent.connection as any).open(
      await factory.getPool(PoolType.VOLATILE, [tokenAsset, quoteAsset])
    );

    // Estimate: how much quoteToken do you get for 1 unit of token?
    const oneUnit = toNano("1");
    const { amountOut } = await pool.getEstimatedSwapOut({
      assetIn: tokenAsset,
      amountIn: oneUnit,
    });

    return {
      price: fromNano(amountOut),
      token: params.token,
      quoteToken: params.quoteToken || "TON",
      dex: "dedust",
    };
  },
});
