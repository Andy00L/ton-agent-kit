import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, fetchJson, toFriendlyAddress } from "@ton-agent-kit/core";

/** The fields this action reads off the TonAPI account endpoint. */
const AccountResponse = z.object({
  address: z.string(),
  balance: z.union([z.string(), z.number()]).optional(),
  status: z.string().optional(),
  interfaces: z.array(z.string()).optional(),
  name: z.string().optional(),
  last_activity: z.number().optional(),
  is_wallet: z.boolean().optional(),
});

/** Nanotons in one TON. */
const NANOTONS_PER_TON = 1e9;

export const getWalletInfoAction = defineAction({
  name: "get_wallet_info",
  description:
    "Get detailed wallet information including status, balance, interfaces, and last activity.",
  schema: z.object({
    address: z
      .string()
      .optional()
      .describe("Wallet address. Defaults to agent's own."),
  }),
  handler: async (agent, params) => {
    const addr = params.address || agent.wallet.address.toRawString();
    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";

    const account = await fetchJson(
      `${apiBase}/accounts/${encodeURIComponent(addr)}`,
      AccountResponse,
    );
    if (!account.ok) {
      throw new Error(`Failed to fetch wallet info: ${account.reason}`);
    }

    const data = account.value;
    const parsedAddr = Address.parse(data.address);
    return {
      address: data.address,
      friendlyAddress: toFriendlyAddress(parsedAddr, agent.network),
      balance: (Number(data.balance ?? 0) / NANOTONS_PER_TON).toString() + " TON",
      status: data.status,
      interfaces: data.interfaces || [],
      name: data.name || null,
      lastActivity: data.last_activity
        ? new Date(data.last_activity * 1000).toISOString()
        : null,
      isWallet: data.is_wallet,
    };
  },
});
