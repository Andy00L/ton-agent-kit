import { z } from "zod";
import { Address, internal, toNano } from "@ton/core";
import { defineAction, toFriendlyAddress, sendTransaction } from "@ton-agent-kit/core";
import { loadAgentRegistry, saveAgentRegistry } from "../utils";
import { resolveContractAddress } from "../reputation-config";
import { buildRateBody, callContractGetter, lookupAgentIndex, parseAgentDataFromStack } from "../reputation-helpers";

export function createGetAgentReputationAction(contractAddress?: string) {
  return defineAction({
    name: "get_agent_reputation",
    description:
      "Get the reputation score of a registered agent. Set addTask=true and success=true/false to record a task result. Works both on-chain and locally.",
    schema: z.object({
      agentId: z.string().describe("Agent ID or name to check or update"),
      addTask: z
        .union([z.boolean(), z.string()])
        .optional()
        .describe("Set to true to record a completed task"),
      success: z
        .union([z.boolean(), z.string()])
        .optional()
        .describe("If addTask is true, whether the task was successful"),
    }),
    handler: async (agent, params) => {
      const addTask = typeof params.addTask === "string" ? params.addTask === "true" : params.addTask;
      const success = typeof params.success === "string" ? params.success === "true" : params.success;

      const addr = resolveContractAddress(contractAddress, agent.network);

      // ── On-chain mode ──
      if (addr) {
        try {
          const apiBase =
            agent.network === "testnet"
              ? "https://testnet.tonapi.io/v2"
              : "https://tonapi.io/v2";

          // Get the actual agent name for on-chain lookup
          // Prefer JSON registry (has the exact name used at registration)
          const jsonRegistry = loadAgentRegistry();
          const jsonRecord = jsonRegistry[params.agentId];
          const agentName = jsonRecord?.name
            || (params.agentId.startsWith("agent_") ? params.agentId.slice(6) : params.agentId);

          // If rating, send Rate message
          if (addTask) {
            const body = buildRateBody(agentName, success !== false);

            await sendTransaction(agent, [
              internal({
                to: Address.parse(addr),
                value: toNano("0.12"),
                bounce: true,
                body,
              }),
            ]);
          }

          // Look up agent index by name hash
          const idx = await lookupAgentIndex(apiBase, addr, agentName, agent.config.TONAPI_KEY);

          if (idx !== null) {
            // Get on-chain data using index
            const dataRes = await callContractGetter(
              apiBase, addr, "agentData", [idx.toString()], agent.config.TONAPI_KEY,
            );
            const repRes = await callContractGetter(
              apiBase, addr, "agentReputation", [idx.toString()], agent.config.TONAPI_KEY,
            );

            const agentData = dataRes?.stack ? parseAgentDataFromStack(dataRes.stack) : null;
            const repScore = repRes?.stack?.[0]?.num
              ? Number(BigInt(repRes.stack[0].num))
              : 0;

            return {
              agentId: params.agentId,
              name: agentName,
              reputation: {
                score: repScore,
                totalTasks: agentData?.totalTasks || 0,
                successfulTasks: agentData?.successes || 0,
              },
              available: agentData?.available ?? true,
              onChain: true,
              contractAddress: addr,
            };
          }

          // Agent not found on-chain — fall through to JSON
        } catch {
          // Fall through to JSON
        }
      }

      // ── JSON fallback mode ──
      const registry = loadAgentRegistry();
      const agentRecord = registry[params.agentId];
      if (!agentRecord) throw new Error(`Agent not found: ${params.agentId}`);

      if (addTask) {
        agentRecord.reputation.totalTasks += 1;
        if (success !== false) {
          agentRecord.reputation.successfulTasks += 1;
        }
        agentRecord.reputation.score = Math.round(
          (agentRecord.reputation.successfulTasks / agentRecord.reputation.totalTasks) * 100,
        );
        saveAgentRegistry(registry);
      }

      return {
        agentId: params.agentId,
        name: agentRecord.name,
        address: agentRecord.address,
        friendlyAddress: toFriendlyAddress(Address.parse(agentRecord.address), agent.network),
        reputation: agentRecord.reputation,
        available: agentRecord.available !== false,
        onChain: false,
        registeredAt: agentRecord.registeredAt,
      };
    },
  });
}

export const getAgentReputationAction = createGetAgentReputationAction();
