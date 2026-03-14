<p align="center">
  <h1 align="center">🤖 TON Agent Kit</h1>
  <p align="center"><strong>The Agent Commerce Protocol for TON</strong></p>
  <p align="center">Connect any AI agent to TON. Build agent economies. Control them from Telegram.</p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ton-agent-kit/core"><img src="https://img.shields.io/npm/v/@ton-agent-kit/core?label=%40ton-agent-kit%2Fcore" alt="npm"></a>
  <a href="https://www.npmjs.com/search?q=%40ton-agent-kit"><img src="https://img.shields.io/badge/npm-14%20packages-blue" alt="npm packages"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#available-packages">Packages</a> •
  <a href="#plugins--actions">Plugins</a> •
  <a href="#agent-commerce-protocol">Agent Commerce</a> •
  <a href="#mcp-server">MCP Server</a> •
  <a href="#x402-payment-middleware">x402 Payments</a> •
  <a href="#telegram-bot">Telegram Bot</a> •
  <a href="#autonomous-runtime">Autonomous Runtime</a> •
  <a href="#examples">Examples</a> •
  <a href="#test-results">Tests</a>
</p>

---

## What is TON Agent Kit?

TON Agent Kit is more than an SDK — it's the **infrastructure for an AI agent economy on TON**.

The toolkit ships as **14 npm packages** with **29 actions** across **9 plugins**. Call `agent.toAITools()` to get OpenAI-compatible function definitions that work with any LLM provider — OpenAI, Anthropic, Google, Groq, Mistral, OpenRouter, Together. Call `agent.runLoop("goal")` to hand a natural-language objective to the LLM and let it autonomously plan and execute on-chain actions. Agents discover each other via an **agent registry** with reputation scoring. They pay each other through **x402 middleware** — production-hardened with anti-replay protection, timestamp verification, and 2-level on-chain validation. Trustless task payment flows through an **on-chain Tact escrow smart contract** deployed per deal. Users control agents safely from **Telegram with human-in-the-loop approval buttons**. And any AI — Claude Desktop, Cursor, GPT — can interact with TON through a single **MCP server** exposing all 29 tools. The [multi-agent commerce demo](demo-agent-commerce.ts) runs the full protocol with **2 real wallets** and **8 on-chain steps**.

### The Problem

On Solana, the [Solana Agent Kit](https://github.com/sendaifun/solana-agent-kit) (1,600+ stars) gave agents blockchain access. On Base, [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) registered 123,000+ agents in 2 months. On Ethereum, x402 processed 162M+ transactions for agent-to-agent payments.

**On TON? Nothing.** Despite having the best architecture for AI agents — native payment channels, encrypted P2P networking (ADNL), decentralized DNS, and 1 billion Telegram users.

### The Solution

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
npm install @ton-agent-kit/core @ton-agent-kit/plugin-token @ton-agent-kit/plugin-defi zod
```

> **Peer Dependencies:** All `@ton-agent-kit/*` packages require `zod` (>=4.0.0) as a peer dependency. You must install it explicitly alongside the SDK. This ensures a single Zod instance is shared across the SDK, which is critical for `toAITools()` — Zod v4's `toJSONSchema()` only works when schemas are created by the same Zod instance that generates the JSON schema.

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

Works with any LLM provider — OpenAI, Anthropic, Google, Groq, Mistral, OpenRouter, Together. Uses Zod v4 native `toJSONSchema()` for proper JSON schema generation — produces correct parameter names and types. Works correctly via `npm install` (the dual-Zod instance problem has been solved by making `zod` a peer dependency).

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

All 14 packages are published on npm under the `@ton-agent-kit` scope. Install only what you need.

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
| `@ton-agent-kit/x402-middleware` | x402 payment middleware for Express | [![npm](https://img.shields.io/npm/v/@ton-agent-kit/x402-middleware)](https://www.npmjs.com/package/@ton-agent-kit/x402-middleware) |

---

## Plugins & Actions

**29 actions across 9 plugins.** Install only what you need.

### 🪙 Token Plugin (6 actions)

```bash
npm install @ton-agent-kit/plugin-token zod
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
npm install @ton-agent-kit/plugin-defi zod
```

| Action | Description | Status |
|--------|-------------|--------|
| `swap_dedust` | Swap on DeDust DEX (mainnet) | ✅ Schema validated |
| `swap_stonfi` | Swap on STON.fi DEX | ✅ Schema validated |
| `get_price` | Get token price in USD and TON | ✅ Live ($1.00 USDT) |

### 🖼️ NFT Plugin (3 actions)

```bash
npm install @ton-agent-kit/plugin-nft zod
```

| Action | Description | Status |
|--------|-------------|--------|
| `get_nft_info` | Get NFT metadata and owner | ✅ Live |
| `get_nft_collection` | Get collection info | ✅ Live ("Telegram Usernames") |
| `transfer_nft` | Transfer an NFT | ✅ Schema validated |

### 🌐 DNS Plugin (3 actions)

```bash
npm install @ton-agent-kit/plugin-dns zod
```

| Action | Description | Status |
|--------|-------------|--------|
| `resolve_domain` | Resolve `.ton` domain → address | ✅ Live (foundation.ton) |
| `lookup_address` | Reverse lookup: address → domain | ✅ Live |
| `get_domain_info` | Get domain registration details | ✅ Live |

### 💰 Staking Plugin (3 actions)

```bash
npm install @ton-agent-kit/plugin-staking zod
```

| Action | Description | Status |
|--------|-------------|--------|
| `stake_ton` | Stake TON with a validator pool | ✅ Schema validated |
| `unstake_ton` | Unstake from a pool | ✅ Schema validated |
| `get_staking_info` | Get staking positions and rewards | ✅ Live |

### 📊 Wallet Analytics Plugin (2 actions)

```bash
npm install @ton-agent-kit/plugin-analytics zod
```

| Action | Description | Status |
|--------|-------------|--------|
| `get_transaction_history` | Recent transactions with details | ✅ Live |
| `get_wallet_info` | Wallet status, type, last activity | ✅ Live |

### 🔒 Escrow Plugin (5 actions)

```bash
npm install @ton-agent-kit/plugin-escrow zod
```

*On-chain trustless escrow — each deal deploys a [Tact smart contract](contracts/escrow.tact) to TON. All state (deposit, release, refund) is on-chain and verifiable on [tonviewer.com](https://tonviewer.com).*

| Action | Description | Status |
|--------|-------------|--------|
| `create_escrow` | Deploy escrow contract with deadline + arbiter | ✅ Live (on-chain) |
| `deposit_to_escrow` | Lock funds in escrow contract | ✅ Live (on-chain) |
| `release_escrow` | Release to beneficiary via contract | ✅ Live (on-chain) |
| `refund_escrow` | Refund after deadline or by arbiter via contract | ✅ Live (on-chain) |
| `get_escrow_info` | Read on-chain contract state | ✅ Live (on-chain) |

### 🪪 Agent Identity Plugin (3 actions)

```bash
npm install @ton-agent-kit/plugin-identity zod
```

*Agent registry with capabilities and reputation scoring.*

| Action | Description | Status |
|--------|-------------|--------|
| `register_agent` | Register with name + capabilities | ✅ Live |
| `discover_agent` | Find agents by capability or name | ✅ Live |
| `get_agent_reputation` | Read + update reputation scores | ✅ Live |

### ⚡ Payments Plugin (1 action)

```bash
npm install @ton-agent-kit/plugin-payments zod
```

*Client-side x402 payment — auto-detects 402 responses, pays, and retries.*

| Action | Description | Status |
|--------|-------------|--------|
| `pay_for_resource` | Auto-pay for x402-gated APIs | ✅ Live |

---

## Agent Commerce Protocol

The plugins combine into a **complete agent economy**:

```mermaid
flowchart LR
    A[🆔 Identity] --> B[🔍 Discovery]
    B --> C[💳 Payment x402]
    C --> D[🔒 Escrow On-chain]
    D --> E[⭐ Reputation]
    E --> F[🎮 Control HITL]
```

```
1. IDENTITY    — Agent registers as trading-bot with capabilities
       ↓
2. DISCOVERY   — Other agents find it via discover_agent
       ↓
3. PAYMENT     — Auto-pay via x402 middleware (HTTP 402 → pay → retry)
       ↓
4. ESCROW      — Trustless task verification via on-chain Tact smart contract
       ↓
5. REPUTATION  — Completed tasks build reputation score
       ↓
6. CONTROL     — Users approve high-value actions via Telegram HITL
```

This is the **first Agent Commerce Protocol on TON** — agents discover, pay, trust, and rate each other autonomously.

### Multi-Agent Commerce Demo

Two AI agents with **separate wallets** execute **real on-chain commerce** — every transaction verifiable on [tonviewer.com](https://tonviewer.com):

```bash
# Set TON_MNEMONIC (Agent A) and TON_MNEMONIC_AGENT_B (Agent B) in .env
bun run demo-agent-commerce.ts
```

**Full 8-step flow:**
1. **Identity** — Both agents register with capabilities (separate wallets)
2. **Discovery** — Agent B discovers Agent A by `price_feed` capability
3. **Escrow** — Agent B deploys an on-chain Tact escrow contract (0.05 TON, 10 min deadline)
4. **Deposit** — Agent B locks TON in the escrow contract
5. **Service** — Agent A delivers market data (USDT price)
6. **Release** — Agent B releases funds to Agent A via the contract
7. **Reputation** — Both agents rate each other (100/100)
8. **Verify** — Agent A balance confirmed increased, all TXs on tonviewer.com

See [demo-agent-commerce.ts](demo-agent-commerce.ts) for the full source.

---

## MCP Server

Let Claude, GPT, Cursor, or any MCP-compatible AI interact with TON directly. **29 tools available.**

### Setup (Claude Desktop)

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

Or run from source:

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

Production-hardened HTTP payment middleware for TON. Available as [`@ton-agent-kit/x402-middleware`](https://www.npmjs.com/package/@ton-agent-kit/x402-middleware) on npm.

### Make any API payable in 3 lines:

```typescript
import { tonPaywall } from "@ton-agent-kit/x402-middleware";

app.get("/api/data", tonPaywall({ amount: "0.001", recipient: "0:abc..." }), (req, res) => {
  res.json({ price: 3.85 });
});
```

### How it works:

1. Agent requests `GET /api/data` → receives `402 Payment Required` with payment instructions
2. Agent pays via `transfer_ton` on-chain
3. Agent retries with `X-Payment-Hash` header → middleware verifies on-chain → `200 OK`

### Security:

- **Anti-replay** — each tx hash used only once (per-instance cache + pluggable `ReplayStore`)
- **Replay store checked first** — store is queried before in-memory cache to prevent race conditions
- **Timestamp check** — transactions must be < 5 min old (configurable `proofTTL`)
- **Amount verification** — smart tolerance (0.0005 TON cross-transfer, 0.005 TON self-transfer for gas)
- **2-level on-chain verification** — blockchain endpoint → events fallback
- **Recipient validation** — normalized address matching

### Storage options:

```typescript
import { tonPaywall, FileReplayStore, RedisReplayStore, MemoryReplayStore } from "@ton-agent-kit/x402-middleware";

// Default — file-based, zero dependencies, survives restarts
tonPaywall({ amount: "0.001", recipient: "0:abc..." })

// Upstash Redis — production scale
tonPaywall({ amount: "0.001", recipient: "0:abc...", replayStore: new RedisReplayStore(redis) })

// Memory — testing only (data lost on restart)
tonPaywall({ amount: "0.001", recipient: "0:abc...", replayStore: new MemoryReplayStore() })

// Custom — implement the ReplayStore interface (PostgreSQL, MongoDB, DynamoDB...)
tonPaywall({ amount: "0.001", recipient: "0:abc...", replayStore: myCustomStore })
```

---

## Telegram Bot

AI agent bot with natural language, HITL approval, and **29 blockchain actions** via `toAITools()`.

### Features:

- 29 actions via natural language using `toAITools()` for proper LLM schemas
- **HITL approval** — transfers > 0.05 TON require Approve/Reject inline buttons
- **TX mode control** — `TX auto` (skip buttons) / `TX confirm` (require approval)
- **Balance guard** — prevents sending more than available balance
- **HTML formatting** — bold, monospace, explorer links, shortened addresses
- **Typing indicators** — shows "typing..." during processing
- Per-user chat history with error recovery
- Concurrent processing via @grammyjs/runner
- Multi-provider LLM support via `OPENAI_BASE_URL` and `AI_MODEL` env vars
- Bot commands: `/start` (onboarding), `/help` (command reference), `/wallet` (quick balance)

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
# Add to .env: TELEGRAM_BOT_TOKEN, OPENAI_API_KEY, AI_MODEL
bun run telegram-bot.ts
```

---

## Autonomous Runtime

`agent.runLoop()` gives an LLM a natural-language goal and lets it autonomously decide which on-chain actions to execute. The LLM plans, calls tools, reads results, and iterates until the goal is achieved.

```typescript
const result = await agent.runLoop(
  "Register an agent, check my balance, get USDT price, resolve foundation.ton, and give me a full report",
  {
    model: "gpt-4.1-nano",
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
    maxIterations: 10,
    onActionStart: (name, params) => console.log(`▶ ${name}`, params),
    onActionResult: (name, params, result) => console.log(`◀ ${name}`, result),
  },
);

console.log(result.summary); // Natural language summary
console.log(result.steps);   // [{action, params, result}, ...]
```

### demo-runloop.ts — 5 Scenarios

```bash
bun run demo-runloop.ts                # run all 5 scenarios
bun run demo-runloop.ts "custom goal"  # run a single custom goal
```

| # | Scenario | Actions Used |
|---|----------|-------------|
| 1 | Balance & Price Analysis | `get_balance`, `get_price` |
| 2 | Autonomous Transfer | `transfer_ton`, `get_balance` |
| 3 | Multi-Step Research | `resolve_domain`, `get_balance`, `get_price` |
| 4 | Full Agent Workflow | `register_agent`, `get_balance`, `get_price`, `resolve_domain`, `discover_agent` |
| 5 | Autonomous Escrow | `create_escrow`, `get_escrow_info` |

---

## Examples

Four ready-to-run examples in the `examples/` directory:

### 📦 [Simple Agent](examples/simple-agent/) — SDK Hello World

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import TokenPlugin from "@ton-agent-kit/plugin-token";
import DefiPlugin from "@ton-agent-kit/plugin-defi";
import DnsPlugin from "@ton-agent-kit/plugin-dns";

const wallet = await KeypairWallet.fromMnemonic(mnemonic);
const agent = new TonAgentKit(wallet, "https://testnet-v4.tonhubapi.com", {}, "testnet")
  .use(TokenPlugin)
  .use(DefiPlugin)
  .use(DnsPlugin);

const balance = await agent.runAction("get_balance", {});
const dns = await agent.runAction("resolve_domain", { domain: "foundation.ton" });
```

```bash
cd examples/simple-agent && npm install && npx ts-node index.ts
```

### 🤖 [Telegram Bot](examples/telegram-bot/) — Full Bot with npm Imports

Full Telegram bot using `@ton-agent-kit/*` npm packages with HITL approval, 7 plugins, and multi-provider LLM support.

```bash
cd examples/telegram-bot && npm install && npx ts-node src/index.ts
```

### 🔌 [MCP Server](examples/mcp-server/) — Claude Desktop Integration

MCP server using `@ton-agent-kit/mcp-server` npm package for Claude Desktop, Cursor, or any MCP client. Supports both mnemonic and private key authentication.

```bash
cd examples/mcp-server && npm install && npm run build && npm start
```

### 💳 [x402 Server](examples/x402-server/) — Paywall Any API

Express server using `@ton-agent-kit/x402-middleware` with tiered pricing:

| Endpoint | Price | Data |
|----------|-------|------|
| `GET /` | Free | Server info |
| `GET /api/price` | 0.001 TON | Price data |
| `GET /api/analytics` | 0.01 TON | Wallet analytics |
| `GET /api/premium` | 0.05 TON | Research report |

```bash
cd examples/x402-server && npm install && npm run dev
```

---

## Architecture

```mermaid
graph TD
    subgraph "AI Frameworks"
        CD[Claude Desktop MCP]
        LC[LangChain]
        VA[Vercel AI SDK]
        OA[OpenAI / GPT]
    end

    subgraph "TON Agent Kit SDK"
        PS[Plugin System .use chain]
        WA[Wallet V3/V4/V5 auto-detect]
        AR[Action Registry 29 actions]
        AT[toAITools - Zod v4 schemas]
        RL[runLoop - autonomous runtime]
    end

    subgraph "Plugins 9"
        TK[Token 6]
        DF[DeFi 3]
        NF[NFT 3]
        DN[DNS 3]
        ST[Staking 3]
        AN[Analytics 2]
        ES[Escrow 5]
        ID[Identity 3]
        PM[Payments 1]
    end

    subgraph "TON Blockchain"
        TC[TonClient4 RPC]
        TA[TONAPI indexed data]
        SC[Smart Contracts Tact]
    end

    CD --> PS
    LC --> PS
    VA --> PS
    OA --> PS

    PS --> TK
    PS --> DF
    PS --> NF
    PS --> DN
    PS --> ST
    PS --> AN
    PS --> ES
    PS --> ID
    PS --> PM

    TK --> TC
    DF --> TC
    ES --> SC
    AN --> TA
    DN --> TA
```

### Monorepo Structure

```
ton-agent-kit/
├── packages/
│   ├── core/                     # TonAgentKit, plugin system, wallet (V3/V4/V5 auto-detect)
│   ├── plugin-token/             # TON & Jetton operations (6 actions)
│   ├── plugin-defi/              # DeDust & STON.fi (3 actions)
│   ├── plugin-nft/               # NFT operations (3 actions)
│   ├── plugin-dns/               # TON DNS: resolve, lookup, info (3 actions)
│   ├── plugin-staking/           # TON staking (3 actions)
│   ├── plugin-analytics/         # Wallet analytics (2 actions)
│   ├── plugin-escrow/            # Trustless escrow — on-chain Tact (5 actions)
│   ├── plugin-identity/          # Agent registry + reputation (3 actions)
│   ├── plugin-payments/          # x402 pay_for_resource (1 action)
│   ├── mcp-server/               # MCP server npm package
│   ├── langchain/                # LangChain tool wrappers
│   ├── ai-tools/                 # Vercel AI SDK tools
│   └── x402-middleware/          # x402 payment middleware npm package
├── contracts/
│   └── escrow.tact               # Escrow smart contract (Tact — on-chain)
├── examples/
│   ├── simple-agent/             # SDK hello world (~20 lines)
│   ├── telegram-bot/             # Full bot with npm imports
│   ├── mcp-server/               # Claude Desktop integration
│   └── x402-server/              # Paywall any API
├── mcp-server.ts                 # Standalone MCP server (29 tools)
├── telegram-bot.ts               # Telegram bot with HITL (29 actions)
├── x402-middleware.ts            # x402 payment middleware
├── demo-agent-commerce.ts        # Multi-agent commerce (2 wallets, 8 steps)
├── demo-runloop.ts               # Autonomous runtime (5 scenarios)
├── test-all-actions.ts           # Full test suite (13 sections)
├── test-x402.ts                  # x402 security tests
├── test-npm-exhaustive.ts        # npm install test (75/75)
├── test-toaitools.ts             # toAITools() schema test (458/462)
└── .env.example                  # Environment variable template
```

---

## Test Results

### test-all-actions.ts — 13 Sections, 29 Actions, 9 Plugins

```
✅ Plugin System & toAITools()     8 tests — validate 29 actions, OpenAI format, JSON serialization
✅ Token Plugin                   10 tests — balance (own/explicit/friendly/other), jetton, transfers
✅ DeFi Plugin                     3 tests — price by address, by symbol, invalid token
✅ NFT Plugin                      2 tests — collection, error handling
✅ DNS Plugin                      5 tests — resolve, auto-suffix .ton, reverse lookup, domain info
✅ Analytics Plugin                5 tests — wallet info (own/other), tx history
✅ Staking Plugin                  1 test  — staking info
✅ Live Transfer                   5 tests — real 0.01 TON transfer, balance verified
✅ Transfer Edge Cases             5 tests — zero/negative/insufficient/invalid address
✅ Escrow On-Chain                10 tests — full lifecycle: deploy → deposit → release on-chain
✅ Identity Plugin                15 tests — register 2 agents, discovery, reputation scoring
✅ Schema Validation               8 tests — all write actions schema-checked
✅ Cross-Plugin Edge Cases         4 tests — unknown action, chainable .use(), single plugin
```

### test-x402.ts — Security Edge Cases

```
✅ Free endpoint (200)              ✅ 402 Payment Required
✅ Payment sent on-chain            ✅ Paid access with proof (200)
✅ Second paywall (402)             ✅ Cross-endpoint replay attack (rejected)
✅ Wrong wallet TX (rejected)       ✅ Old TX / timestamp expired (rejected)
✅ Insufficient amount (rejected)   ✅ Wrong network TX (rejected)
```

### demo-runloop.ts — 5 Scenarios, 15+ Autonomous Actions

```
✅ Balance & Price Analysis     — multi-step autonomous reasoning
✅ Autonomous Transfer          — send TON + verify balance change
✅ Multi-Step Research           — resolve domain + check balance + get price
✅ Full Agent Workflow           — register + balance + price + DNS + discover
✅ Autonomous Escrow            — create escrow + list + inspect
```

### demo-agent-commerce.ts — 8 Steps, On-Chain Verified

```
✅ Identity (2 agents, 2 wallets)  ✅ Discovery (by capability)
✅ Escrow (contract deployed)      ✅ Deposit (funded on-chain)
✅ Service (data delivered)        ✅ Release (payment sent)
✅ Reputation (100/100)            ✅ Verify (balance increased)
```

### Other Test Suites

```
npm Install Exhaustive   75/75 passed (1 skip)   — all 29 actions via npm install
toAITools() Schemas     458/462 passed           — Zod v4 native toJSONSchema()
Claude Desktop MCP         8/8 passed            — live tool calls
Telegram Bot             13/13 passed            — correct parameter names
```

---

## Comparison

| Feature | TON Agent Kit | Solana Agent Kit | Coinbase AgentKit |
|---------|--------------|-----------------|-------------------|
| **Chain** | TON | Solana | Base/ETH |
| **Actions** | 29 | 60+ | 50+ |
| **npm Packages** | 14 | 1 | 1 |
| **Autonomous Runtime** | ✅ `agent.runLoop()` — LLM-driven | ❌ | ❌ |
| **On-chain Escrow** | ✅ Tact smart contract | ❌ | ❌ |
| **MCP Server** | ✅ | ✅ | ✅ |
| **LangChain** | ✅ | ✅ | ✅ |
| **Multi-provider LLM** | ✅ OpenAI, OpenRouter, Groq, Together, Mistral | Partial | Partial |
| **x402 Middleware** | ✅ Production-hardened, anti-replay | ❌ | ❌ |
| **Agent Identity** | ✅ Registry + reputation | ❌ | ❌ |
| **Human-in-the-loop** | ✅ Telegram native | ❌ | Partial (TEE) |
| **1B User Distribution** | ✅ Telegram | ❌ | ❌ |
| **Plugin System** | ✅ `.use()` chain | ✅ `.use()` | ✅ |

---

## Tech Stack

- **TypeScript** + **Bun** — Full type safety, fast runtime
- **@ton/ton** + **@ton/core** + **@ton/crypto** — TON blockchain
- **@dedust/sdk** + **@ston-fi/sdk** — DEX integrations
- **@modelcontextprotocol/sdk** — MCP server
- **grammY** + **@grammyjs/runner** — Telegram bot
- **OpenAI** (configurable via `OPENAI_BASE_URL` + `AI_MODEL` env vars) — Natural language
- **Express** — x402 payment server
- **Tact** — Smart contracts (escrow)
- **Zod v4** — Schema validation + native `toJSONSchema()` (no external converters)
- **TONAPI** — Indexed blockchain data

---

## Production Roadmap

- [x] npm package publishing (@ton-agent-kit/* — 14 packages live)
- [x] `toAITools()` — Zod v4 native JSON schemas, works via npm install
- [x] `@ton-agent-kit/x402-middleware` npm package with pluggable anti-replay
- [x] Per-instance anti-replay cache (inside `tonPaywall`, not module-scoped)
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
