<p align="center">
  <h1 align="center">🤖 TON Agent Kit</h1>
  <p align="center"><strong>Connect any AI agent to TON protocols</strong></p>
  <p align="center">The Solana Agent Kit for TON — modular, extensible, production-ready.</p>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#plugins">Plugins</a> •
  <a href="#mcp-server">MCP Server</a> •
  <a href="#langchain">LangChain</a> •
  <a href="#telegram-bot">Telegram Bot</a> •
  <a href="#architecture">Architecture</a>
</p>

---

## Why TON Agent Kit?

AI agents need blockchain access. On Solana, the [Solana Agent Kit](https://github.com/sendaifun/solana-agent-kit) (1,600+ stars) made this trivial. **On TON, nothing like this existed — until now.**

TON Agent Kit gives any AI agent **20 autonomous actions** across 5 plugins, with integrations for **Claude (MCP)**, **LangChain**, **Vercel AI SDK**, and a ready-to-deploy **Telegram bot**.

### What makes TON special for AI agents?

| Feature                                             | TON                 | Solana           | Ethereum            |
| --------------------------------------------------- | ------------------- | ---------------- | ------------------- |
| **Payment channels** (zero-fee micropayments)       | ✅ Native           | ❌               | ❌                  |
| **Actor model** (each contract = independent agent) | ✅                  | ❌               | ❌                  |
| **900M users** via Telegram                         | ✅                  | ❌               | ❌                  |
| **Native account abstraction**                      | ✅                  | Partial          | EIP-7702            |
| **Agent toolkit**                                   | ✅ **This project** | Solana Agent Kit | AgentKit (Coinbase) |

---

## Quick Start

### Install

```bash
npm install @ton-agent-kit/core @ton-agent-kit/plugin-token @ton-agent-kit/plugin-defi
```

### Basic Usage

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import TokenPlugin from "@ton-agent-kit/plugin-token";
import DefiPlugin from "@ton-agent-kit/plugin-defi";

// Create wallet from mnemonic
const wallet = await KeypairWallet.fromMnemonic(mnemonic);

// Initialize agent with plugins
const agent = new TonAgentKit(wallet, "https://toncenter.com/api/v2/jsonRPC")
  .use(TokenPlugin)
  .use(DefiPlugin);

// Check balance
const balance = await agent.methods.get_balance({});
console.log(`Balance: ${balance.balance} TON`);

// Swap tokens on DeDust
const swap = await agent.methods.swap_dedust({
  fromToken: "TON",
  toToken: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs", // USDT
  amount: "10",
});
console.log(`Swapped: ${swap.fromAmount} TON → ${swap.toAmount} USDT`);

// Transfer TON
await agent.methods.transfer_ton({
  to: "EQBx2CfDE...",
  amount: "5",
  comment: "Payment from AI agent",
});
```

---

## Plugins

TON Agent Kit uses a **modular plugin architecture**. Install only what you need:

### 🪙 Token Plugin (`@ton-agent-kit/plugin-token`)

| Action               | Description                    |
| -------------------- | ------------------------------ |
| `get_balance`        | Get TON balance of any address |
| `get_jetton_balance` | Get Jetton (token) balance     |
| `transfer_ton`       | Send TON to an address         |
| `transfer_jetton`    | Send Jettons (USDT, NOT, etc.) |
| `deploy_jetton`      | Deploy a new token             |
| `get_jetton_info`    | Get token metadata             |

### 📈 DeFi Plugin (`@ton-agent-kit/plugin-defi`)

| Action        | Description                    |
| ------------- | ------------------------------ |
| `swap_dedust` | Swap tokens on DeDust DEX      |
| `swap_stonfi` | Swap tokens on STON.fi DEX     |
| `get_price`   | Get token price from DEX pools |

### 🖼️ NFT Plugin (`@ton-agent-kit/plugin-nft`)

| Action           | Description                |
| ---------------- | -------------------------- |
| `get_nft_info`   | Get NFT metadata and owner |
| `transfer_nft`   | Transfer an NFT            |
| `get_collection` | Get collection info        |

### 🌐 DNS Plugin (`@ton-agent-kit/plugin-dns`)

| Action            | Description                      |
| ----------------- | -------------------------------- |
| `resolve_domain`  | Resolve `.ton` domain → address  |
| `lookup_address`  | Reverse lookup: address → domain |
| `get_domain_info` | Domain registration details      |

### ⚡ Payments Plugin (`@ton-agent-kit/plugin-payments`) — **TON Exclusive!**

_Zero-fee agent-to-agent micropayments via TON payment channels._

| Action                   | Description                        |
| ------------------------ | ---------------------------------- |
| `create_payment_channel` | Open channel (~0.1 TON one-time)   |
| `send_micropayment`      | Send payment — **0 fees, instant** |
| `close_payment_channel`  | Settle and close channel           |

> **Why this matters:** On Solana, x402 costs $0.00025/transaction. On TON, payment channels enable **truly free** micropayments after opening. This is the killer feature for agent-to-agent economies.

---

## MCP Server

Let Claude, GPT, Cursor, or any MCP-compatible AI interact with TON directly.

### Setup (Claude Desktop)

```json
{
  "mcpServers": {
    "ton-agent-kit": {
      "command": "npx",
      "args": ["@ton-agent-kit/mcp-server"],
      "env": {
        "TON_MNEMONIC": "word1 word2 ... word24",
        "TON_NETWORK": "mainnet",
        "TONAPI_KEY": "optional-for-enhanced-queries"
      }
    }
  }
}
```

### What Claude can do with TON Agent Kit MCP:

> **You:** "What's my TON balance?"
> **Claude:** _calls `get_balance`_ → "Your balance is 42.5 TON"

> **You:** "Swap 10 TON for USDT on DeDust"
> **Claude:** _calls `swap_dedust`_ → "Swapped 10 TON → 38.2 USDT. TX: tonscan.org/..."

> **You:** "Resolve alice.ton"
> **Claude:** _calls `resolve_domain`_ → "alice.ton → EQBx2..."

---

## LangChain

```typescript
import { createLangchainTools } from "@ton-agent-kit/langchain";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "langchain/agents";

const tools = createLangchainTools(agent);
const llm = new ChatOpenAI({ modelName: "gpt-4o-mini" });
const reactAgent = createReactAgent({ llm, tools });

const result = await reactAgent.invoke({
  input: "Swap 5 TON for USDT and then check my balance",
});
```

---

## Telegram Bot

A complete demo bot that lets Telegram users interact with TON via natural language.

### Run the demo

```bash
cd examples/telegram-bot
cp .env.example .env
# Fill in your keys
npm install
npm run dev
```

### Demo conversation

```
User: What's my balance?
Bot:  💰 Balance: 42.5 TON (Address: EQBx2...)

User: Swap 10 TON for USDT
Bot:  ✅ Swapped 10 TON → 38.2 USDT on DeDust | TX: [view]

User: Send 5 TON to alice.ton
Bot:  First resolving alice.ton... → EQBx2CfDE...
      ✅ Sent 5 TON to EQBx2... | TX: [view]

User: Open a payment channel with EQAgent2... for 10 TON
Bot:  ⚡ Payment channel opened!
      Channel ID: 12345
      Deposit: 10 TON
      Now you can send unlimited micropayments for FREE.
```

---

## Architecture

```
ton-agent-kit/
├── packages/
│   ├── core/              # TonAgentKit class, plugin system, wallet abstraction
│   ├── plugin-token/      # TON & Jetton operations (6 actions)
│   ├── plugin-defi/       # DeDust & STON.fi DEX (3 actions)
│   ├── plugin-nft/        # NFT operations (3 actions)
│   ├── plugin-dns/        # TON DNS (3 actions)
│   ├── plugin-payments/   # Payment channels (3 actions) ⚡
│   ├── mcp-server/        # MCP server for Claude/GPT
│   ├── langchain/         # LangChain tool wrappers
│   └── ai-tools/          # Vercel AI SDK tools
├── examples/
│   ├── telegram-bot/      # Full Telegram bot demo
│   └── simple-agent/      # Minimal usage example
└── ARCHITECTURE.md        # Detailed architecture document
```

### Design Principles

1. **Plugin architecture** — `.use()` pattern, install only what you need
2. **Wallet abstraction** — Keypair, TON Connect, or bring your own
3. **Action providers** — Each action has name, description, Zod schema, handler
4. **AI-first** — Every action is designed to be an LLM tool (clear descriptions, validated inputs, structured outputs)
5. **TON-native** — Exploits TON's unique features (actor model, payment channels, DNS, Telegram)

---

## Comparison

| Feature              | TON Agent Kit   | Solana Agent Kit | Coinbase AgentKit |
| -------------------- | --------------- | ---------------- | ----------------- |
| **Chain**            | TON             | Solana           | Base/ETH          |
| **Actions**          | 20              | 60+              | 50+               |
| **MCP Server**       | ✅              | ✅               | ✅                |
| **LangChain**        | ✅              | ✅               | ✅                |
| **Payment Channels** | ✅ Zero-fee     | ❌               | ❌                |
| **DNS Integration**  | ✅ .ton domains | ❌               | ❌                |
| **Telegram Native**  | ✅ 900M users   | ❌               | ❌                |
| **Plugin System**    | ✅ `.use()`     | ✅ `.use()`      | ✅                |

---

## Tech Stack

- **TypeScript** — Full type safety throughout
- **@ton/ton** + **@ton/core** — TON blockchain interaction
- **@dedust/sdk** + **@ston-fi/sdk** — DEX integrations
- **@modelcontextprotocol/sdk** — MCP server
- **LangChain** — AI agent framework
- **grammY** — Telegram bot framework
- **Zod** — Schema validation

---

## Contributing

Contributions welcome! See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed technical docs.

### Create a custom plugin

```typescript
import { definePlugin, defineAction } from "@ton-agent-kit/core";
import { z } from "zod";

const myAction = defineAction({
  name: "my_custom_action",
  description: "Does something cool on TON",
  schema: z.object({
    param: z.string().describe("Some parameter"),
  }),
  handler: async (agent, params) => {
    // Your logic here using agent.connection and agent.wallet
    return { result: "success" };
  },
});

const MyPlugin = definePlugin({
  name: "my-plugin",
  actions: [myAction],
});

export default MyPlugin;
```

## Production Roadmap

- [ ] Pluggable storage adapter for chat history (File / Redis / Custom)
- [ ] Automatic escrow expiration and cleanup
- [ ] Redis-backed anti-replay for x402 at scale
- [ ] Session key smart contract deployment (Tact)
- [ ] TON DNS subdomain registration for agent identity
- [ ] ADNL agent-to-agent encrypted communication
- [ ] npm package publishing (@ton-agent-kit/\*)
- [ ] Unit tests with @ton/sandbox
- [ ] Rate limiting and spending caps per session

---

## License

MIT

---

<p align="center">
  <strong>Built for the TON AI Hackathon 2026</strong><br>
  <em>The foundational toolkit for the next generation of AI agents on TON.</em>
</p>
