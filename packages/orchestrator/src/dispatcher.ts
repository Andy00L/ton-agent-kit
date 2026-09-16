import { toJSONSchema } from "zod";
import type { AgentConfig, Task, TaskResult, SwarmOptions } from "./types";
import type { EventBus } from "./events";

/**
 * Turn a caught value into a message without assuming it is an `Error`.
 *
 * `@ton-agent-kit/core` exports the same helper, but this package declares no
 * dependency on it and imports nothing from it, so three lines stay here rather
 * than pulling the whole SDK in for them.
 */
function describeSettlementError(caught: unknown): string {
  if (caught instanceof Error) return caught.message;
  if (typeof caught === "string") return caught;
  return String(caught);
}

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
   * Result fields of completed dependencies whose names match a parameter of
   * the action are auto-mapped into its params.
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
       * Build params for a task by auto-mapping dependency result fields to
       * matching parameter names. A _context bag used to be attached here as a
       * fallback, but runAction parses params through the action's zod schema
       * and zod strips unknown keys, so no handler ever received it.
       */
      const buildParams = (
        task: Task,
        agentConfig: AgentConfig,
      ): Record<string, any> => {
        if (!task.dependsOn || task.dependsOn.length === 0) return task.params;

        const paramNames = getActionParamNames(agentConfig, task.action);
        const merged = { ...task.params };

        for (const depId of task.dependsOn) {
          const depResult = resultMap.get(depId);
          if (!depResult || !depResult.result) continue;

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

        return merged;
      };

      // Execute ready tasks
      const executeTask = async (task: Task): Promise<TaskResult> => {
        const agentConfig = agents.get(task.agent);
        if (!agentConfig) {
          // Returned, never thrown. A rejection here used to arrive in the
          // batch as taskId "unknown", so pending.delete removed nothing, the
          // loop re-selected the same tasks forever and results grew without
          // bound. Measured at 148 s of CPU and 1.15 GB with two tasks naming
          // a missing agent.
          return {
            taskId: task.id,
            agent: task.agent,
            action: task.action,
            result: null,
            error: `Agent '${task.agent}' not found. Available: ${[...agents.keys()].join(", ")}`,
            duration: 0,
            timestamp: Date.now(),
          };
        }

        const params = buildParams(task, agentConfig);

        this.events.taskStart(task);
        const label = `Task ${task.id} (${task.agent}.${task.action})`;
        this.events.log(`Starting: ${label}`);

        const start = Date.now();
        let lastFailure = "no attempt ran";

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
          } catch (caught: unknown) {
            lastFailure = describeSettlementError(caught);
            this.events.log(
              `Error in ${label} (attempt ${attempt + 1}): ${lastFailure}`,
            );
          }
        }

        // All retries exhausted
        const taskResult: TaskResult = {
          taskId: task.id,
          agent: task.agent,
          action: task.action,
          result: null,
          error: lastFailure,
          duration: Date.now() - start,
          timestamp: Date.now(),
        };
        // A non-null assertion stood here. With maxRetries below zero the loop
        // body never runs, lastError stays null, and reading .message off it
        // throws out of a function whose whole job is to report failures.
        this.events.taskError(task, new Error(lastFailure));
        this.events.log(`Failed: ${label}, ${lastFailure}`);
        return taskResult;
      };

      let batch: TaskResult[];
      if (this.parallel && ready.length > 1) {
        const settled = await Promise.allSettled(ready.map(executeTask));
        batch = settled.map((settlement, index) => {
          if (settlement.status === "fulfilled") return settlement.value;
          // executeTask returns on every path it knows about, so reaching here
          // means something unforeseen threw. The id comes from the task that
          // was dispatched, never the string "unknown", because dropping it
          // leaves the task pending forever.
          const task = ready[index];
          return {
            taskId: task.id,
            agent: task.agent,
            action: task.action,
            result: null,
            error: describeSettlementError(settlement.reason),
            duration: 0,
            timestamp: Date.now(),
          };
        });
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
