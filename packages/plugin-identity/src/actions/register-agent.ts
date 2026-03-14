import { z } from "zod";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadAgentRegistry, saveAgentRegistry } from "../utils";

export const registerAgentAction = defineAction({
  name: "register_agent",
  description:
    "Register an AI agent in the local agent registry with its capabilities, name, and description. Other agents can discover it via discover_agent.",
  schema: z.object({
    name: z
      .string()
      .describe("Agent name (e.g., 'market-data', 'trading-bot')"),
    capabilities: z
      .union([z.array(z.string()), z.string()])
      .describe(
        "List of capabilities (e.g., ['price_feed', 'analytics', 'trading'])",
      ),
    description: z
      .string()
      .optional()
      .describe("Human-readable description of the agent"),
    endpoint: z
      .string()
      .optional()
      .describe("API endpoint where the agent can be reached"),
  }),
  handler: async (agent, params) => {
    const agentId = `agent_${params.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

    // Coerce string capabilities to array
    let capabilities: string[];
    if (typeof params.capabilities === "string") {
      try {
        capabilities = JSON.parse(params.capabilities);
      } catch {
        capabilities = params.capabilities.split(",").map((c: string) => c.trim());
      }
    } else {
      capabilities = params.capabilities;
    }

    const agentRecord = {
      id: agentId,
      name: params.name,
      address: agent.wallet.address.toRawString(),
      capabilities,
      description: params.description || "",
      endpoint: params.endpoint || null,
      network: agent.network,
      registeredAt: new Date().toISOString(),
      reputation: { score: 0, totalTasks: 0, successfulTasks: 0 },
    };

    const registry = loadAgentRegistry();
    registry[agentId] = agentRecord;
    saveAgentRegistry(registry);

    return {
      agentId,
      name: params.name,
      address: agent.wallet.address.toRawString(),
      friendlyAddress: toFriendlyAddress(agent.wallet.address, agent.network),
      capabilities,
      description: params.description || "",
      status: "registered",
      dnsHint: `${params.name}.agents.ton (requires TON DNS domain)`,
    };
  },
});
