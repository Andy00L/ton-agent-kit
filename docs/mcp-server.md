# MCP Server

Model Context Protocol server that exposes TON Agent Kit actions as tools for Claude Desktop, Cursor, and other MCP clients.

**File:** `mcp-server.ts` (151 lines)
**Package:** `@ton-agent-kit/mcp-server` v1.1.1
**SDK:** `@modelcontextprotocol/sdk`

---

## Transport

The server uses **stdio only**. It creates a `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js`.

SSE transport is mentioned in `.env.example` but is not implemented in `mcp-server.ts`. A manually constructed SSE server exists in `tests/17-mcp-sse.ts` as a separate test file.

---

## Plugins Loaded

The MCP server loads 10 plugins. This set differs from the Telegram bot: AgentCommPlugin is absent, and MemoryPlugin is present.

| # | Plugin |
|---|---|
| 1 | TokenPlugin |
| 2 | DefiPlugin |
| 3 | NftPlugin |
| 4 | DnsPlugin |
| 5 | PaymentsPlugin |
| 6 | StakingPlugin |
| 7 | EscrowPlugin |
| 8 | IdentityPlugin |
| 9 | AnalyticsPlugin |
| 10 | MemoryPlugin |

MemoryPlugin is unique to the MCP server. It is not loaded in the Telegram bot or cloud-agent.

---

## Tools Exposed

All plugin actions are exposed as MCP tools via `agent.getAvailableActions()`. Schemas are converted using `toJSONSchema(action.schema)` with the `$schema` field stripped for OpenAI compatibility.

One additional meta-tool is registered manually:

**`ton_agent_info`** returns: wallet address, network, RPC URL, wallet version, list of all available action names.

---

## Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ton-agent-kit": {
      "command": "bun",
      "args": ["run", "/path/to/ton-agent-kit/mcp-server.ts"],
      "env": {
        "TON_MNEMONIC": "word1 word2 ... word24",
        "TON_NETWORK": "testnet"
      }
    }
  }
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `TON_MNEMONIC` | Yes | | 24-word wallet mnemonic |
| `TON_NETWORK` | No | `testnet` | `testnet` or `mainnet` |
| `TON_RPC_URL` | No | network default | Custom RPC endpoint |

The server loads environment variables via `dotenv/config`.

---

## Running

```bash
export TON_MNEMONIC="word1 word2 ... word24"
export TON_NETWORK="testnet"

bun run mcp-server.ts
```

The process communicates over stdin/stdout. It does not bind a network port.

---

## Limitations

- No SSE transport in the current implementation. stdio only.
- AgentCommPlugin is not loaded, so agent-to-agent communication actions are unavailable.
- The server holds one wallet. There is no per-user isolation.
