import { defineStrategy } from "../strategy";
import type { Strategy } from "../types";

/**
 * Configuration options for the portfolio rebalancing strategy.
 *
 * @since 1.0.0
 */
export interface RebalanceStrategyOptions {
  /** Execution schedule expression, e.g., "every 1d" (default: "every 1d") */
  schedule?: string;
}

/**
 * Creates a portfolio rebalancing strategy that periodically fetches portfolio metrics
 * and the current wallet balance, providing the data needed to make rebalancing decisions.
 *
 * @param options - Configuration for the rebalance strategy
 * @returns A fully defined {@link Strategy} ready to register with a {@link StrategyRunner}
 * @since 1.0.0
 */
export function createRebalanceStrategy(options: RebalanceStrategyOptions = {}): Strategy {
  const { schedule = "every 1d" } = options;

  return defineStrategy({
    name: "portfolio-rebalance",
    description: "Analyze portfolio metrics and rebalance positions",
    schedule,
    steps: [
      {
        id: "get_metrics",
        action: "get_portfolio_metrics",
        params: {},
      },
      {
        id: "check_balance",
        action: "get_balance",
        params: {},
      },
    ],
  });
}
