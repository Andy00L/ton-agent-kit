# MCP Server

Model Context Protocol server that exposes all TON Agent Kit actions as tools for Claude Desktop, Cursor, and other MCP clients.

**Package:** `@ton-agent-kit/mcp-server` v1.1.1

## Transports

| Transport | Use Case | Auth |
|---|---|---|
| **stdio** (default) | Claude Desktop, local AI tools | None needed |
| **SSE** | Remote access, web clients | Bearer token |

## Quick Start (Claude Desktop)

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ton-agent-kit": {
      "command": "bun",
      "args": ["run", "/path/to/ton-agent-kit/mcp-server.ts"],
      "env": {
        "TON_MNEMONIC": "your 24 word mnemonic",
        "TON_NETWORK": "testnet"
      }
    }
  }
}
```

## SSE Mode

```bash
# Start SSE server
MCP_TRANSPORT=sse MCP_PORT=3001 bun run mcp-server.ts
# Outputs: Bearer token for authentication
```

### SSE Endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `GET /sse` | Bearer token | Establish SSE connection |
| `POST /messages` | Bearer token | Send messages to session |
| `GET /health` | None | Health check |
| `GET /` | None | Server info (routes, version, action count) |

## Tools Exposed

All actions from the loaded plugins are exposed as MCP tools, plus a meta-tool:

- `ton_agent_info` -- returns wallet address, network, available actions, and total count

The server loads 9 plugins: Token, DeFi, NFT, DNS, Payments, Staking, Escrow, Identity, Analytics, Memory.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TON_MNEMONIC` | Yes* | 24-word mnemonic |
| `TON_PRIVATE_KEY` | Yes* | Base64 secret key (alternative to mnemonic) |
| `TON_NETWORK` | No | "testnet" or "mainnet" (default: testnet) |
| `TON_RPC_URL` | No | Custom RPC endpoint |
| `MCP_TRANSPORT` | No | "stdio" (default) or "sse" |
| `MCP_PORT` | No | SSE port (default: 3001) |
| `MCP_AUTH_TOKEN` | No | Custom Bearer token (auto-generated if not set) |
| `MCP_CORS_ORIGIN` | No | CORS origin (default: "*") |

*One of TON_MNEMONIC or TON_PRIVATE_KEY is required.
