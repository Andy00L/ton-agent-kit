import { z } from "zod";
import { defineAction } from "@ton-agent-kit/core";

export const getAccountsBulkAction = defineAction({
  name: "get_accounts_bulk",
  description:
    "Fetch info for multiple TON accounts in a single API call. Returns balance, status, last activity, and interfaces. Max 100 addresses.",
  schema: z.object({
    addresses: z
      .array(z.string())
      .min(1)
      .max(100)
      .describe("Array of TON addresses (raw or friendly). Max 100."),
  }),
  handler: async (agent, params) => {
    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";

    const addresses = params.addresses.map((a: string) => a.trim());

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (agent.config.TONAPI_KEY) {
      headers["Authorization"] = `Bearer ${agent.config.TONAPI_KEY}`;
    }

    const response = await fetch(`${apiBase}/accounts/_bulk`, {
      method: "POST",
      headers,
      body: JSON.stringify({ account_ids: addresses }),
    });

    if (!response.ok) {
      throw new Error(`Bulk request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawAccounts = data.accounts || data || [];

    const accounts = rawAccounts.map((acc: any) => {
      const balanceTON = acc.balance !== undefined
        ? (Number(acc.balance) / 1e9).toFixed(9)
        : "0";

      return {
        address: acc.address || acc.raw_address || "",
        rawAddress: acc.raw_address || acc.address || "",
        balance: balanceTON + " TON",
        balanceNano: acc.balance?.toString() || "0",
        status: acc.status || "unknown",
        lastActivity: acc.last_activity
          ? new Date(acc.last_activity * 1000).toISOString()
          : null,
        interfaces: acc.interfaces || [],
        name: acc.name || null,
        icon: acc.icon || null,
        isWallet: acc.interfaces?.some((i: string) => i.includes("wallet")) || false,
        isContract: acc.status === "active" && !acc.interfaces?.some((i: string) => i.includes("wallet")),
      };
    });

    const totalBalance = accounts.reduce(
      (sum: number, acc: any) => sum + parseFloat(acc.balance),
      0,
    );

    return {
      accounts,
      count: accounts.length,
      totalBalance: totalBalance.toFixed(4) + " TON",
      activeAccounts: accounts.filter((a: any) => a.status === "active").length,
      wallets: accounts.filter((a: any) => a.isWallet).length,
      contracts: accounts.filter((a: any) => a.isContract).length,
      bulkQuery: true,
      message: `Fetched ${accounts.length} account(s) in 1 API call. Total: ${totalBalance.toFixed(4)} TON.`,
    };
  },
});
