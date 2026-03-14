import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadAgentRegistry, saveAgentRegistry } from "../utils";

export const getAgentReputationAction = defineAction({
  name: "get_agent_reputation",
  description:
    "Get the reputation score of a registered agent. Set addTask=true and success=true to record a successful task. Set addTask=true and success=false to record a failed task.",
  schema: z.object({
    agentId: z.string().describe("Agent ID to check or update"),
    addTask: z
      .union([z.boolean(), z.string().transform((s) => s === "true")])
      .optional()
      .describe("Set to true to record a completed task"),
    success: z
      .union([z.boolean(), z.string().transform((s) => s === "true")])
      .optional()
      .describe("If addTask is true, whether the task was successful"),
  }),
  handler: async (agent, params) => {
    const registry = loadAgentRegistry();
    const agentRecord = registry[params.agentId];
    if (!agentRecord) throw new Error(`Agent not found: ${params.agentId}`);

    // Update reputation if recording a task
    if (params.addTask) {
      agentRecord.reputation.totalTasks += 1;
      if (params.success !== false) {
        agentRecord.reputation.successfulTasks += 1;
      }
      agentRecord.reputation.score = Math.round(
        (agentRecord.reputation.successfulTasks /
          agentRecord.reputation.totalTasks) *
          100,
      );
      saveAgentRegistry(registry);
    }

    return {
      agentId: params.agentId,
      name: agentRecord.name,
      address: agentRecord.address,
      friendlyAddress: toFriendlyAddress(Address.parse(agentRecord.address), agent.network),
      reputation: agentRecord.reputation,
      registeredAt: agentRecord.registeredAt,
    };
  },
});
