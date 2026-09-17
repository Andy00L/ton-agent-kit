import { z } from "zod";
import { defineAction, describeError } from "@ton-agent-kit/core";
import { parseAddress, parseBigNum, parseNum, parseString } from "../stack-parsers";

/** One pending offer, as get_offers reports it. */
interface PendingOffer {
  offerIndex: number;
  seller: string;
  intentIndex: number;
  price: string;
  deliveryTime: number;
  endpoint: string;
  status: string;
}
import { callContractGetter, resolveContractAddress } from "@ton-agent-kit/plugin-identity";

export const getOffersAction = defineAction({
  name: "get_offers",
  description:
    "Get pending offers for a specific intent. Reads offer data from the on-chain reputation contract and filters by intent index and pending status.",
  schema: z.object({
    intentIndex: z.number().describe("Index of the intent to get offers for"),
    limit: z.number().optional().describe("Maximum number of offers to return (default: 20)"),
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

    const limit = params.limit || 20;

    try {
      // Read offerCount
      const countRes = await callContractGetter(
        apiBase,
        contractAddr,
        "offerCount",
        [],
        agent.config.TONAPI_KEY
      );

      let totalCount = 0;
      if (countRes?.stack?.[0]?.num) {
        const raw = countRes.stack[0].num;
        totalCount = parseNum({ type: "num", num: raw });
      }

      if (totalCount === 0) {
        return { offers: [], count: 0, onChain: true };
      }

      const offers: PendingOffer[] = [];

      // Iterate through all offers
      for (let i = totalCount - 1; i >= 0 && offers.length < limit; i--) {
        try {
          const dataRes = await callContractGetter(
            apiBase,
            contractAddr,
            "offerData",
            [i.toString()],
            agent.config.TONAPI_KEY
          );

          if (!dataRes?.stack || dataRes.stack.length === 0) continue;

          // Parse the offer tuple
          let items = dataRes.stack;
          if (items[0]?.type === "tuple" && items[0].tuple) {
            items = items[0].tuple;
          }

          if (items.length < 6) continue;

          // Fields: seller address, intentIndex num, price num, deliveryTime num, status num, endpoint string
          const seller = parseAddress(items[0]);
          const offerIntentIndex = parseNum(items[1]);
          const price = parseBigNum(items[2]);
          const deliveryTime = parseNum(items[3]);
          const status = parseNum(items[4]);
          const endpoint = parseString(items[5]);

          // Filter by intentIndex
          if (offerIntentIndex !== params.intentIndex) continue;

          // Filter: only pending (status==0)
          if (status !== 0) continue;

          offers.push({
            offerIndex: i,
            seller,
            intentIndex: offerIntentIndex,
            price: price.toString(),
            deliveryTime,
            endpoint,
            status: "pending",
          });
        } catch {
          // Skip offers that fail to read
          continue;
        }
      }

      return {
        offers,
        count: offers.length,
        onChain: true,
        contractAddress: contractAddr,
      };
    } catch (caught: unknown) {
      return {
        offers: [],
        count: 0,
        error: describeError(caught),
        message: `Failed to get offers: ${describeError(caught)}`,
      };
    }
  },
});
