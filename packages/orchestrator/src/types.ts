/**
 * A single task in the execution plan, representing one action to be performed by a specific agent.
 *
 * @since 1.0.0
 */
export interface Task {
  /** Unique identifier for this task */
  id: string;
  /** Name of the agent that will execute this task */
  agent: string;
  /** Action name (must be in the agent's capabilities) */
  action: string;
  /** Parameters to pass to the action */
  params: Record<string, any>;
  /** IDs of tasks that must complete before this one can start */
  dependsOn?: string[];
  /** Human-readable description of what this task does */
  description?: string;
}

/**
 * Result of a single task execution, including timing and error information.
 *
 * @since 1.0.0
 */
export interface TaskResult {
  /** ID of the task that produced this result */
  taskId: string;
  /** Name of the agent that executed this task */
  agent: string;
  /** Action that was executed */
  action: string;
  /** The result returned by the action handler */
  result: any;
  /** Error message if the task failed */
  error?: string;
  /** Execution duration in milliseconds */
  duration: number;
  /** Unix timestamp when the task completed */
  timestamp: number;
}

/**
 * Configuration for a registered agent within the orchestrator.
 *
 * @since 1.0.0
 */
export interface AgentConfig {
  /** Unique name for this agent */
  name: string;
  /** Description of what this agent does */
  role: string;
  /** TonAgentKit instance (typed as any to avoid circular dependency) */
  agent: any;
  /** List of action names this agent can perform */
  capabilities: string[];
}

/**
 * Options for configuring swarm execution behavior, including LLM settings,
 * retry policies, parallelism, and lifecycle callbacks.
 *
 * @since 1.0.0
 */
export interface SwarmOptions {
  /** OpenAI API key (falls back to env) */
  apiKey?: string;
  /** OpenAI base URL (falls back to env) */
  baseURL?: string;
  /** LLM model to use (default: gpt-4o) */
  model?: string;
  /** Maximum retries per failed task (default: 2) */
  maxRetries?: number;
  /** Timeout per task in ms (default: 30000) */
  taskTimeout?: number;
  /** Maximum number of tasks the planner can create (default: 20) */
  maxTasks?: number;
  /** Whether to run independent tasks in parallel (default: true) */
  parallel?: boolean;
  /** Log execution details to console (default: false) */
  verbose?: boolean;
  /** Called when the planner has produced the task list */
  onPlanReady?: (tasks: Task[]) => void;
  /** Called when a task begins execution */
  onTaskStart?: (task: Task) => void;
  /** Called when a task completes successfully */
  onTaskComplete?: (result: TaskResult) => void;
  /** Called when a task fails */
  onTaskError?: (task: Task, error: Error) => void;
  /** Called when all tasks have finished */
  onComplete?: (results: TaskResult[]) => void;
}

/**
 * Final aggregated result returned by {@link Orchestrator.swarm}, containing the plan,
 * individual task results, a natural language summary, and execution statistics.
 *
 * @since 1.0.0
 */
export interface SwarmResult {
  /** The original goal that was decomposed */
  goal: string;
  /** The task plan produced by the planner */
  plan: Task[];
  /** Results from all executed tasks */
  results: TaskResult[];
  /** Natural language summary of what happened */
  summary: string;
  /** Total wall-clock duration in milliseconds */
  totalDuration: number;
  /** Names of agents that were used */
  agentsUsed: string[];
  /** Number of tasks that completed successfully */
  tasksCompleted: number;
  /** Number of tasks that failed */
  tasksFailed: number;
}
