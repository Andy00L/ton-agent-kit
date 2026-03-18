import { z } from "zod";
import { defineAction } from "@ton-agent-kit/core";
import { resolveContractAddress } from "../reputation-config";
import { callContractGetter } from "../reputation-helpers";

export const getAgentCleanupInfoAction = defineAction({
  name: "get_agent_cleanup_info",
  description:
    "Check if an agent is eligible for cleanup. Shows score, ratings count, last active date, and which cleanup condition would trigger removal. " +
    "Reasons: 1=bad_score (<20% with 100+ ratings), 2=inactive (30+ days), 3=ghost (0 ratings after 7 days).",
  schema: z.object({
    agentIndex: z.coerce.number().describe("Agent index to check"),
  }),
  handler: async (agent, params) => {
    const addr = resolveContractAddress(undefined, agent.network);
    if (!addr) {
      return { message: "No reputation contract configured" };
    }

    const apiBase = agent.network === "testnet"
      ? "https://testnet.tonapi.io/v2"
      : "https://tonapi.io/v2";

    const result = await callContractGetter(
      apiBase, addr, "agentCleanupInfo",
      [params.agentIndex.toString()],
      agent.config.TONAPI_KEY,
    );

    if (!result?.stack || result.stack.length === 0) {
      return { message: "Failed to read cleanup info" };
    }

    // agentCleanupInfo returns a struct as a tuple
    const stack = result.stack;
    let items = stack;
    if (stack[0]?.type === "tuple" && stack[0].tuple) {
      items = stack[0].tuple;
    }

    const parseNum = (item: any): number => {
      if (!item || item.type !== "num") return 0;
      const s = item.num as string;
      if (s.startsWith("-0x") || s.startsWith("-0X")) return Number(-BigInt(s.slice(1)));
      return Number(BigInt(s));
    };
    const parseBool = (item: any): boolean => {
      if (!item) return false;
      if (item.type === "num") {
        const s = item.num as string;
        if (s.startsWith("-0x")) return -BigInt(s.slice(1)) !== 0n;
        return BigInt(s) !== 0n;
      }
      return false;
    };

    const info = {
      index: parseNum(items[0]),
      exists: parseBool(items[1]),
      score: parseNum(items[2]),
      totalRatings: parseNum(items[3]),
      registeredAt: parseNum(items[4]),
      lastActive: parseNum(items[5]),
      daysSinceActive: parseNum(items[6]),
      daysSinceRegistered: parseNum(items[7]),
      eligibleForCleanup: parseBool(items[8]),
      cleanupReason: parseNum(items[9]),
    };

    const reasons: Record<number, string> = {
      0: "none — agent is healthy",
      1: "bad_score — score < 20% with 100+ ratings",
      2: "inactive — no activity for 30+ days",
      3: "ghost — 0 ratings after 7+ days since registration",
    };

    return {
      ...info,
      cleanupReasonText: reasons[info.cleanupReason] || "unknown",
      onChain: true,
      contractAddress: addr,
    };
  },
});
