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
 *       "args": ["@ton-agent-kit/mcp-server"],
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
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { createServer as createHttpServer } from "http";
import { parse as parseUrl } from "url";
import crypto from "crypto";
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
import MemoryPlugin from "@ton-agent-kit/plugin-memory";

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
    .use(AnalyticsPlugin)
    .use(MemoryPlugin);

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
      .use(AnalyticsPlugin)
      .use(MemoryPlugin);
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
  // Parse CLI args for transport mode
  // ──────────────────────────────────────────────────────────
  const cliArgs = process.argv.slice(2);
  let transportMode: "stdio" | "sse" = "stdio";
  let ssePort = 3001;
  let authToken: string | null = null;
  let corsOrigin = "*";

  for (let i = 0; i < cliArgs.length; i++) {
    if (cliArgs[i] === "--transport" && cliArgs[i + 1]) { transportMode = cliArgs[++i] as any; }
    else if (cliArgs[i] === "--port" && cliArgs[i + 1]) { ssePort = parseInt(cliArgs[++i], 10); }
    else if (cliArgs[i] === "--token" && cliArgs[i + 1]) { authToken = cliArgs[++i]; }
    else if (cliArgs[i] === "--cors" && cliArgs[i + 1]) { corsOrigin = cliArgs[++i]; }
  }
  if (process.env.MCP_TRANSPORT) transportMode = process.env.MCP_TRANSPORT as any;
  if (process.env.MCP_PORT) ssePort = parseInt(process.env.MCP_PORT, 10);
  if (process.env.MCP_AUTH_TOKEN) authToken = process.env.MCP_AUTH_TOKEN;
  if (process.env.MCP_CORS_ORIGIN) corsOrigin = process.env.MCP_CORS_ORIGIN;

  if (transportMode === "sse") {
    // ── SSE Transport ──
    const token = authToken || crypto.randomBytes(32).toString("hex");
    if (!authToken) {
      console.error(`\n  Generated auth token: ${token}`);
      console.error(`  Set MCP_AUTH_TOKEN to persist.\n`);
    }

    const transports: Map<string, SSEServerTransport> = new Map();

    const httpServer = createHttpServer(async (req, res) => {
      const url = parseUrl(req.url || "", true);

      // CORS
      res.setHeader("Access-Control-Allow-Origin", corsOrigin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

      if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

      // Health — no auth
      if (url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", transport: "sse", actions: agent.actionCount, uptime: process.uptime() }));
        return;
      }
      // Info — no auth
      if (url.pathname === "/" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ name: "ton-agent-kit-mcp", transport: "sse", actions: agent.actionCount, endpoints: { sse: "/sse", messages: "/messages", health: "/health" } }));
        return;
      }

      // Auth check for /sse and /messages
      const authHeader = req.headers["authorization"];
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized", message: "Bearer token required." }));
        return;
      }
      const provided = Buffer.from(authHeader.slice(7));
      const expected = Buffer.from(token);
      if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized", message: "Invalid token." }));
        return;
      }

      // SSE endpoint
      if (url.pathname === "/sse") {
        const sseTransport = new SSEServerTransport("/messages", res);
        transports.set(sseTransport.sessionId, sseTransport);
        res.on("close", () => { transports.delete(sseTransport.sessionId); });
        await server.connect(sseTransport);
        return;
      }

      // Messages endpoint
      if (url.pathname === "/messages") {
        const sessionId = url.query.sessionId as string;
        const sseTransport = sessionId ? transports.get(sessionId) : undefined;
        if (!sseTransport) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid session. Connect to /sse first." }));
          return;
        }
        await sseTransport.handlePostMessage(req, res);
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    });

    const shutdown = () => {
      console.error("\n[MCP-SSE] Shutting down...");
      transports.clear();
      httpServer.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 5000);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    httpServer.listen(ssePort, () => {
      console.error(`\n  MCP Server (SSE) on http://localhost:${ssePort}`);
      console.error(`  Auth: Bearer ${token.slice(0, 8)}...${token.slice(-4)}`);
      console.error(`  Actions: ${agent.actionCount} | Network: ${agent.network}\n`);
    });
  } else {
    // ── Stdio Transport (default) ──
    const stdioTransport = new StdioServerTransport();
    await server.connect(stdioTransport);
    console.error(`TON Agent Kit MCP Server started (stdio)`);
    console.error(`Network: ${agent.network} | Actions: ${agent.actionCount}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
