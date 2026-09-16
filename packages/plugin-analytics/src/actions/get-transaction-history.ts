import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, fetchJson, toFriendlyAddress } from "@ton-agent-kit/core";
import {
  AccountEventsResponse,
  nanotonsToTonNumber,
} from "../tonapi-schemas";

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

    const history = await fetchJson(url, AccountEventsResponse);
    if (!history.ok) {
      throw new Error(`Failed to fetch history: ${history.reason}`);
    }

    const toFriendly = (address: string | undefined) =>
      address
        ? toFriendlyAddress(Address.parse(address), agent.network)
        : undefined;

    const events = (history.value.events ?? []).map((event) => ({
      id: event.event_id,
      timestamp: new Date((event.timestamp ?? 0) * 1000).toISOString(),
      actions: (event.actions ?? []).map((action) => ({
        type: action.type,
        status: action.status,
        amount: action.TonTransfer?.amount
          ? nanotonsToTonNumber(action.TonTransfer.amount).toString()
          : undefined,
        sender: action.TonTransfer?.sender?.address,
        friendlySender: toFriendly(action.TonTransfer?.sender?.address),
        recipient: action.TonTransfer?.recipient?.address,
        friendlyRecipient: toFriendly(action.TonTransfer?.recipient?.address),
      })),
    }));

    return {
      address: addr,
      friendlyAddress: toFriendlyAddress(Address.parse(addr), agent.network),
      count: events.length,
      events,
    };
  },
});
