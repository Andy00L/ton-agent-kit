#!/usr/bin/env node

/**
 * TON Agent Kit — MCP Server
 *
 * Exposes all TON Agent Kit actions as MCP tools.
 * Compatible with Claude Desktop, Cursor, Windsurf, and any MCP client.
 *
 * Usage (Claude Desktop config):
 * {
 *   "mcpServers": {
 *     "ton-agent-kit": {
 *       "command": "npx",
 *       "args": ["ts-node", "src/index.ts"],
 *       "env": {
 *         "TON_PRIVATE_KEY": "your-base64-private-key",
 *         "TON_NETWORK": "mainnet",
 *         "TON_RPC_URL": "https://mainnet-v4.tonhubapi.com"
 *       }
 *     }
 *   }
 * }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { toJSONSchema } from "zod";

import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import TokenPlugin from "@ton-agent-kit/plugin-token";
import DefiPlugin from "@ton-agent-kit/plugin-defi";
import NftPlugin from "@ton-agent-kit/plugin-nft";
import DnsPlugin from "@ton-agent-kit/plugin-dns";
import PaymentsPlugin from "@ton-agent-kit/plugin-payments";
import StakingPlugin from "@ton-agent-kit/plugin-staking";
import EscrowPlugin from "@ton-agent-kit/plugin-escrow";
import IdentityPlugin from "@ton-agent-kit/plugin-identity";
import AnalyticsPlugin from "@ton-agent-kit/plugin-analytics";

// ============================================================
// Initialize Agent Kit from environment variables
// ============================================================

function createAgent(): TonAgentKit {
  const privateKey = process.env.TON_PRIVATE_KEY;
  const rpcUrl = process.env.TON_RPC_URL;
  const network = (process.env.TON_NETWORK as "mainnet" | "testnet") || "mainnet";
  const mnemonic = process.env.TON_MNEMONIC;

  let wallet: KeypairWallet;

  if (mnemonic) {
    // Will be initialized async — handled in main()
    throw new Error("Use fromMnemonic in async context");
  } else if (privateKey) {
    wallet = KeypairWallet.fromSecretKey(Buffer.from(privateKey, "base64"));
  } else {
    throw new Error(
      "TON_PRIVATE_KEY or TON_MNEMONIC environment variable is required.\n" +
        "Set it in your MCP server configuration."
    );
  }

  const agent = new TonAgentKit(wallet, rpcUrl, {
    TONAPI_KEY: process.env.TONAPI_KEY || "",
  }, network)
    .use(TokenPlugin)
    .use(DefiPlugin)
    .use(NftPlugin)
    .use(DnsPlugin)
    .use(PaymentsPlugin)
    .use(StakingPlugin)
    .use(EscrowPlugin)
    .use(IdentityPlugin)
    .use(AnalyticsPlugin);

  return agent;
}

// ============================================================
// Convert Agent Kit actions → MCP tools
// ============================================================

function actionsToMcpTools(agent: TonAgentKit): Tool[] {
  return agent.getAvailableActions().map((action) => ({
    name: action.name,
    description: action.description,
    inputSchema: toJSONSchema(action.schema) as Tool["inputSchema"],
  }));
}

// ============================================================
// Main — start MCP server
// ============================================================

async function main() {
  let agent: TonAgentKit;

  // Handle mnemonic-based init (async)
  const mnemonic = process.env.TON_MNEMONIC;
  if (mnemonic) {
    const words = mnemonic.split(" ");
    const wallet = await KeypairWallet.fromMnemonic(words);
    const rpcUrl = process.env.TON_RPC_URL;
    const network = (process.env.TON_NETWORK as "mainnet" | "testnet") || "mainnet";

    agent = new TonAgentKit(wallet, rpcUrl, {
      TONAPI_KEY: process.env.TONAPI_KEY || "",
    }, network)
      .use(TokenPlugin)
      .use(DefiPlugin)
      .use(NftPlugin)
      .use(DnsPlugin)
      .use(PaymentsPlugin)
      .use(StakingPlugin)
      .use(EscrowPlugin)
      .use(IdentityPlugin)
      .use(AnalyticsPlugin);
  } else {
    agent = createAgent();
  }

  // Create MCP server
  const server = new Server(
    {
      name: "ton-agent-kit",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // ──────────────────────────────────────────────────────────
  // Handle: list_tools
  // ──────────────────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = actionsToMcpTools(agent);

    return {
      tools: [
        // Add a meta-tool for agent info
        {
          name: "ton_agent_info",
          description:
            "Get information about the TON Agent Kit: wallet address, network, and available actions.",
          inputSchema: {
            type: "object" as const,
            properties: {},
          },
        },
        ...tools,
      ],
    };
  });

  // ──────────────────────────────────────────────────────────
  // Handle: call_tool
  // ──────────────────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Meta-tool: agent info
    if (name === "ton_agent_info") {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                address: agent.address,
                network: agent.network,
                rpcUrl: agent.rpcUrl,
                availableActions: agent.getAvailableActions().map((a) => ({
                  name: a.name,
                  description: a.description,
                })),
                pluginCount: agent.getPlugins().length,
                actionCount: agent.actionCount,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Execute agent action
    try {
      const result = await agent.runAction(name, args || {});

      return {
        content: [
          {
            type: "text" as const,
            text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      const error = err as Error;
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // ──────────────────────────────────────────────────────────
  // Start server on stdio
  // ──────────────────────────────────────────────────────────
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`TON Agent Kit MCP Server started`);
  console.error(`Network: ${agent.network}`);
  console.error(`Address: ${agent.address}`);
  console.error(`Actions: ${agent.actionCount} available`);
  console.error(`Plugins: ${agent.getPlugins().map((p) => p.name).join(", ")}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
