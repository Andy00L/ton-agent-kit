<p align="center">
  <h1 align="center">🤖 TON Agent Kit</h1>
  <p align="center"><strong>The Agent Commerce Protocol for TON</strong></p>
  <p align="center">Connect any AI agent to TON. Build agent economies. Control them from Telegram.</p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ton-agent-kit/core"><img src="https://img.shields.io/npm/v/@ton-agent-kit/core?label=%40ton-agent-kit%2Fcore" alt="npm"></a>
  <a href="https://www.npmjs.com/search?q=%40ton-agent-kit"><img src="https://img.shields.io/badge/npm-13%20packages-blue" alt="npm packages"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License"></a>
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

Agents discover each other via **agent registry**. They pay each other via **x402 middleware**. Users control them safely from **Telegram with human-in-the-loop approval**. And any AI (Claude, GPT, LangChain, Vercel AI) can interact with TON through a single **MCP server with 29 tools**. Works with **any LLM provider** — OpenAI, OpenRouter, Groq, Together, Mistral. Agents can run fully autonomously via **`agent.runLoop()`** — give a natural-language goal, the LLM decides which on-chain actions to execute.

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
| Escrow | — | — | ❌ | ✅ **On-chain Tact escrow smart contract** |
| Autonomous Runtime | — | — | ❌ | ✅ **`agent.runLoop()` — LLM-driven execution** |
| User Access | — | — | — | ✅ **1B Telegram users** |

---

## Quick Start

### Install

```bash
npm install @ton-agent-kit/core @ton-agent-kit/plugin-token @ton-agent-kit/plugin-defi
```

> **Contributing?** Clone the repo instead:
> ```bash
> git clone https://github.com/aspect-build/ton-agent-kit.git
> cd ton-agent-kit && bun install
> ```

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

### LLM Tool Integration (`agent.toAITools()`)

Works with any LLM provider — OpenAI, Anthropic, Google, Groq, Mistral, OpenRouter, Together.

```typescript
// Build AI-compatible tools — works with OpenAI, Anthropic, Google, Groq, Mistral
const tools = agent.toAITools();

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Send 1 TON to alice.ton" }],
  tools,
});
```

### Autonomous Runtime (`agent.runLoop()`)

Give your agent a natural-language goal — the LLM decides which blockchain actions to execute, autonomously.

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import TokenPlugin from "@ton-agent-kit/plugin-token";
import DefiPlugin from "@ton-agent-kit/plugin-defi";
import DnsPlugin from "@ton-agent-kit/plugin-dns";

const agent = new TonAgentKit(wallet, rpcUrl)
  .use(TokenPlugin)
  .use(DefiPlugin)
  .use(DnsPlugin);

const result = await agent.runLoop(
  "Check my TON balance, get the USDT price, and calculate my holdings in USD",
  {
    model: "gpt-4.1-nano",        // or any OpenAI-compatible model
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL, // OpenRouter, Groq, Together, Mistral
  },
);

console.log(result.summary); // "Your balance is 3.98 TON worth ~$15.12 USD"
console.log(result.steps);   // [{action: "get_balance", ...}, {action: "get_price", ...}]
```

The agent autonomously plans, executes actions, and returns a structured summary. Supports any OpenAI-compatible provider via `baseURL`.

### Auto-detect Wallet Version

```typescript
const agent = await TonAgentKit.fromMnemonic(
  mnemonic.split(" "),
  "https://testnet-v4.tonhubapi.com",
);
// Auto-detects V5R1, V4, or V3R2 based on which has funds
```

---

## Available Packages

All 13 packages are published on npm under the `@ton-agent-kit` scope. Install only what you need.

| Package | Description | npm |
|---------|-------------|-----|
| `@ton-agent-kit/core` | Core SDK — plugin system, wallet, agent | [![npm](https://img.shields.io/npm/v/@ton-agent-kit/core)](https://www.npmjs.com/package/@ton-agent-kit/core) |
| `@ton-agent-kit/plugin-token` | TON & Jetton operations | [![npm](https://img.shields.io/npm/v/@ton-agent-kit/plugin-token)](https://www.npmjs.com/package/@ton-agent-kit/plugin-token) |
| `@ton-agent-kit/plugin-defi` | DeDust & STON.fi swaps, prices | [![npm](https://img.shields.io/npm/v/@ton-agent-kit/plugin-defi)](https://www.npmjs.com/package/@ton-agent-kit/plugin-defi) |
| `@ton-agent-kit/plugin-nft` | NFT operations | [![npm](https://img.shields.io/npm/v/@ton-agent-kit/plugin-nft)](https://www.npmjs.com/package/@ton-agent-kit/plugin-nft) |
| `@ton-agent-kit/plugin-dns` | TON DNS resolution & management | [![npm](https://img.shields.io/npm/v/@ton-agent-kit/plugin-dns)](https://www.npmjs.com/package/@ton-agent-kit/plugin-dns) |
| `@ton-agent-kit/plugin-staking` | Stake/unstake TON | [![npm](https://img.shields.io/npm/v/@ton-agent-kit/plugin-staking)](https://www.npmjs.com/package/@ton-agent-kit/plugin-staking) |
| `@ton-agent-kit/plugin-analytics` | Transaction history & wallet info | [![npm](https://img.shields.io/npm/v/@ton-agent-kit/plugin-analytics)](https://www.npmjs.com/package/@ton-agent-kit/plugin-analytics) |
| `@ton-agent-kit/plugin-escrow` | On-chain Tact escrow contracts | [![npm](https://img.shields.io/npm/v/@ton-agent-kit/plugin-escrow)](https://www.npmjs.com/package/@ton-agent-kit/plugin-escrow) |
| `@ton-agent-kit/plugin-identity` | Agent registry & reputation | [![npm](https://img.shields.io/npm/v/@ton-agent-kit/plugin-identity)](https://www.npmjs.com/package/@ton-agent-kit/plugin-identity) |
| `@ton-agent-kit/plugin-payments` | x402 payment processing | [![npm](https://img.shields.io/npm/v/@ton-agent-kit/plugin-payments)](https://www.npmjs.com/package/@ton-agent-kit/plugin-payments) |
| `@ton-agent-kit/mcp-server` | MCP server for Claude/GPT/Cursor | [![npm](https://img.shields.io/npm/v/@ton-agent-kit/mcp-server)](https://www.npmjs.com/package/@ton-agent-kit/mcp-server) |
| `@ton-agent-kit/langchain` | LangChain tool wrappers | [![npm](https://img.shields.io/npm/v/@ton-agent-kit/langchain)](https://www.npmjs.com/package/@ton-agent-kit/langchain) |
| `@ton-agent-kit/ai-tools` | Vercel AI SDK & OpenAI tools | [![npm](https://img.shields.io/npm/v/@ton-agent-kit/ai-tools)](https://www.npmjs.com/package/@ton-agent-kit/ai-tools) |

---

## Plugins & Actions

**29 actions across 9 plugins.** Install only what you need.

### 🪙 Token Plugin (6 actions)

```bash
npm install @ton-agent-kit/plugin-token
```

| Action | Description | Status |
|--------|-------------|--------|
| `get_balance` | Get TON balance (any address format: raw, EQ, UQ) | ✅ Live testnet + mainnet |
| `get_jetton_balance` | Get Jetton (USDT, NOT, etc.) balance via TONAPI | ✅ Live |
| `transfer_ton` | Send TON with balance guard + comment support | ✅ Live (TX confirmed) |
| `transfer_jetton` | Send Jettons | ✅ Schema validated |
| `deploy_jetton` | Deploy a new token | ✅ Live (AgentCoin deployed on testnet) |
| `get_jetton_info` | Get token metadata | ✅ Schema validated |

### 📈 DeFi Plugin (3 actions)

```bash
npm install @ton-agent-kit/plugin-defi
```

| Action | Description | Status |
|--------|-------------|--------|
| `swap_dedust` | Swap on DeDust DEX (mainnet) | ✅ Schema validated |
| `swap_stonfi` | Swap on STON.fi DEX | ✅ Schema validated |
| `get_price` | Get token price in USD and TON | ✅ Live ($1.00 USDT) |

### 🖼️ NFT Plugin (3 actions)

```bash
npm install @ton-agent-kit/plugin-nft
```

| Action | Description | Status |
|--------|-------------|--------|
| `get_nft_info` | Get NFT metadata and owner | ✅ Live |
| `get_nft_collection` | Get collection info | ✅ Live ("Telegram Usernames") |
| `transfer_nft` | Transfer an NFT | ✅ Schema validated |

### 🌐 DNS Plugin (3 actions)

```bash
npm install @ton-agent-kit/plugin-dns
```

| Action | Description | Status |
|--------|-------------|--------|
| `resolve_domain` | Resolve `.ton` domain → address | ✅ Live (foundation.ton) |
| `lookup_address` | Reverse lookup: address → domain | ✅ Live |
| `get_domain_info` | Get domain registration details | ✅ Live |

### 💰 Staking Plugin (3 actions)

```bash
npm install @ton-agent-kit/plugin-staking
```

| Action | Description | Status |
|--------|-------------|--------|
| `stake_ton` | Stake TON with a validator pool | ✅ Schema validated |
| `unstake_ton` | Unstake from a pool | ✅ Schema validated |
| `get_staking_info` | Get staking positions and rewards | ✅ Live |

### 📊 Wallet Analytics Plugin (2 actions)

```bash
npm install @ton-agent-kit/plugin-analytics
```

| Action | Description | Status |
|--------|-------------|--------|
| `get_transaction_history` | Recent transactions with details | ✅ Live |
| `get_wallet_info` | Wallet status, type, last activity | ✅ Live |

### 🔒 Escrow Plugin (5 actions)

```bash
npm install @ton-agent-kit/plugin-escrow
```

*On-chain trustless escrow — each deal deploys a Tact smart contract to TON. All state (deposit, release, refund) is on-chain.*

| Action | Description | Status |
|--------|-------------|--------|
| `create_escrow` | Deploy escrow contract with deadline + arbiter | ✅ Live (on-chain) |
| `deposit_to_escrow` | Lock funds in escrow contract | ✅ Live (on-chain) |
| `release_escrow` | Release to beneficiary via contract | ✅ Live (on-chain) |
| `refund_escrow` | Refund after deadline or by arbiter via contract | ✅ Live (on-chain) |
| `get_escrow_info` | Read on-chain contract state | ✅ Live (on-chain) |

### 🪪 Agent Identity Plugin (3 actions)

```bash
npm install @ton-agent-kit/plugin-identity
```

*Agent registry with capabilities and reputation scoring.*

| Action | Description | Status |
|--------|-------------|--------|
| `register_agent` | Register with name + capabilities | ✅ Live |
| `discover_agent` | Find agents by capability or name | ✅ Live |
| `get_agent_reputation` | Read + update reputation scores | ✅ Live |

### ⚡ Payments Plugin (1 action: pay_for_resource + x402 middleware)

```bash
npm install @ton-agent-kit/plugin-payments
```

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
4. ESCROW — Trustless task verification via on-chain Tact smart contract
        ↓
5. REPUTATION — Completed tasks build reputation score
        ↓
6. CONTROL — Users approve high-value actions via Telegram HITL
```

This is the **first Agent Commerce Protocol on TON** — agents discover, pay, trust, and rate each other autonomously.

### Multi-Agent Commerce Demo

Two AI agents with **separate wallets** execute **real on-chain commerce** — every transaction verifiable on [tonviewer.com](https://tonviewer.com):

```bash
# Set TON_MNEMONIC (Agent A) and TON_MNEMONIC_AGENT_B (Agent B) in .env
bun run demo-agent-commerce.ts
```

**Full flow:**
1. **Identity** — Both agents register with capabilities
2. **Discovery** — Agent B discovers Agent A by capability
3. **Escrow** — Agent B deploys an on-chain Tact escrow contract
4. **Deposit** — Agent B locks TON in the escrow contract
5. **Service** — Agent A delivers market data
6. **Release** — Agent B releases funds to Agent A via the contract
7. **Reputation** — Both agents rate each other
8. **Verify** — All transactions visible on tonviewer.com

See [demo-agent-commerce.ts](demo-agent-commerce.ts) for the full source.

### Autonomous Runtime Demo

```bash
bun run demo-runloop.ts                # run 3 built-in scenarios
bun run demo-runloop.ts "custom goal"  # run a custom goal
```

The agent receives a natural-language goal and autonomously plans + executes blockchain actions. See [demo-runloop.ts](demo-runloop.ts) for 3 demo scenarios (balance analysis, autonomous transfer, multi-step research).

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
│   └── escrow.tact         # Escrow smart contract (Tact — on-chain)
├── mcp-server.ts           # Standalone MCP server (29 tools)
├── telegram-bot.ts         # Telegram bot with HITL
├── x402-middleware.ts       # x402 payment middleware (production-hardened)
├── demo-agent-commerce.ts  # Multi-agent commerce demo (2 wallets, on-chain escrow)
├── demo-runloop.ts         # Autonomous agent runtime demo (3 scenarios)
├── test-all-actions.ts     # Full test suite (63/64 passing, 1 skip)
├── test-x402.ts            # x402 end-to-end test (5/5 passing)
├── .env.example            # Environment variable template
└── ARCHITECTURE.md
```

---

## Test Results

### Full Suite (63/64 — 63 pass, 1 skip)
```
✅ get_balance          ✅ get_wallet_info       ✅ get_transaction_history
✅ get_staking_info     ✅ get_jetton_balance    ✅ resolve_domain
✅ lookup_address       ✅ get_domain_info       ✅ get_price
✅ get_nft_info         ✅ get_nft_collection    ✅ transfer_ton (schema)
✅ transfer_jetton      ✅ transfer_nft          ✅ swap_dedust (schema)
✅ swap_stonfi          ✅ stake_ton (schema)    ✅ unstake_ton (schema)
✅ deploy_jetton        ✅ get_jetton_info       ✅ create_escrow (on-chain)
✅ deposit_to_escrow    ✅ release_escrow        ✅ refund_escrow
✅ get_escrow_info      ✅ register_agent        ✅ discover_agent
✅ get_agent_reputation ✅ pay_for_resource
```

### Autonomous Runtime — runLoop (3/3 passing)
```
✅ Balance & Price Analysis — multi-step autonomous reasoning
✅ Autonomous Transfer — send TON + verify balance
✅ Multi-Step Research — resolve domain + check balance + get price
```

### x402 Middleware (5/5 passing)
```
✅ Free endpoint (200)    ✅ 402 Payment Required
✅ Payment sent on-chain  ✅ Paid access (200)
✅ Second paywall (402)
```

### Claude Desktop MCP (8/8 passing)
### Telegram Bot (9/9 passing)

---

## Comparison

| Feature | TON Agent Kit | Solana Agent Kit | Coinbase AgentKit |
|---------|--------------|-----------------|-------------------|
| **Chain** | TON | Solana | Base/ETH |
| **Actions** | 29 | 60+ | 50+ |
| **Autonomous Runtime** | ✅ `agent.runLoop()` — LLM-driven | ❌ | ❌ |
| **On-chain Escrow** | ✅ Tact smart contract | ❌ | ❌ |
| **MCP Server** | ✅ | ✅ | ✅ |
| **LangChain** | ✅ | ✅ | ✅ |
| **Multi-provider** | ✅ OpenAI, OpenRouter, Groq, Together, Mistral | Partial | Partial |
| **x402 Middleware** | ✅ Production-hardened | ❌ | ❌ |
| **Agent identity** | ✅ Registry + reputation | ❌ | ❌ |
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
- **Zod v4** — Schema validation + native `toJSONSchema()` (no external converters)
- **TONAPI** — Indexed blockchain data

---

## Production Roadmap

- [x] npm package publishing (@ton-agent-kit/* — 13 packages live)
- [ ] Payment channel integration via tonweb SDK for zero-fee streaming payments
- [ ] On-chain agent identity (TON DNS — register agents as .ton subdomains)
- [ ] Multi-wallet support per agent (hot/cold wallet separation)
- [ ] Pluggable storage adapter for chat history (File / Redis / Custom)
- [ ] Automatic escrow expiration and cleanup
- [ ] Session key smart contract deployment (Tact)
- [ ] ADNL agent-to-agent encrypted communication
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
