import { z } from "zod";
import { defineAction } from "@ton-agent-kit/core";

export const createLimitOrderAction = defineAction<
  {
    fromToken: string;
    toToken: string;
    amount: string;
    minOutput: string;
    slippage?: number;
  },
  {
    orderId: string;
    status: string;
    fromToken: string;
    toToken: string;
    amount: string;
    minOutput: string;
    slippage: number;
  }
>({
  name: "create_limit_order",
  description:
    "Create a limit order. Executes a swap when minimum output is met. Requires SWAP_COFFEE_API_KEY.",
  schema: z.object({
    fromToken: z.string().describe("Source token symbol or address"),
    toToken: z.string().describe("Destination token symbol or address"),
    amount: z.string().describe("Amount to swap in source token units"),
    minOutput: z
      .string()
      .describe(
        "Minimum amount to receive (in nano-units). Order triggers when this output is achievable.",
      ),
    slippage: z
      .number()
      .optional()
      .default(1)
      .describe("Slippage tolerance in percent"),
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
      "https://backend.swap.coffee/v2/strategies/order",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          type: "limit",
          input_mint: params.fromToken,
          output_mint: params.toToken,
          amount: params.amount,
          min_output: params.minOutput,
          slippage: params.slippage ?? 1,
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`swap.coffee API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as any;

    // Sign and send TX if returned
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
      status: "pending",
      fromToken: params.fromToken,
      toToken: params.toToken,
      amount: params.amount,
      minOutput: params.minOutput,
      slippage: params.slippage ?? 1,
    };
  },
  examples: [
    {
      input: {
        fromToken: "TON",
        toToken: "USDT",
        amount: "50",
        minOutput: "200000000",
        slippage: 1,
      },
      output: {
        orderId: "lmt-456",
        status: "pending",
        fromToken: "TON",
        toToken: "USDT",
        amount: "50",
        minOutput: "200000000",
        slippage: 1,
      },
      description: "Create a limit order to swap 50 TON for at least 200 USDT",
    },
  ],
});
