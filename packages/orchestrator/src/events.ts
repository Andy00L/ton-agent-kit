import type { Task, TaskResult, SwarmOptions } from "./types";

/**
 * Fires orchestration event callbacks from SwarmOptions.
 * Thin wrapper — no EventEmitter overhead, just direct callback invocation.
 */
export class EventBus {
  constructor(private opts: SwarmOptions) {}

  /** Fire when the planner produces a task list */
  planReady(tasks: Task[]): void {
    this.opts.onPlanReady?.(tasks);
  }

  /** Fire when a task begins execution */
  taskStart(task: Task): void {
    this.opts.onTaskStart?.(task);
  }

  /** Fire when a task completes successfully */
  taskComplete(result: TaskResult): void {
    this.opts.onTaskComplete?.(result);
  }

  /** Fire when a task fails after all retries */
  taskError(task: Task, error: Error): void {
    this.opts.onTaskError?.(task, error);
  }

  /** Fire when all tasks have finished */
  complete(results: TaskResult[]): void {
    this.opts.onComplete?.(results);
  }

  /** Log a message if verbose mode is enabled */
  log(message: string): void {
    if (this.opts.verbose) {
      console.log(`[orchestrator] ${message}`);
    }
  }
}
