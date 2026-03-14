<p align="center">
  <h1 align="center">🤖 TON Agent Kit</h1>
  <p align="center"><strong>The Agent Commerce Protocol for TON</strong></p>
  <p align="center">Connect any AI agent to TON. Build agent economies. Control them from Telegram.</p>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#plugins--actions">Plugins</a> •
  <a href="#agent-commerce-protocol">Agent Commerce</a> •
  <a href="#mcp-server">MCP Server</a> •
  <a href="#x402-payment-middleware">x402 Payments</a> •
  <a href="#telegram-bot">Telegram Bot</a>
</p>

---

## What is TON Agent Kit?

TON Agent Kit is more than an SDK — it's the **infrastructure for an AI agent economy on TON**.

Agents discover each other via **agent registry**. They pay each other via **x402 middleware**. Users control them safely from **Telegram with human-in-the-loop approval**. And any AI (Claude, GPT, LangChain, Vercel AI) can interact with TON through a single **MCP server with 29 tools**. Works with **any LLM provider** — OpenAI, OpenRouter, Groq, Together, Mistral.

### The problem

On Solana, the [Solana Agent Kit](https://github.com/sendaifun/solana-agent-kit) (1,600+ stars) gave agents blockchain access. On Base, [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) registered 123,000+ agents in 2 months. On Ethereum, x402 processed 162M+ transactions for agent-to-agent payments.

**On TON? Nothing.** Despite having the best architecture for AI agents — native payment channels, encrypted P2P networking (ADNL), decentralized DNS, and 1 billion Telegram users.

### The solution

| Capability | Solana | Base/ETH | TON (before) | TON Agent Kit |
|---|---|---|---|---|
| Agent SDK | Solana Agent Kit (60+) | Coinbase AgentKit (50+) | ❌ | ✅ **29 actions, 9 plugins** |
| Agent Identity | SATI | ERC-8004 (123K agents) | ❌ | ✅ **Agent registry + reputation** |
| Agent Payments | x402 ($0.00025/tx) | Virtuals ACP | ❌ | ✅ **x402 middleware** |
| Agent Security | Embedded wallets | Agentic Wallets (TEE) | ❌ | ✅ **Telegram HITL + balance guards** |
| Escrow | — | — | ❌ | ✅ **Trustless escrow with deadlines** |
| User Access | — | — | — | ✅ **1B Telegram users** |

---

## Quick Start

### Install

```bash
npm install @ton-agent-kit/core @ton-agent-kit/plugin-token @ton-agent-kit/plugin-defi
```

### Setup

```bash
cp .env.example .env
# Edit .env with your TON_MNEMONIC and TON_NETWORK
```

### Basic Usage

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import TokenPlugin from "@ton-agent-kit/plugin-token";
import DefiPlugin from "@ton-agent-kit/plugin-defi";

const wallet = await KeypairWallet.fromMnemonic(mnemonic, {
  version: "V5R1",
  network: "testnet",
});

const agent = new TonAgentKit(wallet, "https://testnet-v4.tonhubapi.com")
  .use(TokenPlugin)
  .use(DefiPlugin);

// Check balance
const balance = await agent.methods.get_balance({});

// Transfer TON (with balance guard — prevents insufficient funds)
await agent.methods.transfer_ton({
  to: "0:a5556ae...",
  amount: "5",
  comment: "Payment from AI agent",
});
```

### Auto-detect Wallet Version

```typescript
const agent = await TonAgentKit.fromMnemonic(
  mnemonic.split(" "),
  "https://testnet-v4.tonhubapi.com",
);
// Auto-detects V5R1, V4, or V3R2 based on which has funds
```

---

## Plugins & Actions

**29 actions across 9 plugins.** Install only what you need.

### 🪙 Token Plugin (6 actions)

| Action | Description | Status |
|--------|-------------|--------|
| `get_balance` | Get TON balance (any address format: raw, EQ, UQ) | ✅ Live testnet + mainnet |
| `get_jetton_balance` | Get Jetton (USDT, NOT, etc.) balance via TONAPI | ✅ Live |
| `transfer_ton` | Send TON with balance guard + comment support | ✅ Live (TX confirmed) |
| `transfer_jetton` | Send Jettons | ✅ Schema validated |
| `deploy_jetton` | Deploy a new token | ✅ Live |
| `get_jetton_info` | Get token metadata | ✅ Schema validated |

### 📈 DeFi Plugin (3 actions)

| Action | Description | Status |
|--------|-------------|--------|
| `swap_dedust` | Swap on DeDust DEX (mainnet) | ✅ Schema validated |
| `swap_stonfi` | Swap on STON.fi DEX | ✅ Schema validated |
| `get_price` | Get token price in USD and TON | ✅ Live ($1.00 USDT) |

### 🖼️ NFT Plugin (3 actions)

| Action | Description | Status |
|--------|-------------|--------|
| `get_nft_info` | Get NFT metadata and owner | ✅ Live |
| `get_nft_collection` | Get collection info | ✅ Live ("Telegram Usernames") |
| `transfer_nft` | Transfer an NFT | ✅ Schema validated |

### 🌐 DNS Plugin (3 actions)

| Action | Description | Status |
|--------|-------------|--------|
| `resolve_domain` | Resolve `.ton` domain → address | ✅ Live (foundation.ton) |
| `lookup_address` | Reverse lookup: address → domain | ✅ Live |
| `get_domain_info` | Get domain registration details | ✅ Live |

### 💰 Staking Plugin (3 actions)

| Action | Description | Status |
|--------|-------------|--------|
| `stake_ton` | Stake TON with a validator pool | ✅ Schema validated |
| `unstake_ton` | Unstake from a pool | ✅ Schema validated |
| `get_staking_info` | Get staking positions and rewards | ✅ Live |

### 📊 Wallet Analytics Plugin (2 actions)

| Action | Description | Status |
|--------|-------------|--------|
| `get_transaction_history` | Recent transactions with details | ✅ Live |
| `get_wallet_info` | Wallet status, type, last activity | ✅ Live |

### 🔒 Escrow Plugin (5 actions)

*Trustless escrow for agent-to-agent and P2P deals. Tact smart contract included.*

| Action | Description | Status |
|--------|-------------|--------|
| `create_escrow` | Create a deal with deadline + arbiter | ✅ Live |
| `deposit_to_escrow` | Lock funds with on-chain TX | ✅ Live |
| `release_escrow` | Release to beneficiary | ✅ Live |
| `refund_escrow` | Refund after deadline or by arbiter | ✅ Live |
| `get_escrow_info` | Get status or list all escrows | ✅ Live |

### 🪪 Agent Identity Plugin (3 actions)

*Agent registry with capabilities and reputation scoring.*

| Action | Description | Status |
|--------|-------------|--------|
| `register_agent` | Register with name + capabilities | ✅ Live |
| `discover_agent` | Find agents by capability or name | ✅ Live |
| `get_agent_reputation` | Read + update reputation scores | ✅ Live |

### ⚡ Payments Plugin (1 action: pay_for_resource + x402 middleware)

*Production-hardened HTTP payment middleware for agent-to-agent commerce.*

| Action | Description | Status |
|--------|-------------|--------|
| `pay_for_resource` | Auto-pay for x402-gated APIs | ✅ Live |

```typescript
// Make any API payable in TON — 3 lines
import { tonPaywall } from "./x402-middleware";

app.get("/api/data", tonPaywall({ amount: "0.001", recipient: "0:abc..." }), (req, res) => {
  res.json({ price: 3.85 });
});
```

---

## Agent Commerce Protocol

The plugins combine into a **complete agent economy**:

```
1. IDENTITY — Agent registers as trading-bot with capabilities
        ↓
2. DISCOVERY — Other agents find it via discover_agent
        ↓
3. PAYMENT — Auto-pay via x402 middleware
        ↓
4. ESCROW — Trustless task verification via smart contract
        ↓
5. REPUTATION — Completed tasks build reputation score
        ↓
6. CONTROL — Users approve high-value actions via Telegram HITL
```

This is the **first Agent Commerce Protocol on TON** — agents discover, pay, trust, and rate each other autonomously.

### Demo

See the full agent-to-agent commerce flow in action:

```bash
bun run demo-agent-commerce.ts
```

Two AI agents negotiate, pay, and rate each other through the complete cycle: Identity → Discovery → Escrow → Service → Reputation. See [demo-agent-commerce.ts](demo-agent-commerce.ts) for the full source.

---

## MCP Server

Let Claude, GPT, Cursor, or any MCP-compatible AI interact with TON directly. **29 tools available.**

### Setup (Claude Desktop)

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

### Tested live in Claude Desktop:

> **You:** "What's my TON balance?"
> **Claude:** → "Your balance is 3.98 TON"

> **You:** "Send 0.01 TON to 0:921... with comment hello"
> **Claude:** → "Sent 0.01 TON. TX confirmed."

> **You:** "Register an agent called market-data with capabilities price_feed, analytics"
> **Claude:** → "Registered! ID: agent_market-data, reputation: 0"

> **You:** "Create an escrow for 0.5 TON to 0:921..."
> **Claude:** → "Escrow created, deadline: 30 minutes"

---

## x402 Payment Middleware

Production-hardened HTTP payment middleware for TON.

### Security:
- **Anti-replay** — each tx hash used only once (pluggable: FileStore, RedisStore, Custom)
- **Timestamp check** — transactions must be < 5 min old
- **Smart tolerance** — 0.0005 TON cross-transfer, 0.005 TON self-transfer
- **2-level verification** — blockchain endpoint → events fallback

### Storage options:
```typescript
// Default — file-based, zero dependencies
const app = createPaymentServer({ recipient: "0:abc...", routes: [...] });

// Upstash Redis — production scale
const app = createPaymentServer({
  recipient: "0:abc...",
  replayStore: new RedisReplayStore(new Redis({ url: "...", token: "..." })),
  routes: [...],
});

// Custom — implement ReplayStore interface (PostgreSQL, MongoDB, DynamoDB...)
```

### Test results (5/5):
```
✅ Free endpoint (200)    ✅ 402 Payment Required
✅ Payment sent on-chain  ✅ Paid access (200)
✅ Second paywall (402)
```

---

## Telegram Bot

AI agent bot with natural language, HITL approval, and 9 blockchain actions.

### Features:
- Natural language understanding via configurable LLM (default: GPT-4.1-nano)
- **HITL approval** — transfers > 0.05 TON require Approve/Reject buttons
- **Balance guard** — prevents sending more than available balance
- Escrow management, DNS resolution, staking info
- Per-user chat history
- Error recovery with Markdown fallback
- Concurrent processing via @grammyjs/runner

### Demo:

```
User: What's my balance?
Bot:  Your current balance is 3.9522 TON.

User: Send 1 TON to 0:921...
Bot:  🔔 Approval Required
      Send 1 TON to 0:921...
      [✅ Approve]  [❌ Reject]

User: [taps ✅ Approve]
Bot:  ✅ Approved! Executing transaction...
      Successfully sent 1.0000 TON. Remaining balance: 2.9422 TON.

User: Send 100 TON to 0:921...
Bot:  Insufficient balance. You have approximately 2.93 TON.
```

### Run:
```bash
# Add to .env: TELEGRAM_BOT_TOKEN, OPENAI_API_KEY
bun run telegram-bot.ts
```

---

## Architecture

```
ton-agent-kit/
├── packages/
│   ├── core/               # TonAgentKit, plugin system, wallet (V3/V4/V5 auto-detect)
│   ├── plugin-token/       # TON & Jetton operations (6 actions)
│   ├── plugin-defi/        # DeDust & STON.fi (3 actions)
│   ├── plugin-nft/         # NFT operations (3 actions)
│   ├── plugin-dns/         # TON DNS: resolve, lookup, info (3 actions)
│   ├── plugin-staking/     # TON staking (3 actions)
│   ├── plugin-analytics/   # Wallet analytics (2 actions)
│   ├── plugin-escrow/      # Trustless escrow (5 actions)
│   ├── plugin-identity/    # Agent registry + reputation (3 actions)
│   ├── plugin-payments/    # x402 pay_for_resource (1 action)
│   ├── mcp-server/         # MCP server for Claude/GPT
│   ├── langchain/          # LangChain tool wrappers
│   └── ai-tools/           # Vercel AI SDK tools
├── contracts/
│   └── escrow.tact         # Escrow smart contract (Tact)
├── mcp-server.ts           # Standalone MCP server (29 tools)
├── telegram-bot.ts         # Telegram bot with HITL
├── x402-middleware.ts       # x402 payment middleware (production-hardened)
├── demo-agent-commerce.ts  # Agent Commerce Protocol demo
├── test-all-actions.ts     # Full test suite (69/69 passing)
├── test-x402.ts            # x402 end-to-end test (5/5 passing)
├── .env.example            # Environment variable template
└── ARCHITECTURE.md
```

---

## Test Results

### Full Suite (69/69 — 68 pass, 1 skip)
```
✅ get_balance          ✅ get_wallet_info       ✅ get_transaction_history
✅ get_staking_info     ✅ get_jetton_balance    ✅ resolve_domain
✅ lookup_address       ✅ get_domain_info       ✅ get_price
✅ get_nft_info         ✅ get_nft_collection    ✅ transfer_ton (schema)
✅ transfer_jetton      ✅ transfer_nft          ✅ swap_dedust (schema)
✅ swap_stonfi          ✅ stake_ton (schema)    ✅ unstake_ton (schema)
✅ deploy_jetton        ✅ get_jetton_info       ✅ create_escrow
✅ deposit_to_escrow    ✅ release_escrow        ✅ refund_escrow
✅ get_escrow_info      ✅ register_agent        ✅ discover_agent
✅ get_agent_reputation ✅ pay_for_resource
```

### Claude Desktop MCP (8/8 passing)
```
✅ get_balance     ✅ get_wallet_info     ✅ get_transaction_history
✅ get_staking_info   ✅ resolve_domain   ✅ get_price
✅ get_nft_collection   ✅ ton_agent_info
```

### x402 Middleware (5/5 passing)
### Telegram Bot (9/9 passing)

---

## Comparison

| Feature | TON Agent Kit | Solana Agent Kit | Coinbase AgentKit |
|---------|--------------|-----------------|-------------------|
| **Chain** | TON | Solana | Base/ETH |
| **Actions** | 29 | 60+ | 50+ |
| **MCP Server** | ✅ | ✅ | ✅ |
| **LangChain** | ✅ | ✅ | ✅ |
| **Multi-provider** | ✅ OpenAI, OpenRouter, Groq, Together, Mistral | Partial | Partial |
| **x402 Middleware** | ✅ Production-hardened | ❌ | ❌ |
| **Agent identity** | ✅ Registry + reputation | ❌ | ❌ |
| **Escrow** | ✅ Smart contract | ❌ | ❌ |
| **Human-in-the-loop** | ✅ Telegram native | ❌ | Partial (TEE) |
| **1B user distribution** | ✅ Telegram | ❌ | ❌ |
| **Plugin system** | ✅ `.use()` | ✅ `.use()` | ✅ |

---

## Tech Stack

- **TypeScript** + **Bun** — Full type safety, fast runtime
- **@ton/ton** + **@ton/core** + **@ton/crypto** — TON blockchain
- **@dedust/sdk** + **@ston-fi/sdk** — DEX integrations
- **@modelcontextprotocol/sdk** — MCP server
- **grammY** + **@grammyjs/runner** — Telegram bot
- **OpenAI** (configurable via AI_MODEL env var) — Natural language
- **Express** — x402 payment server
- **Tact** — Smart contracts (escrow)
- **Zod** — Schema validation
- **TONAPI** — Indexed blockchain data

---

## Production Roadmap

- [ ] Pluggable storage adapter for chat history (File / Redis / Custom)
- [ ] Automatic escrow expiration and cleanup
- [ ] Session key smart contract deployment (Tact)
- [ ] TON DNS subdomain registration for agent identity
- [ ] ADNL agent-to-agent encrypted communication
- [ ] Payment channel integration via tonweb SDK for zero-fee streaming payments
- [ ] npm package publishing (@ton-agent-kit/*)
- [ ] Unit tests with @ton/sandbox
- [ ] Rate limiting and spending caps per session

---

## Contributing

```typescript
import { definePlugin, defineAction } from "@ton-agent-kit/core";
import { z } from "zod";

const MyPlugin = definePlugin({
  name: "my-plugin",
  actions: [
    defineAction({
      name: "my_action",
      description: "Does something cool on TON",
      schema: z.object({ param: z.string() }),
      handler: async (agent, params) => ({ result: "success" }),
    }),
  ],
});
```

---

## License

MIT

---

<p align="center">
  <strong>Built for the TON AI Hackathon 2026</strong><br>
  <em>The infrastructure for the AI agent economy on TON.</em>
</p>
