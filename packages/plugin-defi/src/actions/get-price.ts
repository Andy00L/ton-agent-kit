import { z } from "zod";
import { defineAction } from "@ton-agent-kit/core";

export const getPriceAction = defineAction<
  { token: string },
  { priceUSD: string; priceTON: string; token: string }
>({
  name: "get_price",
  description:
    "Get the current price of a token on TON. Returns the price in USD and TON using TONAPI rates.",
  schema: z.object({
    token: z.string().describe("Token to price: Jetton master address"),
  }),
  handler: async (agent, params) => {
    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";

    const headers: Record<string, string> = {};
    if (agent.config.TONAPI_KEY) {
      headers["Authorization"] = `Bearer ${agent.config.TONAPI_KEY}`;
    }

    try {
      const response = await fetch(
        `${apiBase}/rates?tokens=${encodeURIComponent(params.token)}&currencies=usd,ton`,
        { headers },
      );

      if (!response.ok) {
        return { priceUSD: "unknown", priceTON: "unknown", token: params.token };
      }

      const data = (await response.json()) as any;
      const rates = data.rates?.[params.token]?.prices;

      if (!rates) {
        return { priceUSD: "unknown", priceTON: "unknown", token: params.token };
      }

      return {
        priceUSD: rates.USD?.toString() || "unknown",
        priceTON: rates.TON?.toString() || "unknown",
        token: params.token,
      };
    } catch {
      return { priceUSD: "unknown", priceTON: "unknown", token: params.token };
    }
  },
});
