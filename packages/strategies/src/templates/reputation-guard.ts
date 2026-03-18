import { defineStrategy } from "../strategy";
import type { Strategy, StrategyContext } from "../types";

/**
 * Configuration options for the reputation guard strategy.
 *
 * @since 1.0.0
 */
export interface ReputationGuardOptions {
  /** The unique identifier of the agent whose reputation to monitor */
  agentId: string;
  /** Minimum acceptable reputation score; triggers an alert if the score drops below (default: 50) */
  minScore?: number;
  /** Polling schedule expression, e.g., "every 1h" (default: "every 1h") */
  schedule?: string;
  /** Callback invoked when the reputation score falls below the minimum threshold */
  onAlert?: (score: number, agentId: string, context: StrategyContext) => void;
}

/**
 * Creates a reputation guard strategy that periodically checks an agent's on-chain reputation score
 * and fires an alert callback if the score drops below a configured threshold.
 *
 * @param options - Configuration for the reputation guard strategy; `agentId` is required
 * @returns A fully defined {@link Strategy} ready to register with a {@link StrategyRunner}
 * @since 1.0.0
 */
export function createReputationGuardStrategy(options: ReputationGuardOptions): Strategy {
  const {
    agentId,
    minScore = 50,
    schedule = "every 1h",
    onAlert,
  } = options;

  return defineStrategy({
    name: `reputation-guard-${agentId}`,
    description: `Monitor reputation score for agent ${agentId} and alert if below ${minScore}`,
    schedule,
    steps: [
      {
        id: "get_reputation",
        action: "get_agent_reputation",
        params: { agentId },
      },
      {
        id: "check_score",
        action: "get_balance",
        params: {},
        onResult: async (_result: any, context: StrategyContext) => {
          const reputation = context.getResult("get_reputation");
          const score = reputation?.score ?? reputation ?? 0;

          if (score < minScore && onAlert) {
            onAlert(score, agentId, context);
          }
        },
      },
    ],
  });
}
