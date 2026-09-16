import { z } from "zod";
import { Address, internal, Cell } from "@ton/core";

import {
  defineAction,
  describeError,
  fetchJettonMetadata,
  fromBaseUnits,
  sendTransaction,
  toBaseUnits,
  tonapiBase,
} from "@ton-agent-kit/core";
import type { Quote, QuoteResponseEvent } from "@ston-fi/omniston-sdk";

/**
 * Everything `swap_best_price` reports. The optional fields are absent on the
 * failure paths, which is why the type is declared rather than inferred: the
 * inferred union of every return shape rejects its own documented example.
 */
interface SwapBestPriceInput {
  fromToken: string;
  toToken: string;
  amount: string;
  slippage?: number;
  quoteTimeout?: number;
}

interface SwapBestPriceResult {
  success: boolean;
  message: string;
  fromToken?: string;
  toToken?: string;
  amountIn?: string;
  amountOut?: string;
  dex?: string;
  price?: string;
  gasBudget?: string | null;
  protocolFee?: string | null;
  quoteId?: string | null;
  quotesReceived?: number;
  error?: string;
}

/** Well-known token addresses for Omniston */
const TOKEN_ADDRESSES: Record<string, string> = {
  TON: "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c",
  USDT: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
  NOT: "EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT",
  STON: "EQA2kCVNwVsil2EM2mB0SkXytxCqQjS4mttjDpnXmwG9T6bO",
};

export const swapBestPriceAction = defineAction<SwapBestPriceInput, SwapBestPriceResult>({
  name: "swap_best_price",
  description:
    "Swap tokens at the best price across all TON DEXes (DeDust, STON.fi, etc.) using the Omniston aggregator. Automatically finds the best route and price. Use this instead of swap_dedust or swap_stonfi for optimal execution.",
  schema: z.object({
    fromToken: z
      .string()
      .describe("Token to sell: symbol (e.g., 'TON', 'USDT') or jetton master address"),
    toToken: z
      .string()
      .describe("Token to buy: symbol (e.g., 'USDT', 'NOT') or jetton master address"),
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

    // Decimals are declared per token and the two legs rarely agree. Omniston
    // quotes carry base units only, so reading them is the only way to report
    // an amount: a 38.5 USDT quote formatted at 9 decimals reads "0.0385".
    const apiBase = tonapiBase(agent.network);
    const [bidDecimals, askDecimals] = await Promise.all([
      resolveTokenDecimals(apiBase, fromAddr, agent.config.TONAPI_KEY),
      resolveTokenDecimals(apiBase, toAddr, agent.config.TONAPI_KEY),
    ]);
    if (!bidDecimals.ok) {
      return { success: false, error: bidDecimals.reason, message: bidDecimals.reason };
    }
    if (!askDecimals.ok) {
      return { success: false, error: askDecimals.reason, message: askDecimals.reason };
    }

    const bid = toBaseUnits(params.amount, bidDecimals.value);
    if (!bid.ok) {
      return { success: false, error: bid.reason, message: bid.reason };
    }
    const bidUnits = bid.value.toString();

    // Create Omniston instance
    // Always use production, the sandbox has limited or no resolvers
    const wsUrl = "wss://omni-ws.ston.fi";

    const omniston = new Omniston({ apiUrl: wsUrl });

    // Declared outside the try: the catch block reports how many quotes arrived.
    const quotes: Quote[] = [];

    try {
      // Collect quotes for quoteTimeout seconds, pick the best
      let wsError: unknown = null;

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
            next: (event: QuoteResponseEvent) => {
              if (event.type === "quoteUpdated" && event.quote) {
                quotes.push(event.quote);
              }
            },
            error: (streamError: unknown) => {
              wsError = streamError;
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
          message: `Omniston connection error: ${describeError(wsError)}`,
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
      const amountOut = fromBaseUnits(askUnits, askDecimals.value);

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
      // TonMessage carries targetAddress and sendAmount, not address and amount.
      // sourceRef: node_modules/@ston-fi/omniston-sdk/dist/index.d.ts (TonMessage)
      const internalMessages = rawMessages.map((message) =>
        internal({
          to: Address.parse(message.targetAddress),
          value: BigInt(message.sendAmount),
          body: message.payload ? Cell.fromBase64(message.payload) : undefined,
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
    } catch (error: unknown) {
      const reason = describeError(error);
      return {
        success: false,
        fromToken: params.fromToken,
        toToken: params.toToken,
        amountIn: params.amount,
        amountOut: "0",
        quotesReceived: quotes.length,
        error: reason,
        message: `Swap failed: ${reason}`,
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
/** Decimals of the native coin. TON has no jetton master to read. */
const NATIVE_TON_DECIMALS = 9;

/**
 * Decimals for one leg of a swap: fixed for the native coin, read from the
 * jetton master otherwise.
 */
async function resolveTokenDecimals(
  apiBase: string,
  tokenAddress: string,
  apiKey?: string,
): Promise<{ ok: true; value: number } | { ok: false; reason: string }> {
  if (tokenAddress === TOKEN_ADDRESSES.TON) {
    return { ok: true, value: NATIVE_TON_DECIMALS };
  }
  const metadata = await fetchJettonMetadata(apiBase, tokenAddress, apiKey);
  return metadata.ok
    ? { ok: true, value: metadata.value.decimals }
    : { ok: false, reason: metadata.reason };
}

function resolveTokenAddress(token: string): string {
  const upper = token.toUpperCase();
  if (TOKEN_ADDRESSES[upper]) return TOKEN_ADDRESSES[upper];
  // Assume it's already an address
  return token;
}

