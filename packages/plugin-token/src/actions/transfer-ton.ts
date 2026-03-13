import { z } from "zod";
import { Address, toNano, internal, SendMode } from "@ton/core";
import { defineAction, type TransactionResult, explorerUrl } from "@ton-agent-kit/core";

export const transferTonAction = defineAction<
  { to: string; amount: string; comment?: string },
  TransactionResult
>({
  name: "transfer_ton",
  description:
    "Transfer TON to another wallet address. Specify the destination address and amount in TON (e.g., '1.5').",
  schema: z.object({
    to: z.string().describe("Destination TON address (raw or user-friendly format)"),
    amount: z.string().describe("Amount of TON to send (e.g., '1.5', '100')"),
    comment: z.string().optional().describe("Optional comment to include in the transfer"),
  }),
  handler: async (agent, params) => {
    const toAddress = Address.parse(params.to);
    const amountNano = toNano(params.amount);

    const sender = agent.wallet.getSender();

    // Build the internal message
    await sender.send({
      to: toAddress,
      value: amountNano,
      bounce: true,
      body: params.comment
        ? buildCommentBody(params.comment)
        : undefined,
    });

    return {
      txHash: "pending", // TON doesn't return hash immediately from sender
      status: "sent",
      explorerUrl: explorerUrl("pending", agent.network),
      fee: "~0.005 TON",
    };
  },
  examples: [
    {
      input: { to: "EQBx2CfDE...", amount: "5" },
      output: { txHash: "abc123", status: "sent", fee: "~0.005 TON" },
      description: "Send 5 TON to an address",
    },
  ],
});

/**
 * Build a comment body Cell for simple text transfers
 */
function buildCommentBody(comment: string) {
  const { beginCell } = require("@ton/core");
  return beginCell()
    .storeUint(0, 32) // 0 opcode = text comment
    .storeStringTail(comment)
    .endCell();
}
