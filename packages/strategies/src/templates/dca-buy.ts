import { defineStrategy } from "../strategy";
import type { Strategy, StrategyContext } from "../types";

/**
 * Configuration options for the dollar-cost averaging (DCA) strategy.
 *
 * @since 1.0.0
 */
export interface DcaStrategyOptions {
  /** Token symbol to buy (default: "TON") */
  token?: string;
  /** Amount of TON to spend on each buy (default: 10) */
  amount?: number;
  /** Maximum acceptable price; the buy is skipped if the current price exceeds this (default: Infinity) */
  maxPrice?: number;
  /** Execution schedule expression, e.g., "every 1h" (default: "every 1h") */
  schedule?: string;
  /** DEX to route the swap through (default: "dedust") */
  dex?: string;
}

/**
 * Creates a dollar-cost averaging strategy that periodically buys a token at the best available price.
 * The strategy fetches the current price, checks the wallet balance, and executes a swap if conditions are met.
 *
 * @param options - Configuration for the DCA strategy
 * @returns A fully defined {@link Strategy} ready to register with a {@link StrategyRunner}
 * @since 1.0.0
 */
export function createDcaStrategy(options: DcaStrategyOptions = {}): Strategy {
  const {
    token = "TON",
    amount = 10,
    maxPrice = Infinity,
    schedule = "every 1h",
    dex = "dedust",
  } = options;

  return defineStrategy({
    name: `dca-buy-${token.toLowerCase()}`,
    description: `Dollar-cost average into ${token} — buy ${amount} TON worth every interval`,
    schedule,
    steps: [
      {
        id: "get_price",
        action: "get_token_price",
        params: { token },
      },
      {
        id: "check_balance",
        action: "get_balance",
        params: {},
      },
      {
        id: "execute_swap",
        action: "swap_best_price",
        params: (context: StrategyContext) => {
          const price = context.getResult("get_price");
          return {
            fromToken: "TON",
            toToken: token,
            amount,
            dex,
            currentPrice: price?.price,
          };
        },
        condition: (context: StrategyContext) => {
          const price = context.getResult("get_price");
          const balance = context.getResult("check_balance");

          const currentPrice = price?.price ?? 0;
          const currentBalance = balance?.balance ?? balance ?? 0;

          // Skip if price exceeds maxPrice or balance is insufficient
          if (currentPrice > maxPrice) {
            return false;
          }
          if (currentBalance < amount) {
            return false;
          }

          return true;
        },
      },
    ],
  });
}
