import { DynamicStructuredTool } from "@langchain/core/tools";
import { TonAgentKit, type Action } from "@ton-agent-kit/core";

/**
 * Create LangChain tools from a TonAgentKit instance.
 *
 * @example
 * ```ts
 * import { TonAgentKit } from "@ton-agent-kit/core";
 * import { createLangchainTools } from "@ton-agent-kit/langchain";
 * import TokenPlugin from "@ton-agent-kit/plugin-token";
 *
 * const agent = new TonAgentKit(wallet).use(TokenPlugin);
 * const tools = createLangchainTools(agent);
 *
 * // Use with LangChain agent
 * const llmAgent = createReactAgent({ llm, tools });
 * ```
 */
export function createLangchainTools(agent: TonAgentKit): DynamicStructuredTool[] {
  const actions = agent.getAvailableActions();

  return actions.map((action) => actionToLangchainTool(agent, action));
}

/**
 * Convert a single Action to a LangChain DynamicStructuredTool
 */
function actionToLangchainTool(agent: TonAgentKit, action: Action): DynamicStructuredTool {
  return new DynamicStructuredTool({
    name: action.name,
    description: action.description,
    schema: action.schema,
    func: async (params: any) => {
      try {
        const result = await agent.runAction(action.name, params);
        return typeof result === "string" ? result : JSON.stringify(result, null, 2);
      } catch (err) {
        const error = err as Error;
        return `Error executing ${action.name}: ${error.message}`;
      }
    },
  });
}

/**
 * Create LangChain tools from specific actions (subset)
 */
export function createLangchainToolsFromActions(
  agent: TonAgentKit,
  actionNames: string[]
): DynamicStructuredTool[] {
  const allActions = agent.getAvailableActions();
  const selected = allActions.filter((a) => actionNames.includes(a.name));

  if (selected.length !== actionNames.length) {
    const found = selected.map((a) => a.name);
    const missing = actionNames.filter((n) => !found.includes(n));
    throw new Error(`Actions not found: ${missing.join(", ")}`);
  }

  return selected.map((action) => actionToLangchainTool(agent, action));
}
