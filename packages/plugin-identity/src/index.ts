import { definePlugin } from "@ton-agent-kit/core";
import { registerAgentAction } from "./actions/register-agent";
import { discoverAgentAction } from "./actions/discover-agent";
import { getAgentReputationAction } from "./actions/get-agent-reputation";

/**
 * Identity Plugin — Agent registry, discovery, and reputation
 *
 * Actions:
 * - register_agent: Register an AI agent with capabilities
 * - discover_agent: Find agents by capability or name
 * - get_agent_reputation: Get/update agent reputation scores
 */
const IdentityPlugin = definePlugin({
  name: "identity",
  actions: [registerAgentAction, discoverAgentAction, getAgentReputationAction],
});

export default IdentityPlugin;

export { registerAgentAction, discoverAgentAction, getAgentReputationAction };
