import { z } from "zod";
import { Address, toNano, internal } from "@ton/core";
import {
  defineAction,
  fetchJettonMetadata,
  sendTransaction,
  toBaseUnits,
  tonapiBase,
} from "@ton-agent-kit/core";

/** Decimals of the native coin. TON has no jetton master to read. */
const NATIVE_TON_DECIMALS = 9;

export const swapStonfiAction = defineAction({
  name: "swap_stonfi",
  description:
    "Swap tokens on STON.fi DEX. Requires minReceived, the smallest acceptable output, because this action does not quote the pool first. Use swap_best_price instead when you want a quote and a percentage slippage.",
  schema: z.object({
    fromToken: z.string().describe("Source token: 'TON' or Jetton master address"),
    toToken: z.string().describe("Destination token: 'TON' or Jetton master address"),
    amount: z.string().describe("Amount to swap in source token units"),
    minReceived: z
      .string()
      .describe(
        "Smallest acceptable output, in the destination token's own units, as a plain decimal string. The swap reverts below it.",
      ),
  }),
  handler: async (agent, params) => {
    // Every branch below used to pass minAskAmount: toNano("0"), so the router
    // accepted any output including zero, while the action advertised a
    // slippage parameter nothing read. Without a pool quote the only honest
    // floor is one the caller states, so minReceived is required and converted
    // in the destination token's own decimals.
    const destinationIsNative = params.toToken.toUpperCase() === "TON";
    let destinationDecimals = NATIVE_TON_DECIMALS;
    if (!destinationIsNative) {
      const metadata = await fetchJettonMetadata(
        tonapiBase(agent.network),
        params.toToken,
        agent.config.TONAPI_KEY,
      );
      if (!metadata.ok) {
        return { sent: false, reason: metadata.reason };
      }
      destinationDecimals = metadata.value.decimals;
    }

    const minAskAmount = toBaseUnits(params.minReceived, destinationDecimals);
    if (!minAskAmount.ok) {
      return { sent: false, reason: minAskAmount.reason };
    }

    const { DEX, pTON } = await import("@ston-fi/sdk");

    const router = (agent.connection as any).open(new DEX.v1.Router());

    const amountIn = toNano(params.amount);

    if (params.fromToken.toUpperCase() === "TON") {
      // Swap TON -> Jetton
      const txParams = await router.getSwapTonToJettonTxParams({
        userWalletAddress: agent.wallet.address,
        proxyTon: new pTON.v1(),
        offerAmount: amountIn,
        askJettonAddress: Address.parse(params.toToken),
        minAskAmount: minAskAmount.value,
      });

      await sendTransaction(agent, [
        internal({ to: txParams.to, value: txParams.value, bounce: true, body: txParams.body }),
      ]);
    } else if (params.toToken.toUpperCase() === "TON") {
      // Swap Jetton -> TON
      const txParams = await router.getSwapJettonToTonTxParams({
        userWalletAddress: agent.wallet.address,
        proxyTon: new pTON.v1(),
        offerJettonAddress: Address.parse(params.fromToken),
        offerAmount: amountIn,
        minAskAmount: minAskAmount.value,
      });

      await sendTransaction(agent, [
        internal({ to: txParams.to, value: txParams.value, bounce: true, body: txParams.body }),
      ]);
    } else {
      // Swap Jetton -> Jetton
      const txParams = await router.getSwapJettonToJettonTxParams({
        userWalletAddress: agent.wallet.address,
        offerJettonAddress: Address.parse(params.fromToken),
        offerAmount: amountIn,
        askJettonAddress: Address.parse(params.toToken),
        minAskAmount: minAskAmount.value,
      });

      await sendTransaction(agent, [
        internal({ to: txParams.to, value: txParams.value, bounce: true, body: txParams.body }),
      ]);
    }

    // sendTransaction returns nothing, so there is no hash to report. Saying
    // "pending" produced a field a caller could not do anything with.
    return {
      sent: true,
      fromAmount: params.amount,
      fromToken: params.fromToken,
      toToken: params.toToken,
      minReceived: params.minReceived,
      minReceivedBaseUnits: minAskAmount.value.toString(),
      dex: "stonfi",
      attached: "~0.3 TON of gas across the router hops",
    };
  },
});
