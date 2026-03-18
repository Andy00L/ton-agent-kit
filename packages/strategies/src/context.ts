import type { StrategyContext as IStrategyContext } from "./types";

/**
 * Mutable execution context shared across all steps within a strategy run.
 * Stores step results, user-defined variables, run counts, and supports template resolution.
 *
 * @since 1.0.0
 */
export class StrategyContext implements IStrategyContext {
  /** Map of step ID to the result returned by that step */
  results: Map<string, any>;
  /** User-defined variables available to all steps */
  variables: Record<string, any>;
  /** Number of times this strategy has been executed */
  runCount: number;
  /** Timestamp when this context was first created */
  startedAt: Date;
  /** Timestamp of the most recent run, or null if never run */
  lastRunAt: Date | null;
  /** Name of the strategy this context belongs to */
  strategyName: string;

  /**
   * Creates a new StrategyContext for the given strategy.
   *
   * @param strategyName - The name of the strategy this context belongs to
   * @param variables - Optional initial variables to seed the context
   * @since 1.0.0
   */
  constructor(strategyName: string, variables: Record<string, any> = {}) {
    this.strategyName = strategyName;
    this.results = new Map();
    this.variables = { ...variables };
    this.runCount = 0;
    this.startedAt = new Date();
    this.lastRunAt = null;
  }

  /**
   * Store a step's execution result by step ID.
   *
   * @param stepId - The unique identifier of the step
   * @param result - The value returned by the step's action
   * @since 1.0.0
   */
  setResult(stepId: string, result: any): void {
    this.results.set(stepId, result);
  }

  /**
   * Retrieve a previously stored step result.
   *
   * @param stepId - The unique identifier of the step
   * @returns The stored result, or `undefined` if the step has not been executed
   * @since 1.0.0
   */
  getResult(stepId: string): any {
    return this.results.get(stepId);
  }

  /**
   * Set a user-defined variable in the context.
   *
   * @param key - Variable name
   * @param value - Variable value
   * @since 1.0.0
   */
  setVariable(key: string, value: any): void {
    this.variables[key] = value;
  }

  /**
   * Retrieve a user-defined variable from the context.
   *
   * @param key - Variable name
   * @returns The stored value, or `undefined` if the variable has not been set
   * @since 1.0.0
   */
  getVariable(key: string): any {
    return this.variables[key];
  }

  /**
   * Replace mustache-style placeholders in a template string with context values.
   * Supported placeholders: `{{timestamp}}`, `{{runCount}}`, `{{strategyName}}`.
   *
   * @param template - The template string containing placeholders
   * @returns The resolved string with placeholders replaced
   * @since 1.0.0
   */
  resolveTemplate(template: string): string {
    return template
      .replace(/\{\{timestamp\}\}/g, new Date().toISOString())
      .replace(/\{\{runCount\}\}/g, String(this.runCount))
      .replace(/\{\{strategyName\}\}/g, this.strategyName);
  }

  /**
   * Resolve template placeholders in all string values of a params object.
   * Non-string values are passed through unchanged.
   *
   * @param params - Key-value parameter map, where string values may contain `{{...}}` placeholders
   * @returns A new params object with all string values resolved
   * @since 1.0.0
   */
  resolveParams(params: Record<string, any>): Record<string, any> {
    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") {
        resolved[key] = this.resolveTemplate(value);
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }

  /**
   * Reset the context for a new strategy run.
   * Clears all step results, updates `lastRunAt`, and increments `runCount`.
   *
   * @since 1.0.0
   */
  reset(): void {
    this.results = new Map();
    this.lastRunAt = new Date();
    this.runCount++;
  }
}
