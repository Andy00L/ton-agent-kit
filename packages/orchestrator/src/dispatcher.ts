import { toJSONSchema } from "zod";
import type { AgentConfig, Task, TaskResult, SwarmOptions } from "./types";
import type { EventBus } from "./events";

/**
 * Wraps a promise with a timeout that rejects if the promise does not settle within the given duration.
 *
 * @typeParam T - The resolved type of the wrapped promise
 * @param promise - The promise to wrap
 * @param ms - Timeout duration in milliseconds
 * @param label - Descriptive label included in the timeout error message
 * @returns A promise that resolves or rejects with the original value, or rejects on timeout
 * @since 1.0.0
 */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Executes a validated task plan with parallel execution, dependency resolution,
 * retries with exponential backoff, and timeout enforcement.
 *
 * @since 1.0.0
 */
export class Dispatcher {
  private maxRetries: number;
  private taskTimeout: number;
  private parallel: boolean;
  private events: EventBus;

  /**
   * Creates a new Dispatcher instance.
   *
   * @param opts - Swarm options controlling retries, timeouts, and parallelism
   * @param events - Event bus for emitting task lifecycle events
   * @since 1.0.0
   */
  constructor(opts: SwarmOptions, events: EventBus) {
    this.maxRetries = opts.maxRetries ?? 2;
    this.taskTimeout = opts.taskTimeout ?? 30_000;
    this.parallel = opts.parallel ?? true;
    this.events = events;
  }

  /**
   * Execute all tasks respecting dependency order.
   * Tasks without unmet dependencies run in parallel (via `Promise.allSettled`).
   * Results from completed dependencies are injected as `_context` in params,
   * and matching result fields are auto-mapped to action parameter names.
   *
   * @param tasks - The validated task plan to execute
   * @param agents - Map of agent name to {@link AgentConfig} containing the agent instances
   * @returns An array of {@link TaskResult} objects, one per task, in completion order
   * @throws {Error} If a deadlock is detected (no tasks ready but pending tasks remain)
   * @since 1.0.0
   */
  async dispatch(
    tasks: Task[],
    agents: Map<string, AgentConfig>,
  ): Promise<TaskResult[]> {
    const completed = new Set<string>();
    const results: TaskResult[] = [];
    const resultMap = new Map<string, TaskResult>();
    const pending = new Set(tasks.map((t) => t.id));
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    while (pending.size > 0) {
      // Find tasks whose dependencies are all satisfied
      const ready: Task[] = [];
      for (const id of pending) {
        const task = taskMap.get(id)!;
        const deps = task.dependsOn ?? [];
        if (deps.every((d) => completed.has(d))) {
          ready.push(task);
        }
      }

      if (ready.length === 0) {
        const remainingIds = [...pending].join(", ");
        throw new Error(
          `Deadlock: no tasks are ready but ${pending.size} tasks remain: ${remainingIds}. ` +
            `This indicates unresolvable dependencies or a circular dependency that was not caught during planning.`,
        );
      }

      /**
       * Get the accepted parameter names for an action from its Zod schema.
       */
      const getActionParamNames = (
        agentConfig: AgentConfig,
        actionName: string,
      ): Set<string> => {
        const actions = agentConfig.agent.getAvailableActions();
        const action = actions.find((a: any) => a.name === actionName);
        if (!action) return new Set();
        const schema = toJSONSchema(action.schema) as any;
        return new Set(Object.keys(schema.properties || {}));
      };

      /**
       * Build params for a task by auto-mapping dependency result fields
       * to matching parameter names, plus _context as fallback.
       */
      const buildParams = (
        task: Task,
        agentConfig: AgentConfig,
      ): Record<string, any> => {
        if (!task.dependsOn || task.dependsOn.length === 0) return task.params;

        const paramNames = getActionParamNames(agentConfig, task.action);
        const merged = { ...task.params };
        const ctx: Record<string, any> = {};

        for (const depId of task.dependsOn) {
          const depResult = resultMap.get(depId);
          if (!depResult || !depResult.result) continue;

          ctx[depId] = depResult.result;

          // Auto-map: if the dependency result has a key that matches
          // one of this action's parameter names, inject it
          if (typeof depResult.result === "object" && depResult.result !== null) {
            for (const [key, value] of Object.entries(depResult.result)) {
              if (paramNames.has(key) && !(key in merged)) {
                merged[key] = value;
              }
            }
          }
        }

        merged._context = ctx;
        return merged;
      };

      // Execute ready tasks
      const executeTask = async (task: Task): Promise<TaskResult> => {
        const agentConfig = agents.get(task.agent);
        if (!agentConfig) {
          throw new Error(
            `Agent '${task.agent}' not found. Available: ${[...agents.keys()].join(", ")}`,
          );
        }

        const params = buildParams(task, agentConfig);

        this.events.taskStart(task);
        const label = `Task ${task.id} (${task.agent}.${task.action})`;
        this.events.log(`Starting: ${label}`);

        const start = Date.now();
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
          if (attempt > 0) {
            const delay = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
            this.events.log(
              `Retrying ${label} (attempt ${attempt + 1}/${this.maxRetries + 1}) after ${delay}ms`,
            );
            await new Promise((r) => setTimeout(r, delay));
          }

          try {
            const result = await withTimeout(
              agentConfig.agent.runAction(task.action, params),
              this.taskTimeout,
              label,
            );

            const taskResult: TaskResult = {
              taskId: task.id,
              agent: task.agent,
              action: task.action,
              result,
              duration: Date.now() - start,
              timestamp: Date.now(),
            };
            this.events.taskComplete(taskResult);
            this.events.log(
              `Completed: ${label} in ${taskResult.duration}ms`,
            );
            return taskResult;
          } catch (e) {
            lastError = e as Error;
            this.events.log(
              `Error in ${label} (attempt ${attempt + 1}): ${lastError.message}`,
            );
          }
        }

        // All retries exhausted
        const taskResult: TaskResult = {
          taskId: task.id,
          agent: task.agent,
          action: task.action,
          result: null,
          error: lastError!.message,
          duration: Date.now() - start,
          timestamp: Date.now(),
        };
        this.events.taskError(task, lastError!);
        this.events.log(`Failed: ${label} — ${lastError!.message}`);
        return taskResult;
      };

      let batch: TaskResult[];
      if (this.parallel && ready.length > 1) {
        const settled = await Promise.allSettled(ready.map(executeTask));
        batch = settled.map((s) =>
          s.status === "fulfilled"
            ? s.value
            : {
                taskId: "unknown",
                agent: "unknown",
                action: "unknown",
                result: null,
                error: (s.reason as Error).message,
                duration: 0,
                timestamp: Date.now(),
              },
        );
      } else {
        batch = [];
        for (const task of ready) {
          batch.push(await executeTask(task));
        }
      }

      for (const result of batch) {
        results.push(result);
        resultMap.set(result.taskId, result);
        completed.add(result.taskId);
        pending.delete(result.taskId);
      }
    }

    return results;
  }
}
