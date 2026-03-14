import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";

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
    const response = await fetch(
      `${apiBase}/accounts/${encodeURIComponent(addr)}`,
    );
    if (!response.ok)
      throw new Error(`Failed to fetch wallet info: ${response.status}`);
    const data = await response.json();
    const parsedAddr = Address.parse(data.address);
    return {
      address: data.address,
      friendlyAddress: toFriendlyAddress(parsedAddr, agent.network),
      balance: (Number(data.balance) / 1e9).toString() + " TON",
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
