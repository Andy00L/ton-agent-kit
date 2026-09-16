import { z } from "zod";
import {
  defineAction,
  fetchJson,
  type JettonBalanceResult,
} from "@ton-agent-kit/core";

/** Decimals assumed when a jetton master does not declare them. */
const DEFAULT_JETTON_DECIMALS = 9;

/** The fields this action reads off the TonAPI jetton balance endpoint. */
const JettonBalanceResponse = z.object({
  balance: z.union([z.string(), z.number()]).optional(),
  jetton: z
    .object({
      symbol: z.string().optional(),
      name: z.string().optional(),
      decimals: z.number().optional(),
    })
    .optional(),
});

export const getJettonBalanceAction = defineAction<
  { jettonAddress: string; ownerAddress?: string },
  JettonBalanceResult
>({
  name: "get_jetton_balance",
  description:
    "Get the balance of a specific Jetton (token) for a wallet. Provide the Jetton master address. If no owner is specified, checks the agent's own balance.",
  schema: z.object({
    jettonAddress: z.string().describe("Jetton master contract address"),
    ownerAddress: z.string().optional().describe("Wallet address to check. Defaults to agent's own address."),
  }),
  handler: async (agent, params) => {
    const ownerAddr = params.ownerAddress
      ? params.ownerAddress
      : agent.wallet.address.toRawString();

    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";

    const headers: Record<string, string> = {};
    if (agent.config.TONAPI_KEY) {
      headers["Authorization"] = `Bearer ${agent.config.TONAPI_KEY}`;
    }

    try {
      // Use TONAPI which handles all address formats (raw, user-friendly, etc.)
      const response = await fetchJson(
        `${apiBase}/accounts/${encodeURIComponent(ownerAddr)}/jettons/${encodeURIComponent(params.jettonAddress)}`,
        JettonBalanceResponse,
        { headers },
      );

      if (!response.ok) {
        return {
          balance: "0",
          balanceRaw: "0",
          symbol: "JETTON",
          name: "Jetton",
          decimals: DEFAULT_JETTON_DECIMALS,
        };
      }

      const data = response.value;
      const decimals = data.jetton?.decimals ?? DEFAULT_JETTON_DECIMALS;
      const balanceRaw = String(data.balance ?? "0");
      const balance = (Number(balanceRaw) / Math.pow(10, decimals)).toString();

      return {
        balance,
        balanceRaw,
        symbol: data.jetton?.symbol || "JETTON",
        name: data.jetton?.name || "Jetton",
        decimals,
      };
    } catch {
      return {
        balance: "0",
        balanceRaw: "0",
        symbol: "JETTON",
        name: "Jetton",
        decimals: 9,
      };
    }
  },
});
