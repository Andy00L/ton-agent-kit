import type {
  Strategy,
  StrategyStep,
  StrategyResult,
  StepResult,
  StrategyRunnerHooks,
} from "./types";
import { StrategyContext } from "./context";
import { StrategyScheduler, parseSchedule } from "./scheduler";

/**
 * Factory function that validates and normalizes a strategy definition.
 * Ensures every step has a unique `id` and that required fields are present.
 *
 * @param config - Partial strategy configuration; `name` and `steps` are required
 * @returns A fully normalized {@link Strategy} object ready for use with {@link StrategyRunner}
 * @throws {Error} If `name` is missing or `steps` is empty
 *
 * @example
 * ```ts
 * const strategy = defineStrategy({
 *   name: "my-strategy",
 *   schedule: "every 5m",
 *   steps: [
 *     { action: "get_balance", params: {} },
 *     { action: "swap_best_price", params: { fromToken: "TON", toToken: "USDT", amount: 10 } },
 *   ],
 * });
 * ```
 *
 * @since 1.0.0
 */
export function defineStrategy(
  config: Partial<Strategy> & { name: string; steps: StrategyStep[] }
): Strategy {
  if (!config.name) {
    throw new Error("Strategy must have a name");
  }
  if (!config.steps || config.steps.length === 0) {
    throw new Error("Strategy must have at least one step");
  }

  const steps = config.steps.map((step, index) => ({
    ...step,
    id: step.id || `step_${index}`,
  }));

  return {
    name: config.name,
    description: config.description,
    schedule: config.schedule,
    maxRuns: config.maxRuns,
    steps,
    onComplete: config.onComplete,
    onError: config.onError,
  };
}

/**
 * Executes registered strategies against a TonAgentKit instance, with support for
 * conditional steps, retries, scheduling, and lifecycle hooks.
 *
 * @since 1.0.0
 */
export class StrategyRunner {
  private agent: any;
  private hooks: StrategyRunnerHooks;
  private strategies: Map<string, Strategy> = new Map();
  private contexts: Map<string, StrategyContext> = new Map();
  private scheduler: StrategyScheduler = new StrategyScheduler();

  /**
   * Creates a new StrategyRunner bound to a TonAgentKit agent.
   *
   * @param agent - The TonAgentKit instance that will execute actions
   * @param hooks - Optional lifecycle hooks invoked during strategy execution
   * @since 1.0.0
   */
  constructor(agent: any, hooks?: StrategyRunnerHooks) {
    this.agent = agent;
    this.hooks = hooks || {};
  }

  /**
   * Register a strategy so it can be executed by name via {@link run} or {@link start}.
   *
   * @param strategy - The strategy definition to register
   * @returns this (chainable)
   * @since 1.0.0
   */
  use(strategy: Strategy): this {
    this.strategies.set(strategy.name, strategy);
    return this;
  }

  /**
   * Execute a registered strategy once, running all steps sequentially.
   * Steps may be skipped based on conditions, retried on failure, and transformed on success.
   *
   * @param name - Name of the previously registered strategy
   * @param variables - Optional key-value pairs merged into the strategy's {@link StrategyContext}
   * @returns A {@link StrategyResult} with step-level outcomes and aggregate statistics
   * @throws {Error} If the strategy is not registered
   * @since 1.0.0
   */
  async run(name: string, variables?: Record<string, any>): Promise<StrategyResult> {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      throw new Error(`Strategy "${name}" not found. Register it first with .use()`);
    }

    // Get or create context
    if (!this.contexts.has(name)) {
      this.contexts.set(name, new StrategyContext(name, variables));
    }
    const context = this.contexts.get(name)!;

    // Merge in any new variables
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        context.setVariable(key, value);
      }
    }

    // Reset context for this run
    context.reset();

    // Check maxRuns
    if (strategy.maxRuns && context.runCount > strategy.maxRuns) {
      this.stop(name);
      return {
        strategyName: name,
        runCount: context.runCount,
        steps: [],
        context,
        totalDuration: 0,
        completedSteps: 0,
        skippedSteps: 0,
        failedSteps: 0,
      };
    }

    const runStart = Date.now();
    const stepResults: StepResult[] = [];
    let completedSteps = 0;
    let skippedSteps = 0;
    let failedSteps = 0;

    for (const step of strategy.steps) {
      const stepId = step.id || "unknown";
      const stepStart = Date.now();

      // Evaluate condition
      if (step.condition) {
        try {
          if (!step.condition(context)) {
            // Step skipped
            skippedSteps++;
            const stepResult: StepResult = {
              stepId,
              action: step.action,
              params: {},
              result: null,
              skipped: true,
              duration: Date.now() - stepStart,
            };
            stepResults.push(stepResult);

            if (this.hooks.onStepSkipped) {
              await this.hooks.onStepSkipped(name, step, "condition false");
            }

            continue;
          }
        } catch (_conditionError) {
          // Condition threw an error, skip the step
          skippedSteps++;
          const stepResult: StepResult = {
            stepId,
            action: step.action,
            params: {},
            result: null,
            skipped: true,
            duration: Date.now() - stepStart,
          };
          stepResults.push(stepResult);

          if (this.hooks.onStepSkipped) {
            await this.hooks.onStepSkipped(step, context);
          }

          continue;
        }
      }

      // Resolve params
      let resolvedParams: Record<string, any>;
      if (typeof step.params === "function") {
        resolvedParams = step.params(context);
      } else {
        resolvedParams = context.resolveParams(step.params);
      }

      // Notify step start
      if (this.hooks.onStepStart) {
        await this.hooks.onStepStart(name, step);
      }

      // Apply delay before execution if specified
      if (step.delay && step.delay > 0) {
        await new Promise((r) => setTimeout(r, step.delay));
      }

      // Execute with retries
      let result: any = null;
      let error: string | undefined;
      let succeeded = false;
      const maxAttempts = (step.retries || 0) + 1;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          if (step.action === "wait") {
            const waitMs = resolvedParams.ms || 1000;
            await new Promise((r) => setTimeout(r, waitMs));
            result = { waited: resolvedParams.ms };
          } else {
            result = await this.agent.runAction(step.action, resolvedParams);
          }

          // Apply transform if defined
          if (step.transform) {
            result = step.transform(result, context);
          }

          succeeded = true;
          break;
        } catch (e: any) {
          error = e.message || String(e);

          // If this is the last attempt, handle the error
          if (attempt === maxAttempts - 1) {
            if (this.hooks.onStepError) {
              await this.hooks.onStepError(name, step, e);
            }

            // Call strategy-level onError handler
            if (strategy.onError) {
              const directive = strategy.onError(e, step);
            if (directive === "stop") {
                failedSteps++;
                const stepResult: StepResult = {
                  stepId,
                  action: step.action,
                  params: resolvedParams,
                  result: null,
                  skipped: false,
                  error,
                  duration: Date.now() - stepStart,
                };
                stepResults.push(stepResult);

                // Build and return early result
                const totalDuration = Date.now() - runStart;
                const finalResult: StrategyResult = {
                  strategyName: name,
                  runCount: context.runCount,
                  steps: stepResults,
                  context,
                  totalDuration,
                  completedSteps,
                  skippedSteps,
                  failedSteps,
                };

                if (this.hooks.onRunComplete) {
                  await this.hooks.onRunComplete(finalResult);
                }
                if (strategy.onComplete) {
                  await strategy.onComplete(finalResult);
                }

                return finalResult;
              } else if (directive === "continue") {
                // Continue to next step
              } else if (directive === "retry") {
                // Retries already exhausted, just continue
              }
            }
          }
        }
      }

      // Store result in context
      context.setResult(stepId, result);

      // Call onResult callback if defined
      if (step.onResult) {
        await step.onResult(result, context);
      }

      // Build step result
      const stepResult: StepResult = {
        stepId,
        action: step.action,
        params: resolvedParams,
        result,
        skipped: false,
        error: succeeded ? undefined : error,
        duration: Date.now() - stepStart,
      };
      stepResults.push(stepResult);

      if (succeeded) {
        completedSteps++;
        if (this.hooks.onStepComplete) {
          await this.hooks.onStepComplete(name, step, result);
        }
      } else {
        failedSteps++;
      }
    }

    const totalDuration = Date.now() - runStart;

    const strategyResult: StrategyResult = {
      strategyName: name,
      runCount: context.runCount,
      steps: stepResults,
      context,
      totalDuration,
      completedSteps,
      skippedSteps,
      failedSteps,
    };

    if (this.hooks.onRunComplete) {
      await this.hooks.onRunComplete(strategyResult);
    }
    if (strategy.onComplete) {
      await strategy.onComplete(stepResults);
    }

    return strategyResult;
  }

  /**
   * Start a strategy on its configured schedule.
   * If the schedule is "once" or unrecognized, the strategy runs immediately a single time.
   * Otherwise it repeats at the parsed interval.
   *
   * @param name - Name of the previously registered strategy
   * @param variables - Optional key-value pairs merged into the strategy's context on each run
   * @throws {Error} If the strategy is not registered
   * @since 1.0.0
   */
  start(name: string, variables?: Record<string, any>): void {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      throw new Error(`Strategy "${name}" not found. Register it first with .use()`);
    }

    const schedule = strategy.schedule || "once";
    const intervalMs = parseSchedule(schedule);

    if (intervalMs === null) {
      // "once" or unrecognized — just run once
      this.run(name, variables);
      return;
    }

    this.scheduler.start(name, intervalMs, () => this.run(name, variables));
  }

  /**
   * Stop a scheduled strategy by name.
   *
   * @param name - Name of the strategy to stop
   * @returns `true` if the strategy was running and has been stopped, `false` otherwise
   * @since 1.0.0
   */
  stop(name: string): boolean {
    return this.scheduler.stop(name);
  }

  /**
   * Stop all currently scheduled strategies.
   *
   * @since 1.0.0
   */
  stopAll(): void {
    this.scheduler.stopAll();
  }

  /**
   * Get the names of all currently scheduled (active) strategies.
   *
   * @returns An array of strategy names that are actively running on a schedule
   * @since 1.0.0
   */
  getActive(): string[] {
    return this.scheduler.getActive();
  }

  /**
   * Retrieve the execution context for a strategy, which stores results and variables across runs.
   *
   * @param name - Name of the strategy
   * @returns The {@link StrategyContext} instance, or `undefined` if the strategy has never been run
   * @since 1.0.0
   */
  getContext(name: string): StrategyContext | undefined {
    return this.contexts.get(name);
  }

  /**
   * Get the names of all registered strategies.
   *
   * @returns An array of strategy names that have been registered with {@link use}
   * @since 1.0.0
   */
  getStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }
}
