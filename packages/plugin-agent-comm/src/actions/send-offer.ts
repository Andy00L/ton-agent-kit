import { z } from "zod";
import { Address, toNano, fromNano, beginCell, internal } from "@ton/core";
import { defineAction, sendTransaction } from "@ton-agent-kit/core";
import { resolveContractAddress } from "../../../plugin-identity/src/reputation-config";
import { callContractGetter } from "../../../plugin-identity/src/reputation-helpers";
import { storeSendOffer } from "../../../plugin-identity/src/contracts/Reputation_Reputation";

export const sendOfferAction = defineAction({
  name: "send_offer",
  description:
    "Send an offer to fulfill an open intent. The price and delivery time are stored on-chain. The endpoint (where the service is available) is stored locally in the return value — the contract does not store endpoints.",
  schema: z.object({
    intentIndex: z.number().describe("Index of the intent to make an offer for"),
    price: z.string().describe("Offered price in TON (e.g., '0.5')"),
    deliveryTime: z.number().optional().describe("Estimated delivery time in minutes (default: 60)"),
    endpoint: z.string().describe("API endpoint where the service can be accessed"),
  }),
  handler: async (agent, params) => {
    const contractAddr = resolveContractAddress(undefined, agent.network);
    if (!contractAddr) {
      return { message: "No reputation contract configured" };
    }

    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";

    const deliveryTime = params.deliveryTime || 60;

    try {
      const body = beginCell()
        .store(
          storeSendOffer({
            $$type: "SendOffer",
            intentIndex: BigInt(params.intentIndex),
            price: toNano(params.price),
            deliveryTime: BigInt(deliveryTime),
          })
        )
        .endCell();

      await sendTransaction(agent, [
        internal({
          to: Address.parse(contractAddr),
          value: toNano("0.12"),
          bounce: true,
          body,
        }),
      ]);

      // Wait for on-chain confirmation then read offerCount to get the index
      await new Promise((resolve) => setTimeout(resolve, 5000));

      let offerIndex = -1;
      try {
        const countRes = await callContractGetter(
          apiBase,
          contractAddr,
          "offerCount",
          [],
          agent.config.TONAPI_KEY
        );
        if (countRes?.stack?.[0]?.num) {
          const raw = countRes.stack[0].num;
          offerIndex = Number(BigInt(raw.startsWith("-0x") ? "-" + raw.slice(1) : raw)) - 1;
        }
      } catch {}

      return {
        offerIndex,
        intentIndex: params.intentIndex,
        price: params.price,
        deliveryTime,
        endpoint: params.endpoint,
        status: "pending",
        onChain: true,
        contractAddress: contractAddr,
      };
    } catch (err: any) {
      return {
        sent: false,
        error: err.message,
        message: `Failed to send offer: ${err.message}`,
      };
    }
  },
});
