import { z } from "zod";
import { Address, fromNano } from "@ton/core";
import { defineAction, type BalanceResult, toFriendlyAddress } from "@ton-agent-kit/core";

export const getBalanceAction = defineAction<{ address?: string }, BalanceResult>({
  name: "get_balance",
  description:
    "Get the TON balance of a wallet address. If no address is provided, returns the agent's own balance.",
  schema: z.object({
    address: z
      .string()
      .optional()
      .describe("TON address to check. Leave empty for agent's own balance."),
  }),
  handler: async (agent, params) => {
    const targetAddress = params.address
      ? Address.parse(params.address)
      : agent.wallet.address;

    const lastBlock = await (agent.connection as any).getLastBlock();
    const state = await (agent.connection as any).getAccount(
      lastBlock.last.seqno,
      targetAddress
    );

    const balanceRaw = state.account.balance.coins.toString();
    const balance = fromNano(state.account.balance.coins);

    return {
      balance,
      balanceRaw,
      address: targetAddress.toRawString(),
      friendlyAddress: toFriendlyAddress(targetAddress, agent.network),
    };
  },
  examples: [
    {
      input: {},
      output: { balance: "42.5", balanceRaw: "42500000000", address: "EQ..." },
      description: "Get agent's own balance",
    },
    {
      input: { address: "EQBx2CfDE..." },
      output: { balance: "100.0", balanceRaw: "100000000000", address: "EQBx2CfDE..." },
      description: "Get balance of a specific address",
    },
  ],
});
