import { z } from "zod";
import { Address, toNano, beginCell, internal } from "@ton/core";
import { JettonMaster, JettonWallet } from "@ton/ton";
import { defineAction, type TransactionResult, sendTransaction } from "@ton-agent-kit/core";

export const transferJettonAction = defineAction<
  { to: string; amount: string; jettonAddress: string },
  TransactionResult
>({
  name: "transfer_jetton",
  description:
    "Transfer Jettons (TON tokens like USDT, NOT, etc.) to another address. Requires the Jetton master contract address.",
  schema: z.object({
    to: z.string().describe("Destination address"),
    amount: z.string().describe("Amount to send in token units (e.g., '100')"),
    jettonAddress: z
      .string()
      .describe("Jetton master contract address (e.g., USDT address on TON)"),
  }),
  handler: async (agent, params) => {
    const toAddress = Address.parse(params.to);
    const jettonMasterAddress = Address.parse(params.jettonAddress);

    // Get the sender's Jetton wallet address
    const jettonMaster = agent.connection.open(
      JettonMaster.create(jettonMasterAddress)
    ) as any;

    const jettonWalletAddress = await jettonMaster.getWalletAddress(
      agent.wallet.address
    );

    // Build transfer message
    const forwardPayload = beginCell().storeUint(0, 32).storeStringTail("").endCell();

    const transferBody = beginCell()
      .storeUint(0xf8a7ea5, 32) // transfer op
      .storeUint(0, 64) // query_id
      .storeCoins(BigInt(Math.floor(parseFloat(params.amount) * 1e9))) // amount in raw units (assuming 9 decimals)
      .storeAddress(toAddress) // destination
      .storeAddress(agent.wallet.address) // response destination
      .storeBit(0) // no custom payload
      .storeCoins(toNano("0.01")) // forward TON amount
      .storeBit(1) // forward payload
      .storeRef(forwardPayload)
      .endCell();

    await sendTransaction(agent, [
      internal({
        to: jettonWalletAddress,
        value: toNano("0.05"),
        bounce: true,
        body: transferBody,
      }),
    ]);

    return {
      txHash: "pending",
      status: "sent",
      fee: "~0.037 TON",
    };
  },
  examples: [
    {
      input: {
        to: "EQBx2...",
        amount: "100",
        jettonAddress: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
      },
      output: { txHash: "abc123", status: "sent", fee: "~0.037 TON" },
      description: "Send 100 USDT to an address",
    },
  ],
});
