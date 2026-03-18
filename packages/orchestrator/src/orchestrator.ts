import { readFileSync } from "fs";
import type { AgentConfig, SwarmOptions, SwarmResult } from "./types";
import { Planner } from "./planner";
import { Dispatcher } from "./dispatcher";
import { EventBus } from "./events";

/**
 * Reads an env variable, falling back to parsing .env file directly.
 *
 * @param key - The environment variable name to look up
 * @returns The value of the variable, or an empty string if not found
 * @since 1.0.0
 */
function readEnvKey(key: string): string {
  try {
    return (
      readFileSync(".env", "utf-8")
        .split("\n")
        .find((l) => l.startsWith(key + "="))
        ?.slice(key.length + 1)
        .trim() || ""
    );
  } catch {
    return "";
  }
}

/**
 * Multi-agent orchestrator for TON blockchain.
 *
 * Register N specialized agents, then call `.swarm(goal)` to have an LLM
 * decompose the goal into subtasks, execute them with parallel scheduling
 * and dependency resolution, and return an aggregated result with summary.
 *
 * @example
 * ```ts
 * const orch = new Orchestrator()
 *   .agent("wallet", "manages balances", walletAgent)
 *   .agent("defi", "handles swaps", defiAgent);
 *
 * const result = await orch.swarm("Check my balance and swap 1 TON for USDT");
 * console.log(result.summary);
 * ```
 *
 * @since 1.0.0
 */
export class Orchestrator {
  private agents: Map<string, AgentConfig> = new Map();
  private apiKey: string;
  private baseURL: string | undefined;
  private model: string;

  /**
   * Creates a new Orchestrator instance for coordinating multi-agent swarms.
   *
   * @param opts - Optional configuration for the LLM backend
   * @param opts.apiKey - OpenAI-compatible API key (falls back to OPENAI_API_KEY env var or .env file)
   * @param opts.baseURL - Custom base URL for the LLM API (falls back to OPENAI_BASE_URL env var)
   * @param opts.model - LLM model identifier (falls back to AI_MODEL env var, defaults to "gpt-4o")
   * @since 1.0.0
   */
  constructor(opts?: { apiKey?: string; baseURL?: string; model?: string }) {
    this.apiKey =
      opts?.apiKey ||
      process.env.OPENAI_API_KEY ||
      readEnvKey("OPENAI_API_KEY");
    this.baseURL = opts?.baseURL || process.env.OPENAI_BASE_URL;
    this.model = opts?.model || process.env.AI_MODEL || "gpt-4o";
  }

  /**
   * Register an agent with the orchestrator.
   * Capabilities are auto-extracted from `agentInstance.getAvailableActions()`.
   *
   * @param name - Unique name for this agent (used in task plans)
   * @param role - Description of what this agent does (used by the planner LLM)
   * @param agentInstance - A TonAgentKit instance with plugins already registered
   * @returns this (chainable)
   * @throws {Error} If the agent has no available actions
   * @since 1.0.0
   */
  agent(name: string, role: string, agentInstance: any): this {
    const actions = agentInstance.getAvailableActions();
    const capabilities = actions.map((a: any) => a.name);

    if (capabilities.length === 0) {
      throw new Error(
        `Agent '${name}' has no available actions. Did you forget to call .use(plugin)?`,
      );
    }

    this.agents.set(name, {
      name,
      role,
      agent: agentInstance,
      capabilities,
    });

    return this;
  }

  /**
   * Execute a multi-agent swarm: decompose a goal into tasks, execute them
   * with parallel scheduling, and return aggregated results with a summary.
   *
   * @param goal - Natural language description of what to accomplish
   * @param options - Execution options (timeouts, retries, callbacks, etc.)
   * @returns Aggregated swarm result with plan, results, and summary
   * @throws {Error} If no agents have been registered
   * @since 1.0.0
   */
  async swarm(goal: string, options?: SwarmOptions): Promise<SwarmResult> {
    if (this.agents.size === 0) {
      throw new Error(
        "No agents registered. Call .agent() before .swarm().",
      );
    }

    const opts: SwarmOptions = {
      apiKey: this.apiKey,
      baseURL: this.baseURL,
      model: this.model,
      maxRetries: 2,
      taskTimeout: 30_000,
      maxTasks: 20,
      parallel: true,
      verbose: false,
      ...options,
    };

    const events = new EventBus(opts);
    const startTime = Date.now();

    // 1. Plan
    events.log(`Planning: "${goal}"`);
    const planner = new Planner({
      apiKey: opts.apiKey,
      baseURL: opts.baseURL,
      model: opts.model,
    });
    const plan = await planner.plan(goal, this.agents, opts.maxTasks);
    events.log(`Plan ready: ${plan.length} tasks`);
    events.planReady(plan);

    // 2. Dispatch
    const dispatcher = new Dispatcher(opts, events);
    const results = await dispatcher.dispatch(plan, this.agents);
    events.complete(results);

    // 3. Summarize
    const summary = await this.summarize(goal, results, opts);
    const totalDuration = Date.now() - startTime;

    const agentsUsed = [...new Set(results.map((r) => r.agent))];
    const tasksCompleted = results.filter((r) => !r.error).length;
    const tasksFailed = results.filter((r) => r.error).length;

    events.log(
      `Done: ${tasksCompleted} completed, ${tasksFailed} failed in ${totalDuration}ms`,
    );

    return {
      goal,
      plan,
      results,
      summary,
      totalDuration,
      agentsUsed,
      tasksCompleted,
      tasksFailed,
    };
  }

  /**
   * Get all registered agent configurations.
   *
   * @returns An array of all registered {@link AgentConfig} objects
   * @since 1.0.0
   */
  getAgents(): AgentConfig[] {
    return [...this.agents.values()];
  }

  /**
   * Remove a registered agent by name.
   *
   * @param name - The unique name of the agent to remove
   * @returns this (chainable)
   * @since 1.0.0
   */
  removeAgent(name: string): this {
    this.agents.delete(name);
    return this;
  }

  /**
   * Call LLM to generate a natural language summary of the swarm results.
   *
   * @param goal - The original natural language goal
   * @param results - Array of task results to summarize
   * @param opts - Swarm options containing LLM configuration
   * @returns A human-readable summary string; falls back to a generic message on LLM failure
   * @since 1.0.0
   */
  private async summarize(
    goal: string,
    results: import("./types").TaskResult[],
    opts: SwarmOptions,
  ): Promise<string> {
    try {
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({
        apiKey: opts.apiKey,
        ...(opts.baseURL ? { baseURL: opts.baseURL } : {}),
      });

      const resultsText = results
        .map((r) =>
          r.error
            ? `- ${r.agent}.${r.action}: FAILED — ${r.error}`
            : `- ${r.agent}.${r.action}: ${JSON.stringify(r.result)}`,
        )
        .join("\n");

      const response = await client.chat.completions.create({
        model: opts.model || this.model,
        messages: [
          {
            role: "system",
            content:
              "You are a concise assistant. Summarize the results of a multi-agent task execution on the TON blockchain. Be brief and factual.",
          },
          {
            role: "user",
            content: `Goal: ${goal}\n\nResults:\n${resultsText}\n\nProvide a brief summary of what was accomplished.`,
          },
        ],
        temperature: 0,
      });

      return (
        response.choices[0]?.message?.content?.trim() ||
        "Swarm completed but summary generation failed."
      );
    } catch {
      // If summary fails, don't break the whole result
      const completed = results.filter((r) => !r.error).length;
      const failed = results.filter((r) => r.error).length;
      return `Swarm completed: ${completed} tasks succeeded, ${failed} failed.`;
    }
  }
}
