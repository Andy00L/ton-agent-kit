# @ton-agent-kit/mcp-server

MCP (Model Context Protocol) server that exposes all TON Agent Kit actions as tools for Claude Desktop, Cursor, Windsurf, and any MCP-compatible client. 68 tools across 10 plugins. Supports both Stdio and SSE transports.

Part of [TON Agent Kit](https://github.com/Andy00L/ton-agent-kit).

## Install

```bash
npm install @ton-agent-kit/mcp-server
```

## Claude Desktop Configuration

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ton-agent-kit": {
      "command": "npx",
      "args": ["@ton-agent-kit/mcp-server"],
      "env": {
        "TON_PRIVATE_KEY": "your-base64-private-key",
        "TON_NETWORK": "mainnet",
        "TON_RPC_URL": "https://mainnet-v4.tonhubapi.com"
      }
    }
  }
}
```

## SSE Transport

For web-based clients or remote access:

```bash
npx @ton-agent-kit/mcp-server --transport sse --port 3001
```

The server generates an auth token on startup. Set `MCP_AUTH_TOKEN` to persist it across restarts.

## Environment Variables

| Variable | Description |
|---|---|
| `TON_PRIVATE_KEY` | Base64-encoded wallet secret key. |
| `TON_MNEMONIC` | 24-word mnemonic (alternative to private key). |
| `TON_NETWORK` | `mainnet` or `testnet` (default: `mainnet`). |
| `TON_RPC_URL` | TON HTTP API v4 endpoint. |
| `TONAPI_KEY` | Optional TONAPI key for DNS, analytics, and NFT lookups. |
| `MCP_TRANSPORT` | `stdio` (default) or `sse`. |
| `MCP_PORT` | SSE server port (default: `3001`). |
| `MCP_AUTH_TOKEN` | Persistent auth token for SSE transport. |

## Links

- [GitHub](https://github.com/Andy00L/ton-agent-kit)
- [npm](https://www.npmjs.com/package/@ton-agent-kit/mcp-server)

## License

MIT
