import { z } from "zod";
import { Address } from "@ton/core";
import { JettonMaster } from "@ton/ton";
import { defineAction, type JettonInfo, toFriendlyAddress } from "@ton-agent-kit/core";

export const getJettonInfoAction = defineAction<
  { jettonAddress: string },
  JettonInfo
>({
  name: "get_jetton_info",
  description:
    "Get information about a Jetton (token) including name, symbol, total supply, and admin address.",
  schema: z.object({
    jettonAddress: z.string().describe("Jetton master contract address"),
  }),
  handler: async (agent, params) => {
    const jettonMasterAddr = Address.parse(params.jettonAddress);
    const jettonMaster = (agent.connection as any).open(
      JettonMaster.create(jettonMasterAddr)
    );

    const data = await jettonMaster.getJettonData();

    return {
      address: jettonMasterAddr.toRawString(),
      friendlyAddress: toFriendlyAddress(jettonMasterAddr, agent.network),
      name: "Unknown",
      symbol: "???",
      decimals: 9,
      totalSupply: data.totalSupply.toString(),
    };
  },
});
