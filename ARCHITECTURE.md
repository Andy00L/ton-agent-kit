# TON Agent Kit — Architecture Document

## Project Overview

**TON Agent Kit** is a modular TypeScript SDK that gives any AI agent autonomous actions on the TON blockchain. It includes a production-grade MCP (Model Context Protocol) server, LangChain tool integrations, and a Telegram bot demo.

**Tagline:** *"The Solana Agent Kit for TON — connect any AI agent to TON protocols."*

---

## Monorepo Structure

```
ton-agent-kit/
├── packages/
│   ├── core/                     # Core SDK — TonAgentKit class + plugin system
│   │   ├── src/
│   │   │   ├── index.ts          # Main exports
│   │   │   ├── agent.ts          # TonAgentKit class
│   │   │   ├── plugin.ts         # Plugin interface & types
│   │   │   ├── wallet.ts         # Wallet provider abstraction
│   │   │   ├── types.ts          # Shared types
│   │   │   └── utils.ts          # Helpers (address parsing, nanoton conversion, etc.)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── plugin-token/             # Jetton (token) operations
│   │   ├── src/
│   │   │   ├── index.ts          # Plugin export
│   │   │   ├── actions/
│   │   │   │   ├── transfer-ton.ts
│   │   │   │   ├── transfer-jetton.ts
│   │   │   │   ├── get-balance.ts
│   │   │   │   ├── get-jetton-balance.ts
│   │   │   │   ├── deploy-jetton.ts
│   │   │   │   └── get-jetton-info.ts
│   │   │   └── utils.ts
│   │   └── package.json
│   │
│   ├── plugin-defi/              # DeFi operations (DeDust, STON.fi)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── actions/
│   │   │   │   ├── swap-dedust.ts
│   │   │   │   ├── swap-stonfi.ts
│   │   │   │   ├── get-pool-info.ts
│   │   │   │   ├── add-liquidity.ts
│   │   │   │   └── get-price.ts
│   │   │   └── utils.ts
│   │   └── package.json
│   │
│   ├── plugin-nft/               # NFT operations
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── actions/
│   │   │   │   ├── get-nft-info.ts
│   │   │   │   ├── transfer-nft.ts
│   │   │   │   └── get-collection.ts
│   │   │   └── utils.ts
│   │   └── package.json
│   │
│   ├── plugin-dns/               # TON DNS operations
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── actions/
│   │   │   │   ├── resolve-domain.ts
│   │   │   │   ├── get-domain-info.ts
│   │   │   │   └── lookup-address.ts
│   │   │   └── utils.ts
│   │   └── package.json
│   │
│   ├── plugin-payments/          # Payment channels (TON-unique differentiator!)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── actions/
│   │   │   │   ├── create-channel.ts
│   │   │   │   ├── send-micropayment.ts
│   │   │   │   └── close-channel.ts
│   │   │   └── utils.ts
│   │   └── package.json
│   │
│   ├── mcp-server/               # MCP Server for Claude/GPT/Cursor integration
│   │   ├── src/
│   │   │   ├── index.ts          # MCP server entry point
│   │   │   ├── tools.ts          # Tool definitions from all plugins
│   │   │   └── handlers.ts       # Request handlers
│   │   └── package.json
│   │
│   ├── langchain/                # LangChain tool wrappers
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── tools.ts          # LangChain Tool[] from agent actions
│   │   └── package.json
│   │
│   └── ai-tools/                 # Vercel AI SDK + OpenAI tools
│       ├── src/
│       │   ├── index.ts
│       │   └── tools.ts
│       └── package.json
│
├── examples/
│   ├── telegram-bot/             # Demo Telegram bot agent
│   │   ├── src/
│   │   │   ├── index.ts          # Bot entry point (grammY or node-telegram-bot-api)
│   │   │   ├── agent.ts          # LangChain agent setup
│   │   │   └── handlers.ts       # Message handlers
│   │   ├── package.json
│   │   └── .env.example
│   │
│   └── simple-agent/             # Minimal example
│       ├── index.ts
│       └── package.json
│
├── package.json                  # Root package.json (npm workspaces)
├── tsconfig.base.json            # Shared TS config
├── ARCHITECTURE.md               # This file
├── README.md                     # Main README
├── LICENSE                       # MIT
└── .gitignore
```

---

## Core Design Principles

### 1. Plugin Architecture (`.use()` pattern)

Mirrors Solana Agent Kit V2's proven modular design:

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import TokenPlugin from "@ton-agent-kit/plugin-token";
import DefiPlugin from "@ton-agent-kit/plugin-defi";
import DnsPlugin from "@ton-agent-kit/plugin-dns";

const wallet = new KeypairWallet(secretKey);
const agent = new TonAgentKit(wallet, "https://toncenter.com/api/v2/jsonRPC")
  .use(TokenPlugin)
  .use(DefiPlugin)
  .use(DnsPlugin);

// Use actions
const balance = await agent.methods.getBalance();
const tx = await agent.methods.transferTon("EQ...", "1.5");
const swap = await agent.methods.swapOnDedust("TON", "USDT", "10");
```

### 2. Wallet Provider Abstraction

Support multiple wallet types:

```typescript
// Direct keypair (for agents)
const wallet = new KeypairWallet(secretKey);

// TON Connect (for user-facing apps)
const wallet = new TonConnectWallet(connector);

// Future: Privy, custodial, etc.
```

### 3. Action Provider Pattern

Each plugin registers "actions" — self-contained operations with:
- **name**: Unique identifier (e.g., `transfer_ton`)
- **description**: Human-readable description for LLM context
- **schema**: Zod schema for input validation
- **handler**: Async function that executes the action

```typescript
// Example action definition
const transferTonAction: Action = {
  name: "transfer_ton",
  description: "Transfer TON to another address. Use this when asked to send TON.",
  schema: z.object({
    to: z.string().describe("Destination address (raw or user-friendly)"),
    amount: z.string().describe("Amount of TON to send (e.g., '1.5')"),
  }),
  handler: async (agent, params) => {
    // ... execute transfer using agent.wallet and agent.connection
    return { txHash: "...", status: "sent" };
  },
};
```

---

## Technology Stack

### Core Dependencies
| Package | Purpose |
|---------|---------|
| `@ton/ton` | TON blockchain client (TonClient4) |
| `@ton/core` | Core primitives (Address, Cell, Builder) |
| `@ton/crypto` | Cryptographic functions (mnemonics, keypairs) |
| `@ton/sandbox` | Local testing (no testnet needed) |
| `zod` | Schema validation for action inputs |

### DeFi Integrations
| Package | Purpose |
|---------|---------|
| `@dedust/sdk` | DeDust DEX swaps |
| `@ston-fi/sdk` | STON.fi DEX swaps |

### AI Framework Integrations
| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP server implementation |
| `langchain` | LangChain tool wrappers |
| `ai` (Vercel) | Vercel AI SDK tools |

### Demo Bot
| Package | Purpose |
|---------|---------|
| `grammy` | Telegram bot framework |
| `@langchain/openai` | LLM for natural language parsing |

---

## Plugin Details

### plugin-token (6 actions)
| Action | Description |
|--------|-------------|
| `get_balance` | Get TON balance of any address |
| `get_jetton_balance` | Get Jetton (token) balance |
| `transfer_ton` | Send TON to an address |
| `transfer_jetton` | Send Jettons to an address |
| `deploy_jetton` | Deploy a new Jetton contract |
| `get_jetton_info` | Get Jetton metadata (name, symbol, supply) |

### plugin-defi (5 actions)
| Action | Description |
|--------|-------------|
| `swap_dedust` | Swap tokens on DeDust |
| `swap_stonfi` | Swap tokens on STON.fi |
| `get_pool_info` | Get liquidity pool information |
| `add_liquidity` | Add liquidity to a pool |
| `get_price` | Get current token price |

### plugin-nft (3 actions)
| Action | Description |
|--------|-------------|
| `get_nft_info` | Get NFT metadata |
| `transfer_nft` | Transfer an NFT |
| `get_collection` | Get NFT collection info |

### plugin-dns (3 actions)
| Action | Description |
|--------|-------------|
| `resolve_domain` | Resolve .ton domain to address |
| `get_domain_info` | Get domain registration details |
| `lookup_address` | Reverse lookup address to domain |

### plugin-payments (3 actions) ⚡ TON-UNIQUE
| Action | Description |
|--------|-------------|
| `create_channel` | Open a payment channel with another party |
| `send_micropayment` | Send zero-fee micropayment through channel |
| `close_channel` | Close channel and settle on-chain |

**Total: 20 actions across 5 plugins**

---

## MCP Server Design

The MCP server exposes all registered actions as MCP tools:

```json
{
  "name": "ton-agent-kit",
  "version": "1.0.0",
  "tools": [
    {
      "name": "transfer_ton",
      "description": "Transfer TON to another address",
      "inputSchema": {
        "type": "object",
        "properties": {
          "to": { "type": "string", "description": "Destination address" },
          "amount": { "type": "string", "description": "Amount of TON" }
        },
        "required": ["to", "amount"]
      }
    }
    // ... all other actions
  ]
}
```

### MCP Server Config (for Claude Desktop / Cursor)
```json
{
  "mcpServers": {
    "ton-agent-kit": {
      "command": "npx",
      "args": ["@ton-agent-kit/mcp-server"],
      "env": {
        "TON_PRIVATE_KEY": "your-private-key",
        "TON_RPC_URL": "https://toncenter.com/api/v2/jsonRPC"
      }
    }
  }
}
```

---

## Demo Telegram Bot Flow

```
User: "What's my TON balance?"
  → LangChain agent parses intent
  → Calls get_balance action
  → Bot replies: "Your balance is 42.5 TON ($150.75)"

User: "Swap 10 TON for USDT on DeDust"
  → Agent parses: swap_dedust(from=TON, to=USDT, amount=10)
  → Executes swap via DeDust SDK
  → Bot replies: "✅ Swapped 10 TON → 38.2 USDT | TX: [link]"

User: "Send 5 TON to EQBx..."
  → Agent parses: transfer_ton(to=EQBx..., amount=5)
  → Executes transfer
  → Bot replies: "✅ Sent 5 TON to EQBx... | TX: [link]"
```

---

## Differentiation from Competition

### vs. TON AI Framework (current competitor)
- **They**: Generic framework, no concrete actions
- **Us**: 20 specific, tested actions across 5 plugins

### vs. Existing TON MCP (rated 4/10)
- **They**: Basic read-only queries, poor docs
- **Us**: Full read+write, 20 actions, MCP + LangChain + Vercel AI

### vs. Solana Agent Kit
- **They**: No TON support
- **Us**: TON-native with unique features (payment channels, DNS, Telegram)

### TON-Unique Advantages (not possible on Solana/ETH)
1. **Payment Channels**: Zero-fee agent micropayments
2. **TON DNS**: Agents get human-readable names (`myagent.ton`)
3. **Telegram Distribution**: 900M users, zero app-store friction
4. **Actor Model**: Each contract = independent agent (natural fit)

---

## Build Timeline (10 days)

| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1 | Setup monorepo, core SDK, plugin system | `@ton-agent-kit/core` working |
| 2 | plugin-token (all 6 actions) | Token transfers + balances working |
| 3 | plugin-defi (DeDust + STON.fi swaps) | DEX swaps working |
| 4 | plugin-nft + plugin-dns | NFT + DNS actions working |
| 5 | plugin-payments | Payment channels MVP |
| 6 | MCP Server | MCP server fully functional |
| 7 | LangChain + Vercel AI tools | AI framework integrations |
| 8 | Telegram bot demo | Demo bot working end-to-end |
| 9 | Testing, edge cases, error handling | Robust + tested |
| 10 | README, docs, demo video, submission | 🚀 Ship it |

---

## Judging Criteria Mapping

| Criteria (25% each) | How we score |
|---------------------|-------------|
| **Product Quality** | Clean SDK API, working MCP server, polished demo bot |
| **Technical Execution** | Modular plugin architecture, type-safe, tested |
| **Ecosystem Value** | THE foundational tool for all future TON AI agents |
| **User Potential** | Any dev with Claude/GPT can interact with TON instantly |
