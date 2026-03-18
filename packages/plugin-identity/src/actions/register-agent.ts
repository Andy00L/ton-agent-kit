import { z } from "zod";
import { Address, internal, toNano } from "@ton/core";
import { defineAction, toFriendlyAddress, sendTransaction } from "@ton-agent-kit/core";
import { loadAgentRegistry, saveAgentRegistry } from "../utils";
import { resolveContractAddress } from "../reputation-config";
import { buildRegisterBody } from "../reputation-helpers";

export function createRegisterAgentAction(contractAddress?: string) {
  return defineAction({
    name: "register_agent",
    description:
      "Register an AI agent with its capabilities, name, and description. Other agents can discover it via discover_agent. Supports both on-chain (Tact contract) and local JSON modes.",
    schema: z.object({
      name: z
        .string()
        .describe("Agent name (e.g., 'market-data', 'trading-bot')"),
      capabilities: z
        .union([z.array(z.string()), z.string()])
        .describe("List of capabilities (e.g., ['price_feed', 'analytics', 'trading'])"),
      description: z.string().optional().describe("Human-readable description of the agent"),
      endpoint: z.string().optional().describe("API endpoint where the agent can be reached"),
      available: z
        .boolean()
        .optional()
        .describe("Whether the agent is currently available. Defaults to true."),
    }),
    handler: async (agent, params) => {
      const agentId = `agent_${params.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

      // Coerce capabilities
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

      const available = params.available !== false;

      // Resolve contract address (factory → config → default → null)
      const addr = resolveContractAddress(contractAddress, agent.network);

      // Always save to JSON registry (needed for discovery — contract doesn't store names/capabilities)
      const agentRecord = {
        id: agentId,
        name: params.name,
        address: agent.wallet.address.toRawString(),
        capabilities,
        description: params.description || "",
        endpoint: params.endpoint || null,
        available,
        network: agent.network,
        registeredAt: new Date().toISOString(),
        reputation: { score: 0, totalTasks: 0, successfulTasks: 0 },
      };

      const registry = loadAgentRegistry();
      registry[agentId] = agentRecord;
      saveAgentRegistry(registry);

      // ── On-chain mode ──
      if (addr) {
        try {
          const capStr = capabilities.join(",");
          const body = buildRegisterBody(params.name, capStr, available);

          await sendTransaction(agent, [
            internal({
              to: Address.parse(addr),
              value: toNano("0.12"),
              bounce: true,
              body,
            }),
          ]);

          return {
            agentId,
            name: params.name,
            address: agent.wallet.address.toRawString(),
            friendlyAddress: toFriendlyAddress(agent.wallet.address, agent.network),
            capabilities,
            available,
            onChain: true,
            contractAddress: addr,
            status: "registered (on-chain + local)",
            message: `Agent "${params.name}" registered on-chain at ${addr.slice(0, 16)}... and locally`,
          };
        } catch (err: any) {
          // On-chain failed but JSON saved — return partial success
          return {
            agentId,
            name: params.name,
            address: agent.wallet.address.toRawString(),
            friendlyAddress: toFriendlyAddress(agent.wallet.address, agent.network),
            capabilities,
            available,
            onChain: false,
            status: "registered (local only — on-chain failed)",
            message: `Agent "${params.name}" saved locally. On-chain registration failed: ${err.message?.slice(0, 80)}`,
          };
        }
      }

      // ── JSON-only mode ──
      return {
        agentId,
        name: params.name,
        address: agent.wallet.address.toRawString(),
        friendlyAddress: toFriendlyAddress(agent.wallet.address, agent.network),
        capabilities,
        available,
        onChain: false,
        description: params.description || "",
        status: "registered",
        dnsHint: `${params.name}.agents.ton (requires TON DNS domain)`,
      };
    },
  });
}

export const registerAgentAction = createRegisterAgentAction();
