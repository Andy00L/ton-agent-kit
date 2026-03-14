import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";

export const getTransactionHistoryAction = defineAction({
  name: "get_transaction_history",
  description: "Get recent transaction history for a wallet address.",
  schema: z.object({
    address: z
      .string()
      .optional()
      .describe("Wallet address. Defaults to agent's own."),
    limit: z.coerce
      .number()
      .optional()
      .default(10)
      .describe("Number of transactions (default: 10)"),
  }),
  handler: async (agent, params) => {
    const addr = params.address || agent.wallet.address.toRawString();
    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";
    const url = `${apiBase}/accounts/${encodeURIComponent(addr)}/events?limit=${params.limit || 10}`;
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Failed to fetch history: ${response.status}`);
    const data = await response.json();
    const events = (data.events || []).map((e: any) => ({
      id: e.event_id,
      timestamp: new Date(e.timestamp * 1000).toISOString(),
      actions: (e.actions || []).map((a: any) => ({
        type: a.type,
        status: a.status,
        amount: a.TonTransfer?.amount
          ? (Number(a.TonTransfer.amount) / 1e9).toString()
          : undefined,
        sender: a.TonTransfer?.sender?.address,
        friendlySender: a.TonTransfer?.sender?.address ? toFriendlyAddress(Address.parse(a.TonTransfer.sender.address), agent.network) : undefined,
        recipient: a.TonTransfer?.recipient?.address,
        friendlyRecipient: a.TonTransfer?.recipient?.address ? toFriendlyAddress(Address.parse(a.TonTransfer.recipient.address), agent.network) : undefined,
      })),
    }));
    return { address: addr, friendlyAddress: toFriendlyAddress(Address.parse(addr), agent.network), count: events.length, events };
  },
});
