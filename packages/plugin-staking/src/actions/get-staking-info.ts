import { z } from "zod";
import { defineAction } from "@ton-agent-kit/core";

export const getStakingInfoAction = defineAction({
  name: "get_staking_info",
  description: "Get staking pools and validator information on TON.",
  schema: z.object({
    address: z
      .string()
      .optional()
      .describe("Wallet to check staking for. Defaults to agent's own."),
  }),
  handler: async (agent, params) => {
    const addr = params.address || agent.wallet.address.toRawString();
    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";

    // Get staking info for this wallet
    const response = await fetch(
      `${apiBase}/staking/nominator/${encodeURIComponent(addr)}/pools`,
    );
    if (response.ok) {
      const data = await response.json();
      return {
        address: addr,
        pools: (data.pools || []).map((p: any) => ({
          pool: p.address,
          name: p.name || "Unknown pool",
          amount: (Number(p.amount) / 1e9).toString() + " TON",
          readyWithdraw: (Number(p.ready_withdraw) / 1e9).toString() + " TON",
          pendingDeposit:
            (Number(p.pending_deposit) / 1e9).toString() + " TON",
        })),
      };
    }

    return {
      address: addr,
      pools: [],
      message: "No staking positions found",
    };
  },
});
