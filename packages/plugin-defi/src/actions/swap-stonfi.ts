import { z } from "zod";
import { Address, toNano, fromNano } from "@ton/core";
import { defineAction, type SwapResult } from "@ton-agent-kit/core";

export const swapStonfiAction = defineAction<
  { fromToken: string; toToken: string; amount: string; slippage?: number },
  SwapResult
>({
  name: "swap_stonfi",
  description:
    "Swap tokens on STON.fi DEX. Specify source token, destination token, and amount. Alternative to DeDust with different liquidity pools.",
  schema: z.object({
    fromToken: z.string().describe("Source token: 'TON' or Jetton master address"),
    toToken: z.string().describe("Destination token: 'TON' or Jetton master address"),
    amount: z.string().describe("Amount to swap in source token units"),
    slippage: z.number().optional().default(1).describe("Slippage tolerance in percent (default: 1)"),
  }),
  handler: async (agent, params) => {
    const { DEX, pTON } = await import("@ston-fi/sdk");

    const router = (agent.connection as any).open(new DEX.v1.Router());
    const sender = agent.wallet.getSender();

    const amountIn = toNano(params.amount);

    if (params.fromToken.toUpperCase() === "TON") {
      // Swap TON -> Jetton
      const txParams = await router.getSwapTonToJettonTxParams({
        userWalletAddress: agent.wallet.address,
        proxyTon: new pTON.v1(),
        offerAmount: amountIn,
        askJettonAddress: Address.parse(params.toToken),
        minAskAmount: toNano("0"), // Will be refined with slippage
      });

      await sender.send({
        to: txParams.to,
        value: txParams.value,
        body: txParams.body,
      });
    } else if (params.toToken.toUpperCase() === "TON") {
      // Swap Jetton -> TON
      const txParams = await router.getSwapJettonToTonTxParams({
        userWalletAddress: agent.wallet.address,
        proxyTon: new pTON.v1(),
        offerJettonAddress: Address.parse(params.fromToken),
        offerAmount: amountIn,
        minAskAmount: toNano("0"),
      });

      await sender.send({
        to: txParams.to,
        value: txParams.value,
        body: txParams.body,
      });
    } else {
      // Swap Jetton -> Jetton
      const txParams = await router.getSwapJettonToJettonTxParams({
        userWalletAddress: agent.wallet.address,
        offerJettonAddress: Address.parse(params.fromToken),
        offerAmount: amountIn,
        askJettonAddress: Address.parse(params.toToken),
        minAskAmount: toNano("0"),
      });

      await sender.send({
        to: txParams.to,
        value: txParams.value,
        body: txParams.body,
      });
    }

    return {
      txHash: "pending",
      status: "sent",
      fromAmount: params.amount,
      fromToken: params.fromToken,
      toAmount: "estimated",
      toToken: params.toToken,
      dex: "stonfi",
      fee: "~0.3 TON",
    };
  },
});
