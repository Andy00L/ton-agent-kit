import { z } from "zod";
import { Address, beginCell, internal, toNano } from "@ton/core";
import { defineAction, describeError, toFriendlyAddress, sendTransaction } from "@ton-agent-kit/core";
import { loadAgentRegistry, saveAgentRegistry } from "../utils";
import { resolveContractAddress } from "../reputation-config";
import { storeRegister } from "../contracts/Reputation_Reputation";

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

      // The model sends a real array, a JSON array, or a comma separated
      // list. JSON.parse returns unknown, so anything that is not an array of
      // strings falls back to the comma split instead of reaching
      // capabilities.join below, which throws on an object or a number.
      let capabilities: string[];
      if (typeof params.capabilities === "string") {
        let decoded: unknown = null;
        try {
          decoded = JSON.parse(params.capabilities);
        } catch {
          decoded = null;
        }
        const asStringList = z.array(z.string()).safeParse(decoded);
        capabilities = asStringList.success
          ? asStringList.data
          : params.capabilities
              .split(",")
              .map((capability) => capability.trim())
              .filter((capability) => capability.length > 0);
      } else {
        capabilities = params.capabilities;
      }

      const available = params.available !== false;

      // Resolve contract address (factory → config → default → null)
      const addr = resolveContractAddress(contractAddress, agent.network);

      // Always save to JSON registry: the contract stores neither names nor capabilities, so discovery needs it
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
          const body = beginCell()
            .store(
              storeRegister({
                $$type: "Register",
                name: params.name,
                capabilities: capabilities.join(","),
                available,
              }),
            )
            .endCell();

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
        } catch (error: unknown) {
          // On-chain failed but the JSON registry saved, so report partial success
          return {
            agentId,
            name: params.name,
            address: agent.wallet.address.toRawString(),
            friendlyAddress: toFriendlyAddress(agent.wallet.address, agent.network),
            capabilities,
            available,
            onChain: false,
            status: "registered (local only, on-chain failed)",
            message: `Agent "${params.name}" saved locally. On-chain registration failed: ${describeError(error).slice(0, 80)}`,
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
