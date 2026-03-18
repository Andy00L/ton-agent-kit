import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadAgentRegistry } from "../utils";
import { resolveContractAddress } from "../reputation-config";
import { callContractGetter, lookupAgentIndex, parseAgentDataFromStack } from "../reputation-helpers";

export function createDiscoverAgentAction(contractAddress?: string) {
  return defineAction({
    name: "discover_agent",
    description:
      "Find registered agents by capability or name. Searches both on-chain (if contract deployed) and local registry. Set includeOffline=true to include unavailable agents.",
    schema: z.object({
      capability: z
        .string()
        .optional()
        .describe("Capability to search for (e.g., 'price_feed', 'trading')"),
      name: z.string().optional().describe("Agent name to search for"),
      includeOffline: z
        .boolean()
        .optional()
        .describe("Include offline/unavailable agents. Defaults to false."),
    }),
    handler: async (agent, params) => {
      const addr = resolveContractAddress(contractAddress, agent.network);

      // ── Hybrid mode: JSON registry for discovery, on-chain for reputation ──
      const registry = loadAgentRegistry();
      let results = Object.values(registry);

      if (!params.includeOffline) {
        results = results.filter((a: any) => a.available !== false);
      }

      if (params.capability) {
        const cap = params.capability.toLowerCase();
        results = results.filter((a: any) =>
          a.capabilities.some((c: string) => c.toLowerCase().includes(cap)),
        );
      }

      if (params.name) {
        const name = params.name.toLowerCase();
        results = results.filter((a: any) => a.name.toLowerCase().includes(name));
      }

      // Enrich with on-chain reputation if contract is available
      if (addr) {
        const apiBase =
          agent.network === "testnet"
            ? "https://testnet.tonapi.io/v2"
            : "https://tonapi.io/v2";

        for (const a of results as any[]) {
          try {
            const idx = await lookupAgentIndex(apiBase, addr, a.name, agent.config.TONAPI_KEY);
            if (idx !== null) {
              const dataRes = await callContractGetter(
                apiBase, addr, "agentData", [idx.toString()], agent.config.TONAPI_KEY,
              );
              const parsed = parseAgentDataFromStack(dataRes?.stack);
              if (parsed) {
                const rep = parsed.totalTasks > 0
                  ? Math.round((parsed.successes / parsed.totalTasks) * 100)
                  : 0;
                a.reputation = { score: rep, totalTasks: parsed.totalTasks, successfulTasks: parsed.successes };
                a.onChain = true;
              }
            }
          } catch {
            // On-chain lookup failed for this agent — keep JSON data
          }
        }
      }

      return {
        query: { capability: params.capability, name: params.name, includeOffline: params.includeOffline },
        count: results.length,
        agents: results.map((a: any) => ({
          id: a.id,
          name: a.name,
          address: a.address,
          friendlyAddress: a.address ? toFriendlyAddress(Address.parse(a.address), agent.network) : "",
          capabilities: a.capabilities,
          available: a.available !== false,
          description: a.description,
          endpoint: a.endpoint,
          reputation: a.reputation,
          registeredAt: a.registeredAt,
          onChain: a.onChain || false,
        })),
        onChain: !!addr,
        contractAddress: addr || undefined,
      };
    },
  });
}

export const discoverAgentAction = createDiscoverAgentAction();
