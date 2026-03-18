/**
 * Defines a named, multi-step strategy that can be run once or on a recurring schedule.
 *
 * @since 1.0.0
 */
export interface Strategy {
  /** Unique name used to register and reference this strategy */
  name: string;
  /** Human-readable description of the strategy's purpose */
  description?: string;
  /** Schedule expression: "once" or "every Xms/s/m/h/d" (default: "once") */
  schedule?: string;
  /** Maximum number of executions before the strategy auto-stops */
  maxRuns?: number;
  /** Ordered list of steps to execute on each run */
  steps: StrategyStep[];
  /** Called after all steps complete (or after an early stop) */
  onComplete?: (result: StrategyResult) => void | Promise<void>;
  /** Called on step failure after retries are exhausted; returns a directive for how to proceed */
  onError?: (error: Error, step: StrategyStep, context: StrategyContext) => "continue" | "stop" | "retry";
}

/**
 * A single step within a strategy, representing one action invocation with optional
 * conditions, retries, delays, and result transformations.
 *
 * @since 1.0.0
 */
export interface StrategyStep {
  /** Unique identifier for this step (auto-generated as "step_N" if omitted) */
  id?: string;
  /** Name of the agent action to invoke (or "wait" for a timed pause) */
  action: string;
  /** Static params or a function that dynamically resolves params from context */
  params: Record<string, any> | ((context: StrategyContext) => Record<string, any>);
  /** Predicate evaluated before execution; if it returns false the step is skipped */
  condition?: (context: StrategyContext) => boolean;
  /** Number of retry attempts on failure (default: 0) */
  retries?: number;
  /** Delay in milliseconds to wait before executing this step */
  delay?: number;
  /** Post-processing function applied to the action result before storage */
  transform?: (result: any, context: StrategyContext) => any;
  /** Callback invoked with the step's result and context after successful execution */
  onResult?: (result: any, context: StrategyContext) => void | Promise<void>;
}

/**
 * Interface for the mutable execution context shared across steps within a strategy run.
 *
 * @since 1.0.0
 */
export interface StrategyContext {
  /** Map of step ID to the result returned by that step */
  results: Map<string, any>;
  /** User-defined variables available to all steps */
  variables: Record<string, any>;
  /** Number of times the strategy has been executed */
  runCount: number;
  /** Timestamp when the context was first created */
  startedAt: Date;
  /** Timestamp of the most recent run, or null if never run */
  lastRunAt: Date | null;
  /** Name of the strategy this context belongs to */
  strategyName: string;
}

/**
 * Outcome of a single step execution within a strategy run.
 *
 * @since 1.0.0
 */
export interface StepResult {
  /** Identifier of the step that produced this result */
  stepId: string;
  /** Name of the action that was executed */
  action: string;
  /** Resolved parameters that were passed to the action */
  params: Record<string, any>;
  /** Value returned by the action, or null on failure/skip */
  result: any;
  /** Whether the step was skipped due to its condition */
  skipped: boolean;
  /** Error message if the step failed */
  error?: string;
  /** Execution duration in milliseconds */
  duration: number;
}

/**
 * Aggregated result of a complete strategy run, including per-step outcomes and statistics.
 *
 * @since 1.0.0
 */
export interface StrategyResult {
  /** Name of the strategy that was executed */
  strategyName: string;
  /** The run count at the time of this execution */
  runCount: number;
  /** Ordered array of results for each step */
  steps: StepResult[];
  /** The strategy's execution context after the run */
  context: StrategyContext;
  /** Total wall-clock duration of the run in milliseconds */
  totalDuration: number;
  /** Number of steps that completed successfully */
  completedSteps: number;
  /** Number of steps that were skipped */
  skippedSteps: number;
  /** Number of steps that failed */
  failedSteps: number;
}

/**
 * Lifecycle hooks for the {@link StrategyRunner}, invoked during step and run transitions.
 * All hooks are optional and may be asynchronous.
 *
 * @since 1.0.0
 */
export interface StrategyRunnerHooks {
  /** Called when a step begins execution */
  onStepStart?: (step: StrategyStep, context: StrategyContext) => void | Promise<void>;
  /** Called when a step completes successfully */
  onStepComplete?: (stepResult: StepResult, context: StrategyContext) => void | Promise<void>;
  /** Called when a step is skipped due to its condition evaluating to false */
  onStepSkipped?: (step: StrategyStep, context: StrategyContext) => void | Promise<void>;
  /** Called when a step fails after exhausting retries */
  onStepError?: (error: Error, step: StrategyStep, context: StrategyContext) => void | Promise<void>;
  /** Called when all steps in a run have finished */
  onRunComplete?: (result: StrategyResult) => void | Promise<void>;
}
