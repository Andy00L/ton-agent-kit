import { z } from "zod";
import { Address, beginCell, internal, toNano } from "@ton/core";
import { defineAction, describeError, sendTransaction } from "@ton-agent-kit/core";
import { resolveContractAddress } from "../reputation-config";
import { storeWithdraw } from "../contracts/Reputation_Reputation";

export function createWithdrawReputationFeesAction(contractAddress?: string) {
  return defineAction({
    name: "withdraw_reputation_fees",
    description:
      "Withdraw accumulated fees from the on-chain Reputation contract. Only the contract owner (deployer) can call this.",
    schema: z.object({
      confirm: z.boolean().optional().describe("Set to true to confirm the withdrawal. Defaults to true."),
    }),
    handler: async (agent, _params) => {
      const addr = contractAddress || resolveContractAddress(undefined, agent.network);
      if (!addr) {
        return {
          withdrawn: false,
          message: "No reputation contract deployed. Run deploy_reputation_contract first.",
        };
      }

      try {
        const body = beginCell()
          .store(storeWithdraw({ $$type: "Withdraw" }))
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
          withdrawn: true,
          contractAddress: addr,
          message: `Withdrawal sent to reputation contract ${addr.slice(0, 16)}...`,
        };
      } catch (error: unknown) {
        const reason = describeError(error);
        return {
          withdrawn: false,
          error: reason,
          message: `Failed to withdraw: ${reason}`,
        };
      }
    },
  });
}

export const withdrawReputationFeesAction = createWithdrawReputationFeesAction();
