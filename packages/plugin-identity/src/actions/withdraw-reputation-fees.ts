import { z } from "zod";
import { Address, internal, toNano } from "@ton/core";
import { defineAction, sendTransaction } from "@ton-agent-kit/core";
import { loadReputationConfig } from "../reputation-config";
import { buildWithdrawBody } from "../reputation-helpers";

export function createWithdrawReputationFeesAction(contractAddress?: string) {
  return defineAction({
    name: "withdraw_reputation_fees",
    description:
      "Withdraw accumulated fees from the on-chain Reputation contract. Only the contract owner (deployer) can call this.",
    schema: z.object({
      confirm: z.boolean().optional().describe("Set to true to confirm the withdrawal. Defaults to true."),
    }),
    handler: async (agent, _params) => {
      const addr = contractAddress || loadReputationConfig()?.contractAddress;
      if (!addr) {
        return {
          withdrawn: false,
          message: "No reputation contract deployed. Run deploy_reputation_contract first.",
        };
      }

      try {
        const body = buildWithdrawBody();

        await sendTransaction(agent, [
          internal({
            to: Address.parse(addr),
            value: toNano("0.02"),
            bounce: true,
            body,
          }),
        ]);

        return {
          withdrawn: true,
          contractAddress: addr,
          message: `Withdrawal sent to reputation contract ${addr.slice(0, 16)}...`,
        };
      } catch (err: any) {
        return {
          withdrawn: false,
          error: err.message,
          message: `Failed to withdraw: ${err.message}`,
        };
      }
    },
  });
}

export const withdrawReputationFeesAction = createWithdrawReputationFeesAction();
