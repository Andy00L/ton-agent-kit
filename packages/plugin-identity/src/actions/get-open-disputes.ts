import { z } from "zod";
import { defineAction } from "@ton-agent-kit/core";
import { resolveContractAddress } from "../reputation-config";
import { callContractGetter, parseDisputeData } from "../reputation-helpers";

export const getOpenDisputesAction = defineAction({
  name: "get_open_disputes",
  description:
    "Get all open (unsettled) disputes from the reputation contract. Arbiters use this to find disputes they can join and vote on.",
  schema: z.object({
    limit: z.coerce.number().optional().describe("Max disputes to return. Default 20."),
  }),
  handler: async (agent, params) => {
    const addr = resolveContractAddress(undefined, agent.network);
    if (!addr) {
      return { disputes: [], count: 0, message: "No reputation contract configured" };
    }

    const apiBase = agent.network === "testnet"
      ? "https://testnet.tonapi.io/v2"
      : "https://tonapi.io/v2";

    const limit = params.limit || 20;

    const countRes = await callContractGetter(apiBase, addr, "disputeCount", undefined, agent.config.TONAPI_KEY);
    const totalDisputes = countRes?.stack?.[0]?.num ? Number(BigInt(countRes.stack[0].num)) : 0;

    if (totalDisputes === 0) {
      return { disputes: [], count: 0, total: 0, message: "No disputes registered" };
    }

    const disputes: any[] = [];
    let checked = 0;
    for (let i = totalDisputes - 1; i >= 0 && disputes.length < limit; i--) {
      try {
        const dataRes = await callContractGetter(apiBase, addr, "disputeData", [i.toString()], agent.config.TONAPI_KEY);
        if (dataRes?.stack) {
          const dispute = parseDisputeData(dataRes.stack);
          if (dispute && !dispute.settled) {
            disputes.push({
              index: i,
              escrowAddress: dispute.escrowAddress,
              depositor: dispute.depositor,
              beneficiary: dispute.beneficiary,
              amount: dispute.amount,
              votingDeadline: new Date(dispute.votingDeadline * 1000).toISOString(),
              isExpired: Date.now() / 1000 > dispute.votingDeadline,
            });
          }
        }
      } catch {}
      checked++;
      if (checked > 100) break;
    }

    return {
      disputes,
      count: disputes.length,
      total: totalDisputes,
      onChain: true,
      contractAddress: addr,
      message: `Found ${disputes.length} open dispute(s)`,
    };
  },
});
