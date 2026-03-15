import { z } from "zod";
import { defineAction } from "@ton-agent-kit/core";

export const createDcaOrderAction = defineAction<
  {
    fromToken: string;
    toToken: string;
    totalAmount: string;
    intervalSeconds: number;
    invocations: number;
  },
  {
    orderId: string;
    status: string;
    fromToken: string;
    toToken: string;
    totalAmount: string;
    intervalSeconds: number;
    invocations: number;
    perSwapAmount: string;
  }
>({
  name: "create_dca_order",
  description:
    "Create a Dollar Cost Averaging order. Automatically executes periodic swaps via swap.coffee Strategies API. Requires SWAP_COFFEE_API_KEY in agent config.",
  schema: z.object({
    fromToken: z
      .string()
      .describe("Source token symbol or address (e.g. TON)"),
    toToken: z
      .string()
      .describe("Target token symbol or address (e.g. USDT)"),
    totalAmount: z
      .string()
      .describe("Total amount to spend across all invocations"),
    intervalSeconds: z
      .number()
      .describe("Seconds between each swap (e.g. 3600 for hourly)"),
    invocations: z.number().describe("Number of swaps to execute"),
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

    const { toNano } = await import("@ton/core");
    const amountNano = toNano(params.totalAmount).toString();
    const perSwapAmount = (
      parseFloat(params.totalAmount) / params.invocations
    ).toString();

    const response = await fetch(
      "https://backend.swap.coffee/v2/strategies/order",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          type: "dca",
          input_mint: params.fromToken,
          output_mint: params.toToken,
          amount: amountNano,
          delay: params.intervalSeconds,
          invocations: params.invocations,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`swap.coffee API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as any;

    // If the API returns a transaction to sign, send it
    if (data.transaction) {
      const { Address, internal } = await import("@ton/core");
      const { sendTransaction } = await import("@ton-agent-kit/core");
      await sendTransaction(agent, [
        internal({
          to: Address.parse(data.transaction.to),
          value: BigInt(data.transaction.value),
          bounce: true,
          body: data.transaction.body,
        }),
      ]);
    }

    return {
      orderId: data.order_id || data.id || "pending",
      status: "created",
      fromToken: params.fromToken,
      toToken: params.toToken,
      totalAmount: params.totalAmount,
      intervalSeconds: params.intervalSeconds,
      invocations: params.invocations,
      perSwapAmount,
    };
  },
  examples: [
    {
      input: {
        fromToken: "TON",
        toToken: "USDT",
        totalAmount: "100",
        intervalSeconds: 3600,
        invocations: 10,
      },
      output: {
        orderId: "abc123",
        status: "created",
        fromToken: "TON",
        toToken: "USDT",
        totalAmount: "100",
        intervalSeconds: 3600,
        invocations: 10,
        perSwapAmount: "10",
      },
      description: "Create a DCA order to swap 100 TON into USDT over 10 hourly swaps",
    },
  ],
});
