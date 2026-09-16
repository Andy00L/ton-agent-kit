import { z } from "zod";
import { Address, toNano, internal } from "@ton/core";
import { defineAction, type SwapResult, sendTransaction } from "@ton-agent-kit/core";

/** One hundred percent expressed in basis points. */
const BASIS_POINTS = 10_000n;

/** Slippage applied when the caller names none, in percent. */
const DEFAULT_SLIPPAGE_PERCENT = 1;

export const swapDedustAction = defineAction<
  { fromToken: string; toToken: string; amount: string; slippage?: number },
  SwapResult
>({
  name: "swap_dedust",
  description:
    "Swap tokens on DeDust DEX. Specify source token, destination token, and amount. Supports TON and any Jetton. Slippage defaults to 1%.",
  schema: z.object({
    fromToken: z.string().describe("Source token: 'TON' or Jetton master address"),
    toToken: z.string().describe("Destination token: 'TON' or Jetton master address"),
    amount: z.string().describe("Amount to swap in source token units (e.g., '10')"),
    slippage: z
      .number()
      .min(0)
      .max(100)
      .optional()
      .default(DEFAULT_SLIPPAGE_PERCENT)
      .describe("Slippage tolerance in percent, 0 to 100 (default: 1). Fractions are accepted."),
  }),
  handler: async (agent, params) => {
    // Dynamic import for DeDust SDK
    const { Factory, MAINNET_FACTORY_ADDR, Asset, PoolType, VaultNative, VaultJetton } =
      await import("@dedust/sdk");

    const factory = (agent.connection as any).open(
      Factory.createFromAddress(MAINNET_FACTORY_ADDR)
    );

    // Determine assets
    const fromAsset =
      params.fromToken.toUpperCase() === "TON"
        ? Asset.native()
        : Asset.jetton(Address.parse(params.fromToken));

    const toAsset =
      params.toToken.toUpperCase() === "TON"
        ? Asset.native()
        : Asset.jetton(Address.parse(params.toToken));

    // Find pool
    const pool = (agent.connection as any).open(
      await factory.getPool(PoolType.VOLATILE, [fromAsset, toAsset])
    );

    // Check pool exists
    const poolState = await pool.getReadinessStatus();
    if (poolState !== "ready") {
      throw new Error(`Pool not found or not ready for ${params.fromToken}/${params.toToken}`);
    }

    // Get estimated output
    const amountIn = toNano(params.amount);
    const { amountOut } = await pool.getEstimatedSwapOut({
      assetIn: fromAsset,
      amountIn,
    });

    // Slippage is a percentage and may be fractional, so the arithmetic runs in
    // basis points. BigInt(100 - 0.5) throws: a bigint cannot be built from a
    // non-integer, which made every fractional slippage a RangeError. The
    // nullish default also keeps an explicit 0 from being read as "unset".
    const slippagePercent = params.slippage ?? DEFAULT_SLIPPAGE_PERCENT;
    const slippageBps = BigInt(Math.round(slippagePercent * 100));
    const minAmountOut = (amountOut * (BASIS_POINTS - slippageBps)) / BASIS_POINTS;

    // Build a sender shim compatible with DeDust SDK
    const sender = {
      address: agent.wallet.address,
      async send(args: { to: Address; value: bigint; body?: any }) {
        await sendTransaction(agent, [
          internal({ to: args.to, value: args.value, bounce: true, body: args.body }),
        ]);
      },
    };

    // Execute swap
    if (params.fromToken.toUpperCase() === "TON") {
      // Native TON swap
      const tonVault = (agent.connection as any).open(
        await factory.getNativeVault()
      );
      await tonVault.sendSwap(sender, {
        poolAddress: pool.address,
        amount: amountIn,
        limit: minAmountOut,
      });
    } else {
      // Jetton swap — send Jettons to the Jetton vault
      const jettonVault = (agent.connection as any).open(
        await factory.getJettonVault(Address.parse(params.fromToken))
      );
      await jettonVault.sendSwap(sender, {
        poolAddress: pool.address,
        amount: amountIn,
        limit: minAmountOut,
      });
    }

    const { fromNano } = await import("@ton/core");

    return {
      txHash: "pending",
      status: "sent",
      fromAmount: params.amount,
      fromToken: params.fromToken,
      toAmount: fromNano(amountOut),
      toToken: params.toToken,
      dex: "dedust",
      fee: "~0.3 TON",
    };
  },
  examples: [
    {
      input: { fromToken: "TON", toToken: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs", amount: "10" },
      output: {
        txHash: "abc", status: "sent",
        fromAmount: "10", fromToken: "TON",
        toAmount: "38.5", toToken: "USDT",
        dex: "dedust", fee: "~0.3 TON",
      },
      description: "Swap 10 TON for USDT on DeDust",
    },
  ],
});
