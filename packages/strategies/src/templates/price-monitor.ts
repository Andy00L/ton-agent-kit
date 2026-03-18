import { defineStrategy } from "../strategy";
import type { Strategy, StrategyContext } from "../types";

/**
 * Configuration options for the price monitoring strategy.
 *
 * @since 1.0.0
 */
export interface PriceMonitorOptions {
  /** Token symbol to monitor (default: "TON") */
  token?: string;
  /** Polling schedule expression, e.g., "every 5m" (default: "every 5m") */
  schedule?: string;
  /** Upper price threshold that triggers an alert (default: Infinity) */
  alertAbove?: number;
  /** Lower price threshold that triggers an alert (default: 0) */
  alertBelow?: number;
  /** Callback invoked when the price crosses a threshold */
  onAlert?: (price: number, direction: "above" | "below", context: StrategyContext) => void;
}

/**
 * Creates a price monitoring strategy that periodically fetches a token's price,
 * maintains a price history in the context, and invokes an alert callback when thresholds are crossed.
 *
 * @param options - Configuration for the price monitor strategy
 * @returns A fully defined {@link Strategy} ready to register with a {@link StrategyRunner}
 * @since 1.0.0
 */
export function createPriceMonitorStrategy(options: PriceMonitorOptions = {}): Strategy {
  const {
    token = "TON",
    schedule = "every 5m",
    alertAbove = Infinity,
    alertBelow = 0,
    onAlert,
  } = options;

  return defineStrategy({
    name: `price-monitor-${token.toLowerCase()}`,
    description: `Monitor ${token} price and alert on thresholds`,
    schedule,
    steps: [
      {
        id: "get_price",
        action: "get_token_price",
        params: { token },
        onResult: async (result: any, context: StrategyContext) => {
          const price = result?.price ?? result ?? 0;

          // Initialize price history if not present
          if (!context.variables.priceHistory) {
            context.variables.priceHistory = [];
          }

          // Store price with timestamp
          context.variables.priceHistory.push({
            price,
            timestamp: new Date().toISOString(),
          });

          // Check alert thresholds
          if (onAlert) {
            if (price > alertAbove) {
              onAlert(price, "above", context);
            }
            if (price < alertBelow) {
              onAlert(price, "below", context);
            }
          }
        },
      },
      {
        id: "check_balance",
        action: "get_balance",
        params: {},
      },
    ],
  });
}
