import { tool, type CoreTool } from "ai";
import { toJSONSchema } from "zod";
import { TonAgentKit } from "@ton-agent-kit/core";

/**
 * Create Vercel AI SDK tools from a TonAgentKit instance.
 *
 * @example
 * ```ts
 * import { createVercelAITools } from "@ton-agent-kit/ai-tools";
 * import { generateText } from "ai";
 * import { openai } from "@ai-sdk/openai";
 *
 * const tools = createVercelAITools(agent);
 * const result = await generateText({
 *   model: openai("gpt-4o-mini"),
 *   tools,
 *   prompt: "Check my TON balance",
 * });
 * ```
 */
export function createVercelAITools(
  agent: TonAgentKit,
): Record<string, CoreTool> {
  const actions = agent.getAvailableActions();
  const tools: Record<string, CoreTool> = {};

  for (const action of actions) {
    tools[action.name] = tool({
      description: action.description,
      parameters: action.schema,
      // The SDK hands back whatever the schema validated. runAction re-validates
      // it against the same schema, so the action still owns its own contract.
      execute: async (params: unknown) => agent.runAction(action.name, params),
    });
  }

  return tools;
}

/**
 * Create OpenAI-compatible function definitions for manual integration
 */
export function createOpenAITools(agent: TonAgentKit) {
  return agent.getAvailableActions().map((action) => ({
    type: "function" as const,
    function: {
      name: action.name,
      description: action.description,
      parameters: toJSONSchema(action.schema),
    },
  }));
}
