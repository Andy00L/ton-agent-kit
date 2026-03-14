# TON Agent Kit — MCP Server Example

An MCP (Model Context Protocol) server that exposes all TON Agent Kit actions as tools for Claude Desktop, Cursor, Windsurf, and any MCP-compatible client.

## Install

```bash
npm install
```

## Claude Desktop Configuration

Add this to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ton-agent-kit": {
      "command": "node",
      "args": ["/absolute/path/to/examples/mcp-server/dist/index.js"],
      "env": {
        "TON_PRIVATE_KEY": "your-base64-private-key",
        "TON_NETWORK": "mainnet",
        "TON_RPC_URL": "https://mainnet-v4.tonhubapi.com",
        "TONAPI_KEY": "your-tonapi-key"
      }
    }
  }
}
```

You can use either `TON_PRIVATE_KEY` (base64-encoded) or `TON_MNEMONIC` (space-separated 24 words) for wallet authentication.

## Build & Run

```bash
npm run build
npm start
```

Or for development:

```bash
npm run dev
```

## Available Tools (29)

### Wallet & Tokens
| Tool | Description |
|------|-------------|
| `get_balance` | Get TON balance of the agent wallet |
| `transfer_ton` | Send TON to an address |
| `deploy_jetton` | Deploy a new Jetton token |
| `transfer_jetton` | Transfer Jetton tokens |
| `get_jetton_info` | Get information about a Jetton |
| `get_jetton_balance` | Get Jetton token balance |

### DeFi
| Tool | Description |
|------|-------------|
| `swap_stonfi` | Swap tokens on STON.fi DEX |
| `swap_dedust` | Swap tokens on DeDust DEX |
| `get_price` | Get token price |

### NFT
| Tool | Description |
|------|-------------|
| `get_nft_info` | Get NFT item information |
| `transfer_nft` | Transfer an NFT |
| `get_nft_collection` | Get NFT collection info |

### DNS
| Tool | Description |
|------|-------------|
| `resolve_domain` | Resolve a .ton domain to an address |
| `lookup_address` | Reverse lookup an address to a domain |
| `get_domain_info` | Get detailed domain information |

### Staking
| Tool | Description |
|------|-------------|
| `stake_ton` | Stake TON tokens |
| `unstake_ton` | Unstake TON tokens |
| `get_staking_info` | Get staking position info |

### Escrow
| Tool | Description |
|------|-------------|
| `create_escrow` | Create a trustless escrow deal |
| `deposit_to_escrow` | Deposit funds to an escrow |
| `release_escrow` | Release escrowed funds |
| `refund_escrow` | Refund an escrow |
| `get_escrow_info` | Get escrow deal info |

### Identity
| Tool | Description |
|------|-------------|
| `register_agent` | Register as an AI agent on-chain |
| `discover_agent` | Discover other AI agents |
| `get_agent_reputation` | Check an agent's reputation |

### Analytics
| Tool | Description |
|------|-------------|
| `get_wallet_info` | Get detailed wallet information |
| `get_transaction_history` | Get transaction history |

### Payments
| Tool | Description |
|------|-------------|
| `pay_for_resource` | Pay for an x402-enabled resource |

Plus the built-in `ton_agent_info` meta-tool for querying agent status.
