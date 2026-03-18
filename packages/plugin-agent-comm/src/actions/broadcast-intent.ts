import { z } from "zod";
import { Address, toNano, fromNano, beginCell, internal } from "@ton/core";
import { defineAction, sendTransaction } from "@ton-agent-kit/core";
import { resolveContractAddress } from "../../../plugin-identity/src/reputation-config";
import { callContractGetter } from "../../../plugin-identity/src/reputation-helpers";
import { storeBroadcastIntent } from "../../../plugin-identity/src/contracts/Reputation_Reputation";
import { createHash } from "crypto";

function computeServiceHash(service: string): bigint {
  return BigInt("0x" + createHash("sha256").update(service).digest("hex"));
}

export const broadcastIntentAction = defineAction({
  name: "broadcast_intent",
  description:
    "Broadcast an intent on-chain to request a service from other agents. Other agents can discover this intent and send offers. The service name is hashed (SHA-256) before being stored on-chain.",
  schema: z.object({
    service: z.string().describe("Service name to request (e.g., 'price_feed', 'translation', 'code_review')"),
    budget: z.string().describe("Maximum budget in TON (e.g., '1.5')"),
    deadlineMinutes: z.number().optional().describe("Deadline in minutes from now"),
    deadlineHours: z.number().optional().describe("Deadline in hours from now (default: 1 hour if neither deadline is set)"),
    requirements: z.string().optional().describe("Human-readable requirements (stored locally, not on-chain)"),
  }),
  handler: async (agent, params) => {
    const contractAddr = resolveContractAddress(undefined, agent.network);
    if (!contractAddr) {
      return { message: "No reputation contract configured" };
    }

    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";

    try {
      const serviceHash = computeServiceHash(params.service);

      // Compute deadline timestamp
      let deadlineMs: number;
      if (params.deadlineMinutes) {
        deadlineMs = Date.now() + params.deadlineMinutes * 60 * 1000;
      } else if (params.deadlineHours) {
        deadlineMs = Date.now() + params.deadlineHours * 60 * 60 * 1000;
      } else {
        deadlineMs = Date.now() + 1 * 60 * 60 * 1000; // default 1 hour
      }
      const deadlineUnix = Math.floor(deadlineMs / 1000);

      const body = beginCell()
        .store(
          storeBroadcastIntent({
            $$type: "BroadcastIntent",
            serviceHash: serviceHash,
            budget: toNano(params.budget),
            deadline: BigInt(deadlineUnix),
          })
        )
        .endCell();

      await sendTransaction(agent, [
        internal({
          to: Address.parse(contractAddr),
          value: toNano("0.12"),
          bounce: true,
          body,
        }),
      ]);

      // Wait for on-chain confirmation then read intentCount to get the index
      await new Promise((resolve) => setTimeout(resolve, 8000));

      let intentIndex = -1;
      let onChainError: string | null = null;
      try {
        const countRes = await callContractGetter(
          apiBase,
          contractAddr,
          "intentCount",
          [],
          agent.config.TONAPI_KEY
        );
        if (countRes?.stack?.[0]?.num) {
          const raw = countRes.stack[0].num;
          intentIndex = Number(BigInt(raw.startsWith("-0x") ? "-" + raw.slice(1) : raw)) - 1;
        } else {
          onChainError = "Contract getter returned no data — contract may be frozen or nonexistent";
        }
      } catch (e: any) {
        onChainError = `Contract unreachable: ${e.message?.slice(0, 100)}`;
      }

      return {
        intentIndex,
        service: params.service,
        serviceHash: "0x" + serviceHash.toString(16),
        budget: params.budget,
        deadline: new Date(deadlineMs).toISOString(),
        requirements: params.requirements || null,
        status: intentIndex >= 0 ? "open" : "failed",
        onChain: intentIndex >= 0,
        onChainError,
        contractAddress: contractAddr,
      };
    } catch (err: any) {
      return {
        broadcast: false,
        error: err.message,
        message: `Failed to broadcast intent: ${err.message}`,
      };
    }
  },
});
