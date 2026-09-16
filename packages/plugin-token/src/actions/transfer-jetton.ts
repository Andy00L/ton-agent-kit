import { z } from "zod";
import { Address, toNano, beginCell, internal } from "@ton/core";
import { JettonMaster, JettonWallet } from "@ton/ton";
import {
  defineAction,
  fetchJettonMetadata,
  sendTransaction,
  toBaseUnits,
  toFriendlyAddress,
  tonapiBase,
} from "@ton-agent-kit/core";

export const transferJettonAction = defineAction({
  name: "transfer_jetton",
  description:
    "Transfer Jettons (TON tokens like USDT, NOT, etc.) to another address. Requires the Jetton master contract address.",
  schema: z.object({
    to: z.string().describe("Destination address"),
    amount: z
      .string()
      .describe("Amount to send in the token's own units, as a plain decimal string (e.g. '100.5')"),
    jettonAddress: z
      .string()
      .describe("Jetton master contract address (e.g., USDT address on TON)"),
  }),
  handler: async (agent, params) => {
    const toAddress = Address.parse(params.to);
    const jettonMasterAddress = Address.parse(params.jettonAddress);

    // Decimals are declared per jetton, so the amount cannot be converted
    // before they are read. USDT on TON declares 6; treating it as 9 sends a
    // thousand times what the caller asked for.
    const metadata = await fetchJettonMetadata(
      tonapiBase(agent.network),
      params.jettonAddress,
      agent.config.TONAPI_KEY,
    );
    if (!metadata.ok) {
      return { status: "rejected" as const, reason: metadata.reason };
    }

    const units = toBaseUnits(params.amount, metadata.value.decimals);
    if (!units.ok) {
      return { status: "rejected" as const, reason: units.reason };
    }

    // Get the sender's Jetton wallet address
    const jettonMaster = agent.connection.open(JettonMaster.create(jettonMasterAddress));
    const jettonWalletAddress = await jettonMaster.getWalletAddress(agent.wallet.address);

    // Build transfer message
    const forwardPayload = beginCell().storeUint(0, 32).storeStringTail("").endCell();

    const transferBody = beginCell()
      .storeUint(0xf8a7ea5, 32) // transfer op
      .storeUint(0, 64) // query_id
      .storeCoins(units.value) // amount in the jetton's own base units
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

    // sendTransaction returns nothing, so there is no hash to report and no
    // explorer link to build. Reporting "pending" produced a link to
    // /transaction/pending, which never resolves.
    return {
      status: "sent" as const,
      to: params.to,
      friendlyTo: toFriendlyAddress(toAddress, agent.network),
      amount: params.amount,
      symbol: metadata.value.symbol,
      decimals: metadata.value.decimals,
      baseUnits: units.value.toString(),
      attached: "0.05 TON, of which 0.01 TON is forwarded to the recipient",
    };
  },
  examples: [
    {
      input: {
        to: "EQBx2...",
        amount: "100",
        jettonAddress: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
      },
      output: {
        status: "sent",
        to: "EQBx2...",
        friendlyTo: "EQBx2...",
        amount: "100",
        symbol: "USDT",
        decimals: 6,
        baseUnits: "100000000",
        attached: "0.05 TON, of which 0.01 TON is forwarded to the recipient",
      },
      description: "Send 100 USDT, which the master declares with 6 decimals",
    },
  ],
});
