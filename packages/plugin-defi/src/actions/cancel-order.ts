import { z } from "zod";
import { defineAction } from "@ton-agent-kit/core";

export const cancelOrderAction = defineAction<
  { orderId: string },
  { orderId: string; status: string }
>({
  name: "cancel_order",
  description:
    "Cancel an active DCA or limit order. Requires SWAP_COFFEE_API_KEY.",
  schema: z.object({
    orderId: z.string().describe("The order ID to cancel"),
  }),
  handler: async (agent, params) => {
    /**
     * @status PRIMITIVE — Schema validated, not tested on-chain.
     * @requires SWAP_COFFEE_API_KEY in agent config or env
     * @see https://docs.swap.coffee
     */
    const apiKey =
      agent.config?.swapCoffeeKey || process.env.SWAP_COFFEE_API_KEY;
    if (!apiKey) {
      return {
        error: "SWAP_COFFEE_API_KEY not configured",
        hint: "Set SWAP_COFFEE_API_KEY in your .env or pass swapCoffeeKey in agent config",
      } as any;
    }

    const response = await fetch(
      `https://backend.swap.coffee/v2/strategies/order/${encodeURIComponent(params.orderId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`swap.coffee API error ${response.status}: ${text}`);
    }

    return {
      orderId: params.orderId,
      status: "cancelled",
    };
  },
});
