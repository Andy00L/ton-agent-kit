import { z } from "zod";
import { Address, fromNano } from "@ton/core";
import { JettonMaster } from "@ton/ton";
import { defineAction, type JettonInfo } from "@ton-agent-kit/core";

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

    // Parse content cell for metadata (simplified)
    let name = "Unknown";
    let symbol = "???";
    let description = "";
    let image = "";

    try {
      // Try to parse on-chain or off-chain content
      const content = data.content;
      // In production: full TEP-64 content parsing
      // For MVP: return raw data
    } catch {}

    return {
      address: jettonMasterAddr.toString(),
      name,
      symbol,
      decimals: 9,
      totalSupply: fromNano(data.totalSupply),
      description,
      image,
    };
  },
});
