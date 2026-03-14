import { tool } from "ai";
import { TonAgentKit, type Action } from "@ton-agent-kit/core";

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
  agent: TonAgentKit
): Record<string, ReturnType<typeof tool>> {
  const actions = agent.getAvailableActions();
  const tools: Record<string, ReturnType<typeof tool>> = {};

  for (const action of actions) {
    tools[action.name] = tool({
      description: action.description,
      parameters: action.schema,
      execute: async (params: any) => {
        return agent.runAction(action.name, params);
      },
    });
  }

  return tools;
}

/**
 * Create OpenAI-compatible function definitions for manual integration
 */
export function createOpenAITools(agent: TonAgentKit) {
  const { toJSONSchema } = require("zod");

  return agent.getAvailableActions().map((action) => ({
    type: "function" as const,
    function: {
      name: action.name,
      description: action.description,
      parameters: toJSONSchema(action.schema),
    },
  }));
}
