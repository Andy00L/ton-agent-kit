import { z } from "zod";
import { defineAction, fetchJson } from "@ton-agent-kit/core";

/** Nanotons in one TON. */
const NANOTONS_PER_TON = 1e9;

/** The fields this action reads off the TonAPI nominator pools endpoint. */
const NominatorPoolsResponse = z.object({
  pools: z
    .array(
      z.object({
        address: z.string().optional(),
        name: z.string().optional(),
        amount: z.union([z.string(), z.number()]).optional(),
        ready_withdraw: z.union([z.string(), z.number()]).optional(),
        pending_deposit: z.union([z.string(), z.number()]).optional(),
      }),
    )
    .optional(),
});

/** Render a nanoton amount that may arrive as a string or a number. */
function formatTon(amount: string | number | undefined): string {
  return (Number(amount ?? 0) / NANOTONS_PER_TON).toString() + " TON";
}

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
    const response = await fetchJson(
      `${apiBase}/staking/nominator/${encodeURIComponent(addr)}/pools`,
      NominatorPoolsResponse,
    );
    if (response.ok) {
      return {
        address: addr,
        pools: (response.value.pools ?? []).map((pool) => ({
          pool: pool.address,
          name: pool.name || "Unknown pool",
          amount: formatTon(pool.amount),
          readyWithdraw: formatTon(pool.ready_withdraw),
          pendingDeposit: formatTon(pool.pending_deposit),
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
