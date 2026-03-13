import { z } from "zod";
import { Address, toNano } from "@ton/core";
import { defineAction, type SwapResult } from "@ton-agent-kit/core";

// DeDust SDK imports (will be available after npm install)
// import { Factory, MAINNET_FACTORY_ADDR, Asset, PoolType, VaultNative } from "@dedust/sdk";

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
    slippage: z.number().optional().default(1).describe("Slippage tolerance in percent (default: 1)"),
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

    // Apply slippage
    const minAmountOut = (amountOut * BigInt(100 - (params.slippage || 1))) / 100n;

    // Execute swap
    if (params.fromToken.toUpperCase() === "TON") {
      // Native TON swap
      const tonVault = (agent.connection as any).open(
        await factory.getNativeVault()
      );
      const sender = agent.wallet.getSender();
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
      const sender = agent.wallet.getSender();
      // Build jetton transfer to vault with swap payload
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
