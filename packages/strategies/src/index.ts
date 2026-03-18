/**
 * Strategies package — define, schedule, and execute multi-step strategies on the TON blockchain.
 *
 * @packageDocumentation
 * @since 1.0.0
 */

// Core engine
/** Factory function for creating validated strategy definitions */
export { defineStrategy, StrategyRunner } from "./strategy";
/** Mutable execution context shared across strategy steps */
export { StrategyContext } from "./context";
/** Interval-based scheduler and schedule-string parser */
export { StrategyScheduler, parseSchedule } from "./scheduler";

// Types
/** Type definitions for strategies, steps, results, contexts, and runner hooks */
export type {
  Strategy,
  StrategyStep,
  StrategyContext as IStrategyContext,
  StepResult,
  StrategyResult,
  StrategyRunnerHooks,
} from "./types";

// Strategy templates
/** Pre-built dollar-cost averaging strategy template */
export { createDcaStrategy } from "./templates/dca-buy";
export type { DcaStrategyOptions } from "./templates/dca-buy";

/** Pre-built price monitoring strategy template */
export { createPriceMonitorStrategy } from "./templates/price-monitor";
export type { PriceMonitorOptions } from "./templates/price-monitor";

/** Pre-built portfolio rebalancing strategy template */
export { createRebalanceStrategy } from "./templates/portfolio-rebalance";
export type { RebalanceStrategyOptions } from "./templates/portfolio-rebalance";

/** Pre-built reputation score monitoring strategy template */
export { createReputationGuardStrategy } from "./templates/reputation-guard";
export type { ReputationGuardOptions } from "./templates/reputation-guard";
