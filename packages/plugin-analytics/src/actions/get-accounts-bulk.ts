import { z } from "zod";
import { defineAction, fetchJson } from "@ton-agent-kit/core";
import { nanotonsToTonNumber } from "../tonapi-schemas";

/** The fields this action reads off each account in a bulk response. */
const BulkAccount = z.object({
  address: z.string().optional(),
  raw_address: z.string().optional(),
  balance: z.union([z.string(), z.number()]).optional(),
  status: z.string().optional(),
  last_activity: z.number().optional(),
  interfaces: z.array(z.string()).optional(),
  name: z.string().optional(),
  icon: z.string().optional(),
});

/**
 * TonAPI answers the bulk endpoint with `{ accounts: [...] }`, but some
 * deployments return the bare array, so both shapes are accepted.
 */
const BulkResponse = z.union([
  z.object({ accounts: z.array(BulkAccount) }),
  z.array(BulkAccount),
]);

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

    const addresses = params.addresses.map((address) => address.trim());

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (agent.config.TONAPI_KEY) {
      headers["Authorization"] = `Bearer ${agent.config.TONAPI_KEY}`;
    }

    const response = await fetchJson(`${apiBase}/accounts/_bulk`, BulkResponse, {
      method: "POST",
      headers,
      body: JSON.stringify({ account_ids: addresses }),
    });

    if (!response.ok) {
      throw new Error(`Bulk request failed: ${response.reason}`);
    }

    const rawAccounts = Array.isArray(response.value)
      ? response.value
      : response.value.accounts;

    const accounts = rawAccounts.map((account) => {
      const balanceTON =
        account.balance !== undefined
          ? nanotonsToTonNumber(account.balance).toFixed(9)
          : "0";
      const isWallet =
        account.interfaces?.some((name) => name.includes("wallet")) ?? false;

      return {
        address: account.address || account.raw_address || "",
        rawAddress: account.raw_address || account.address || "",
        balance: balanceTON + " TON",
        balanceNano: account.balance?.toString() || "0",
        status: account.status || "unknown",
        lastActivity: account.last_activity
          ? new Date(account.last_activity * 1000).toISOString()
          : null,
        interfaces: account.interfaces || [],
        name: account.name || null,
        icon: account.icon || null,
        isWallet,
        isContract: account.status === "active" && !isWallet,
      };
    });

    const totalBalance = accounts.reduce(
      (sum, account) => sum + parseFloat(account.balance),
      0,
    );

    return {
      accounts,
      count: accounts.length,
      totalBalance: totalBalance.toFixed(4) + " TON",
      activeAccounts: accounts.filter((account) => account.status === "active").length,
      wallets: accounts.filter((account) => account.isWallet).length,
      contracts: accounts.filter((account) => account.isContract).length,
      bulkQuery: true,
      message: `Fetched ${accounts.length} account(s) in 1 API call. Total: ${totalBalance.toFixed(4)} TON.`,
    };
  },
});
