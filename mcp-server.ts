#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TonClient4 } from "@ton/ton";
import "dotenv/config";
import { zodToJsonSchema } from "zod-to-json-schema";
import { TonAgentKit } from "./packages/core/src/agent";
import { KeypairWallet } from "./packages/core/src/wallet";
import TokenPlugin from "./packages/plugin-token/src/index";
import DefiPlugin from "./packages/plugin-defi/src/index";
import NftPlugin from "./packages/plugin-nft/src/index";
import DnsPlugin from "./packages/plugin-dns/src/index";
import PaymentsPlugin from "./packages/plugin-payments/src/index";
import StakingPlugin from "./packages/plugin-staking/src/index";
import EscrowPlugin from "./packages/plugin-escrow/src/index";
import IdentityPlugin from "./packages/plugin-identity/src/index";
import AnalyticsPlugin from "./packages/plugin-analytics/src/index";

// ============================================================
// MCP Server
// ============================================================

async function main() {
  // Init wallet + agent
  const mnemonic = process.env.TON_MNEMONIC;
  if (!mnemonic) {
    console.error("Set TON_MNEMONIC in .env");
    process.exit(1);
  }

  const network =
    (process.env.TON_NETWORK as "testnet" | "mainnet") || "testnet";
  const rpcUrl =
    process.env.TON_RPC_URL ||
    (network === "testnet"
      ? "https://testnet-v4.tonhubapi.com"
      : "https://mainnet-v4.tonhubapi.com");

  const client = new TonClient4({ endpoint: rpcUrl });
  const wallet = await KeypairWallet.autoDetect(
    mnemonic.split(" "),
    client,
    network,
  );

  const agent = new TonAgentKit(wallet, rpcUrl, {}, network)
    .use(TokenPlugin)
    .use(DefiPlugin)
    .use(NftPlugin)
    .use(DnsPlugin)
    .use(PaymentsPlugin)
    .use(StakingPlugin)
    .use(EscrowPlugin)
    .use(IdentityPlugin)
    .use(AnalyticsPlugin);

  // Create MCP server
  const server = new Server(
    { name: "ton-agent-kit", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  // List tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      // Meta tool
      {
        name: "ton_agent_info",
        description:
          "Get TON Agent Kit info: wallet address, network, available actions.",
        inputSchema: { type: "object" as const, properties: {} },
      },
      // All plugin actions as tools
      ...agent.getAvailableActions().map((action) => ({
        name: action.name,
        description: action.description,
        inputSchema: (() => {
          const schema = zodToJsonSchema(action.schema, { target: "openApi3" });
          const { $schema, ...rest } = schema as any;
          return { type: "object", properties: {}, ...rest };
        })(),
      })),
    ],
  }));

  // Call tools
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "ton_agent_info") {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                address: wallet.address.toRawString(),
                network,
                rpcUrl,
                walletVersion: wallet.version,
                actions: agent.getAvailableActions().map((a) => a.name),
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    try {
      const result = await agent.runAction(name, args || {});
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (err: any) {
      return {
        content: [{ type: "text" as const, text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  });

  // Start
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`TON Agent Kit MCP Server started`);
  console.error(
    `Network: ${network} | Address: ${wallet.address.toRawString()}`,
  );
  console.error(`Actions: ${agent.getAvailableActions().map((a) => a.name).join(", ")}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
