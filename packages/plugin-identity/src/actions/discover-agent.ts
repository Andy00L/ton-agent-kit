import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadAgentRegistry } from "../utils";

export const discoverAgentAction = defineAction({
  name: "discover_agent",
  description:
    "Find registered agents by capability or name. Search the local agent registry to find agents that can perform specific tasks.",
  schema: z.object({
    capability: z
      .string()
      .optional()
      .describe("Capability to search for (e.g., 'price_feed', 'trading')"),
    name: z.string().optional().describe("Agent name to search for"),
  }),
  handler: async (agent, params) => {
    const registry = loadAgentRegistry();
    let results = Object.values(registry);

    if (params.capability) {
      const cap = params.capability.toLowerCase();
      results = results.filter((a: any) =>
        a.capabilities.some((c: string) => c.toLowerCase().includes(cap)),
      );
    }

    if (params.name) {
      const name = params.name.toLowerCase();
      results = results.filter((a: any) =>
        a.name.toLowerCase().includes(name),
      );
    }

    return {
      query: { capability: params.capability, name: params.name },
      count: results.length,
      agents: results.map((a: any) => ({
        id: a.id,
        name: a.name,
        address: a.address,
        friendlyAddress: toFriendlyAddress(Address.parse(a.address), agent.network),
        capabilities: a.capabilities,
        description: a.description,
        endpoint: a.endpoint,
        reputation: a.reputation,
        registeredAt: a.registeredAt,
      })),
    };
  },
});
