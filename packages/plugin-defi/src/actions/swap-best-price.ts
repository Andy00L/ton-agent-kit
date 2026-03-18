import { z } from "zod";
import { Address, internal, Cell } from "@ton/core";

import { defineAction, sendTransaction } from "@ton-agent-kit/core";

/** Well-known token addresses for Omniston */
const TOKEN_ADDRESSES: Record<string, string> = {
  TON: "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c",
  USDT: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
  NOT: "EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT",
  DOGS: "EQCvxJy4eG8hyHBFsZ7DUELKnuN0w-none-UGKjbGTbsGoODOG",
  STON: "EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO",
};

export const swapBestPriceAction = defineAction({
  name: "swap_best_price",
  description:
    "Swap tokens at the best price across all TON DEXes (DeDust, STON.fi, etc.) using the Omniston aggregator. Automatically finds the best route and price. Use this instead of swap_dedust or swap_stonfi for optimal execution.",
  schema: z.object({
    fromToken: z
      .string()
      .describe("Token to sell — symbol (e.g., 'TON', 'USDT') or jetton master address"),
    toToken: z
      .string()
      .describe("Token to buy — symbol (e.g., 'USDT', 'NOT') or jetton master address"),
    amount: z.string().describe("Amount of fromToken to swap (e.g., '10' for 10 TON)"),
    slippage: z
      .number()
      .optional()
      .describe("Max slippage in percent (e.g., 1 for 1%). Defaults to 1%."),
    quoteTimeout: z
      .number()
      .optional()
      .describe("Seconds to wait for quotes before picking the best. Defaults to 5."),
  }),
  handler: async (agent, params) => {
    if (agent.network === "testnet") {
      return {
        success: false,
        message: "swap_best_price is mainnet only. Omniston aggregation requires mainnet DEX liquidity and resolvers. Use swap_dedust or swap_stonfi for testnet swaps.",
      };
    }

    const { Omniston, SettlementMethod, Blockchain, GaslessSettlement } = await import(
      "@ston-fi/omniston-sdk"
    );

    const slippageBps = Math.round((params.slippage || 1) * 100); // 1% → 100 bps
    const quoteTimeoutMs = (params.quoteTimeout || 5) * 1000;

    // Resolve token addresses
    const fromAddr = resolveTokenAddress(params.fromToken);
    const toAddr = resolveTokenAddress(params.toToken);

    // Convert amount to base units (nanotons / base jetton units, 9 decimals)
    const decimals = 9;
    const bidUnits = (BigInt(Math.round(parseFloat(params.amount) * 1e9))).toString();

    // Create Omniston instance
    // Always use production — sandbox has limited/no resolvers
    const wsUrl = "wss://omni-ws.ston.fi";

    const omniston = new Omniston({ apiUrl: wsUrl });

    try {
      // Collect quotes for quoteTimeout seconds, pick the best
      const quotes: any[] = [];
      let wsError: any = null;

      await new Promise<void>((resolve) => {
        const sub = omniston
          .requestForQuote({
            settlementMethods: [SettlementMethod.SETTLEMENT_METHOD_SWAP],
            bidAssetAddress: {
              blockchain: Blockchain.TON,
              address: fromAddr,
            },
            askAssetAddress: {
              blockchain: Blockchain.TON,
              address: toAddr,
            },
            amount: { bidUnits },
            settlementParams: {
              maxPriceSlippageBps: slippageBps,
              maxOutgoingMessages: 4,
              gaslessSettlement: GaslessSettlement.GASLESS_SETTLEMENT_POSSIBLE,
            },
          })
          .subscribe({
            next: (event: any) => {
              if (event.type === "quoteUpdated" && event.quote) {
                quotes.push(event.quote);
              }
            },
            error: (err: any) => {
              wsError = err;
              resolve();
            },
          });

        setTimeout(() => {
          sub.unsubscribe();
          resolve();
        }, quoteTimeoutMs);
      });

      if (wsError) {
        return {
          success: false,
          fromToken: params.fromToken,
          toToken: params.toToken,
          amountIn: params.amount,
          amountOut: "0",
          quotesReceived: 0,
          message: `Omniston connection error: ${wsError.message || wsError}`,
        };
      }

      if (quotes.length === 0) {
        return {
          success: false,
          fromToken: params.fromToken,
          toToken: params.toToken,
          amountIn: params.amount,
          amountOut: "0",
          quotesReceived: 0,
          message:
            "No quotes received. The pair may not be supported or resolvers are unavailable.",
        };
      }

      // Pick best quote (highest askUnits = most tokens received)
      quotes.sort((a, b) => {
        const diff = BigInt(b.askUnits) - BigInt(a.askUnits);
        return diff > 0n ? 1 : diff < 0n ? -1 : 0;
      });
      const bestQuote = quotes[0];

      // Human-readable output amount
      const askUnits = BigInt(bestQuote.askUnits);
      const amountOut = formatUnits(askUnits, decimals);

      // Effective price
      const amountInNum = parseFloat(params.amount);
      const amountOutNum = parseFloat(amountOut);
      const price =
        amountInNum > 0
          ? `${(amountOutNum / amountInNum).toFixed(4)} ${params.toToken} per ${params.fromToken}`
          : "N/A";

      // Build transfer messages from the winning quote
      const walletAddress = agent.wallet.address.toRawString();
      const tx = await omniston.buildTransfer({
        quote: bestQuote,
        sourceAddress: {
          blockchain: Blockchain.TON,
          address: walletAddress,
        },
        destinationAddress: {
          blockchain: Blockchain.TON,
          address: walletAddress,
        },
        gasExcessAddress: {
          blockchain: Blockchain.TON,
          address: walletAddress,
        },
        useRecommendedSlippage: true,
      });

      const rawMessages = tx.ton?.messages ?? [];

      if (rawMessages.length === 0) {
        return {
          success: false,
          fromToken: params.fromToken,
          toToken: params.toToken,
          amountIn: params.amount,
          amountOut,
          dex: bestQuote.resolverName || "unknown",
          quotesReceived: quotes.length,
          message: "Quote received but no transfer messages were generated.",
        };
      }

      // Convert to internal messages
      const internalMessages = rawMessages.map((msg: any) =>
        internal({
          to: Address.parse(msg.address),
          value: BigInt(msg.amount),
          body: msg.payload ? Cell.fromBase64(msg.payload) : undefined,
          bounce: true,
        }),
      );

      // Send via wallet contract
      await sendTransaction(agent, internalMessages);

      return {
        success: true,
        dex: bestQuote.resolverName || "unknown",
        fromToken: params.fromToken,
        toToken: params.toToken,
        amountIn: params.amount,
        amountOut,
        price,
        gasBudget: bestQuote.gasBudget || null,
        protocolFee: bestQuote.protocolFeeUnits || null,
        quoteId: bestQuote.quoteId || null,
        quotesReceived: quotes.length,
        message: `Swapped ${params.amount} ${params.fromToken} → ${amountOut} ${params.toToken} via ${bestQuote.resolverName || "best route"} (best of ${quotes.length} quote${quotes.length > 1 ? "s" : ""})`,
      };
    } catch (err: any) {
      return {
        success: false,
        fromToken: params.fromToken,
        toToken: params.toToken,
        amountIn: params.amount,
        amountOut: "0",
        quotesReceived: quotes?.length ?? 0,
        error: err.message,
        message: `Swap failed: ${err.message}`,
      };
    } finally {
      // Always close the WebSocket connection
      try {
        omniston.close();
      } catch {}
    }
  },
  examples: [
    {
      input: { fromToken: "TON", toToken: "USDT", amount: "10" },
      output: {
        success: true,
        dex: "STON.fi V2",
        amountIn: "10",
        amountOut: "38.5",
        price: "3.85 USDT per TON",
        quotesReceived: 3,
        message: "Swapped 10 TON → 38.5 USDT via STON.fi V2 (best of 3 quotes)",
      },
      description: "Swap 10 TON for USDT at the best available price",
    },
  ],
});

/**
 * Resolve a token symbol or address to an Omniston-compatible address.
 */
function resolveTokenAddress(token: string): string {
  const upper = token.toUpperCase();
  if (TOKEN_ADDRESSES[upper]) return TOKEN_ADDRESSES[upper];
  // Assume it's already an address
  return token;
}

/**
 * Format base units (bigint) to human-readable string with given decimals.
 */
function formatUnits(units: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = units / divisor;
  const frac = units % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}
