import { readFileSync } from "fs";
import { toJSONSchema } from "zod";
import type { AgentConfig, Task } from "./types";

/**
 * Reads an env variable, falling back to parsing .env file directly.
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
 * Detects circular dependencies in a task graph.
 * Returns the cycle path if one is found, or null if the graph is acyclic.
 */
function detectCycle(tasks: Task[]): string[] | null {
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  function dfs(id: string, path: string[]): string[] | null {
    if (inStack.has(id)) return [...path, id];
    if (visited.has(id)) return null;
    visited.add(id);
    inStack.add(id);
    const task = taskMap.get(id);
    if (task?.dependsOn) {
      for (const dep of task.dependsOn) {
        const cycle = dfs(dep, [...path, id]);
        if (cycle) return cycle;
      }
    }
    inStack.delete(id);
    return null;
  }

  for (const task of tasks) {
    const cycle = dfs(task.id, []);
    if (cycle) return cycle;
  }
  return null;
}

/**
 * Validates a task plan against the registered agents.
 * Returns an array of error messages (empty if valid).
 */
function validatePlan(
  tasks: Task[],
  agents: Map<string, AgentConfig>,
  maxTasks: number,
): string[] {
  const errors: string[] = [];
  const taskIds = new Set(tasks.map((t) => t.id));

  if (tasks.length > maxTasks) {
    errors.push(
      `Plan has ${tasks.length} tasks, exceeding the safety limit of ${maxTasks}`,
    );
  }

  for (const task of tasks) {
    const agentConfig = agents.get(task.agent);
    if (!agentConfig) {
      errors.push(
        `Task '${task.id}' references unknown agent '${task.agent}'. Available agents: ${[...agents.keys()].join(", ")}`,
      );
      continue;
    }
    if (!agentConfig.capabilities.includes(task.action)) {
      errors.push(
        `Agent '${task.agent}' does not have action '${task.action}'. Available actions: ${agentConfig.capabilities.join(", ")}`,
      );
    }
    if (task.dependsOn) {
      for (const dep of task.dependsOn) {
        if (!taskIds.has(dep)) {
          errors.push(
            `Task '${task.id}' depends on unknown task '${dep}'. Valid task IDs: ${[...taskIds].join(", ")}`,
          );
        }
      }
    }
  }

  const cycle = detectCycle(tasks);
  if (cycle) {
    errors.push(`Circular dependency detected: ${cycle.join(" → ")}`);
  }

  return errors;
}

const SYSTEM_PROMPT = `You are a task planner for a multi-agent system on the TON blockchain.
Decompose the user's goal into subtasks that the available agents can execute.

Rules:
- Each task must have: id (string), agent (agent name), action (from that agent's capabilities), params (object).
- Optional: dependsOn (array of task IDs that must complete first), description (human-readable).
- Tasks WITHOUT dependsOn (or with empty dependsOn) can run in parallel.
- Tasks WITH dependsOn will wait for those tasks to complete before starting.
- Use the EXACT action names from the agent actions list.
- Each action lists its exact parameter names. You MUST use these exact names in params, not synonyms.
- Use sensible parameter values based on the goal.
- For optional parameters, omit them or use an empty object {} — NEVER use placeholder strings like "your_wallet_address" or "your_address". If an action checks the agent's own wallet, pass empty params {}.
- Return ONLY a JSON array of task objects. No markdown, no explanation, no code fences.`;

/**
 * Uses an LLM to decompose a natural language goal into a validated task plan.
 */
export class Planner {
  private apiKey: string;
  private baseURL: string | undefined;
  private model: string;

  constructor(opts?: {
    apiKey?: string;
    baseURL?: string;
    model?: string;
  }) {
    this.apiKey =
      opts?.apiKey ||
      process.env.OPENAI_API_KEY ||
      readEnvKey("OPENAI_API_KEY");
    this.baseURL = opts?.baseURL || process.env.OPENAI_BASE_URL;
    this.model = opts?.model || process.env.AI_MODEL || "gpt-4o";
  }

  /**
   * Decompose a goal into a validated task plan.
   * Retries once if the LLM output fails validation.
   */
  async plan(
    goal: string,
    agents: Map<string, AgentConfig>,
    maxTasks: number = 20,
  ): Promise<Task[]> {
    if (!this.apiKey) {
      throw new Error(
        "No API key found. Set OPENAI_API_KEY in .env or pass apiKey option.",
      );
    }

    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({
      apiKey: this.apiKey,
      ...(this.baseURL ? { baseURL: this.baseURL } : {}),
    });

    const agentDescriptions = [...agents.values()]
      .map((a) => {
        const actions = a.agent.getAvailableActions();
        const actionDetails = actions
          .map((act: any) => {
            const params = Object.keys(
              (toJSONSchema(act.schema) as any).properties || {},
            );
            const paramList = params.map((p: string) => '"' + p + '"').join(", ");
            return `    { name: "${act.name}", params: [${paramList}] }`;
          })
          .join(",\n");
        return `Agent "${a.name}" (${a.role}):\n  actions: [\n${actionDetails}\n  ]`;
      })
      .join("\n\n");

    const userPrompt = `Available agents:\n${agentDescriptions}\n\nGoal: ${goal}`;

    let lastErrors: string[] = [];

    for (let attempt = 0; attempt < 2; attempt++) {
      const messages: Array<{ role: "system" | "user"; content: string }> = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ];

      if (attempt > 0 && lastErrors.length > 0) {
        messages.push({
          role: "user",
          content: `Your previous plan had errors:\n${lastErrors.join("\n")}\n\nPlease fix these errors and return a corrected JSON array.`,
        });
      }

      const response = await client.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0,
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("Planner received empty response from LLM");
      }

      let tasks: Task[];
      try {
        // Strip markdown code fences if present
        const cleaned = content
          .replace(/^```(?:json)?\s*/m, "")
          .replace(/\s*```$/m, "")
          .trim();
        tasks = JSON.parse(cleaned);

        // Strip placeholder strings the LLM may have invented
        for (const task of tasks) {
          for (const [key, value] of Object.entries(task.params || {})) {
            if (
              typeof value === "string" &&
              (value.includes("your_") ||
                value.includes("placeholder") ||
                (value.includes("_address") &&
                  !value.startsWith("0:") &&
                  !value.startsWith("EQ") &&
                  !value.startsWith("UQ") &&
                  !value.startsWith("0Q")))
            ) {
              delete task.params[key];
            }
          }
        }
      } catch (e) {
        lastErrors = [
          `Failed to parse LLM response as JSON: ${(e as Error).message}. Raw response: ${content.slice(0, 200)}`,
        ];
        continue;
      }

      if (!Array.isArray(tasks)) {
        lastErrors = ["LLM response is not a JSON array"];
        continue;
      }

      const errors = validatePlan(tasks, agents, maxTasks);
      if (errors.length === 0) {
        return tasks;
      }

      lastErrors = errors;
    }

    throw new Error(
      `Planner failed after 2 attempts. Last errors:\n${lastErrors.join("\n")}`,
    );
  }
}
