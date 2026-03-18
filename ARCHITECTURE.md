# TON Agent Kit -- Architecture Document

## Project Overview

**TON Agent Kit** is the Agent Commerce Protocol for TON -- a modular TypeScript SDK that lets AI agents discover each other, transact via x402 middleware, manage trustless escrow, orchestrate multi-agent swarms, and operate safely under human control through Telegram.

**Tagline:** _"The infrastructure for the AI agent economy on TON."_

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     AI FRAMEWORKS                             │
│  Claude Desktop (MCP)  │  LangChain  │  Vercel AI  │  GPT   │
└──────────┬───────────────────┬──────────────┬────────────────┘
           │                   │              │
           ▼                   ▼              ▼
┌──────────────────────────────────────────────────────────────┐
│                   TON AGENT KIT SDK                          │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────────────┐    │
│  │ Plugin System│ │ Wallet       │ │ Action Registry    │    │
│  │  .use()     │ │ V3/V4/V5     │ │ 68 actions         │    │
│  │  chain      │ │ auto-detect  │ │ Zod v4 validated   │    │
│  └─────────────┘ └──────────────┘ └────────────────────┘    │
│  toAITools() -- Zod v4 native toJSONSchema()                 │
│  runLoop() -- autonomous LLM-driven execution                │
│  Multi-provider: OpenAI, OpenRouter, Groq, Together, Mistral │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                               │
│  ┌─────────┐  ┌────────────┐  ┌──────────────────────────┐  │
│  │ Planner │  │ Dispatcher │  │ Dependency Resolution    │  │
│  │ (LLM)   │  │ (parallel) │  │ + Auto-inject + Retry    │  │
│  └─────────┘  └────────────┘  └──────────────────────────┘  │
│  N agents collaborate on complex goals                       │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                       PLUGINS (12)                           │
│  Token(7) │ DeFi(11) │ NFT(3) │ DNS(3) │ Staking(3)        │
│  Analytics(8) │ Escrow(14) │ Identity(9) │ Payments(2)     │
│  AgentComm(7) │ Memory(4)                                   │
└──────────┬───────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                    TON BLOCKCHAIN                             │
│  TonClient4 (RPC)  │  TONAPI (indexed data)  │  On-chain    │
│  Testnet + Mainnet  │  Jettons, NFTs, DNS     │  Contracts   │
└──────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
ton-agent-kit/
├── packages/
│   ├── core/                     # Core SDK -- TonAgentKit + plugin system
│   │   ├── src/
│   │   │   ├── agent.ts          # TonAgentKit class + fromMnemonic factory + toAITools + runLoop
│   │   │   ├── wallet.ts         # KeypairWallet (V3R2/V4/V5R1 auto-detect) + generateMultiple
│   │   │   ├── types.ts          # Action, Plugin, AgentContext interfaces
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── plugin-token/             # 7 actions: balance, transfer, jetton, deploy, simulate
│   ├── plugin-defi/              # 11 actions: swaps, price, DCA, limit orders, yield, staking pools, trust
│   │   ├── src/
│   │   │   ├── actions/
│   │   │   │   ├── swap-dedust.ts       # DeDust DEX swap
│   │   │   │   ├── swap-stonfi.ts       # STON.fi DEX swap
│   │   │   │   ├── get-price.ts         # Token price via TONAPI
│   │   │   │   ├── create-dca-order.ts  # DCA order via swap.coffee
│   │   │   │   ├── create-limit-order.ts # Limit order via swap.coffee
│   │   │   │   ├── cancel-order.ts      # Cancel DCA/limit order
│   │   │   │   ├── get-yield-pools.ts   # Yield pool discovery (2000+ pools)
│   │   │   │   ├── yield-deposit.ts     # LP deposit
│   │   │   │   ├── yield-withdraw.ts    # LP withdrawal
│   │   │   │   ├── get-staking-pools.ts # Staking pool discovery
│   │   │   │   └── get-token-trust.ts   # Token trust score (DYOR.io)
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── plugin-nft/               # 3 actions: info, collection, transfer
│   ├── plugin-dns/               # 3 actions: resolve, lookup, domain info
│   ├── plugin-staking/           # 3 actions: stake, unstake, info
│   ├── plugin-analytics/         # 2 actions: tx history, wallet info
│   ├── plugin-escrow/            # 5 actions: create, deposit, release, refund, info (on-chain Tact)
│   │   └── src/contracts/        # Compiled Tact output (ABI, BOC, TS wrappers)
│   ├── plugin-identity/          # 3 actions: register, discover, reputation
│   ├── plugin-payments/          # 1 action: pay_for_resource (x402)
│   │
│   ├── orchestrator/             # Multi-agent orchestration
│   │   ├── src/
│   │   │   ├── orchestrator.ts   # Orchestrator class -- .agent(), .swarm(), getAgents()
│   │   │   ├── planner.ts        # LLM task decomposition, cycle detection, validation
│   │   │   ├── dispatcher.ts     # Parallel execution, dependency resolution, auto-inject
│   │   │   ├── types.ts          # Task, TaskResult, SwarmOptions, SwarmResult, AgentConfig
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── mcp-server/               # MCP Server for Claude/GPT/Cursor (npm package)
│   ├── langchain/                # LangChain tool wrappers
│   ├── ai-tools/                 # Vercel AI SDK tools
│   └── x402-middleware/          # x402 payment middleware (npm package)
│       ├── src/
│       │   └── index.ts          # tonPaywall, createPaymentServer, ReplayStore, anti-replay
│       └── package.json
│
├── contracts/
│   ├── escrow.tact               # Escrow smart contract (Tact -- on-chain)
│   ├── deploy-escrow.ts          # Escrow deployment script
│   └── output/                   # Compiled Tact output (ABI, BOC, TS wrappers)
│
├── examples/
│   ├── simple-agent/             # SDK hello world (~20 lines)
│   ├── telegram-bot/             # Full bot with npm imports + HITL
│   ├── mcp-server/               # Claude Desktop integration
│   └── x402-server/              # Paywall any API (tiered pricing)
│
├── mcp-server.ts                 # Standalone MCP server (37 tools, proven)
├── telegram-bot.ts               # Telegram bot with HITL (68 actions via toAITools)
├── x402-middleware.ts             # x402 payment middleware (production-hardened)
├── demo-agent-commerce.ts        # Multi-agent commerce demo (2 wallets, 8 steps, on-chain escrow)
├── demo-runloop.ts               # Autonomous agent runtime demo (5 scenarios)
├── test-all-actions.ts           # Full test suite (16 sections, 68 actions, 12 plugins)
├── test-escrow.ts                # Escrow on-chain test suite (7 sections, 21 tests)
├── test-orchestrator.ts          # Orchestrator test suite (11 sections, 33+ tests)
├── test-x402.ts                  # x402 end-to-end test (security edge cases)
├── test-npm-exhaustive.ts         # npm install test suite (75/75 -- 75 pass, 1 skip)
├── test-toaitools.ts              # toAITools() schema test (458/462 passing)
├── test-x402-npm.ts               # x402 npm security tests (29/29 passing)
│
├── .env.example                  # Environment variable template
├── .env                          # Secrets (mnemonic, keys)
├── .agent-registry.json          # Agent registry (persisted)
├── .x402-used-hashes.json        # Anti-replay store (persisted)
├── .escrow-store.json            # Escrow index (escrowId -> contractAddress)
│
├── package.json
├── ARCHITECTURE.md               # This file
├── README.md
└── LICENSE                       # MIT
```

---

## Package Distribution

All 15 packages are published on the **npm public registry** under the `@ton-agent-kit` scope:

```
@ton-agent-kit/core              @ton-agent-kit/plugin-staking
@ton-agent-kit/plugin-token      @ton-agent-kit/plugin-analytics
@ton-agent-kit/plugin-defi       @ton-agent-kit/plugin-escrow
@ton-agent-kit/plugin-nft        @ton-agent-kit/plugin-identity
@ton-agent-kit/plugin-dns        @ton-agent-kit/plugin-payments
@ton-agent-kit/mcp-server        @ton-agent-kit/langchain
@ton-agent-kit/ai-tools          @ton-agent-kit/x402-middleware
@ton-agent-kit/orchestrator
```

Install only what you need (note: `zod` is a required peer dependency for all packages):

```bash
npm install @ton-agent-kit/core @ton-agent-kit/plugin-token zod
```

Each package is independently versioned and published with its own `package.json`, entry points, and peer dependencies.

### Current Versions

| Package                            | Version |
| ---------------------------------- | ------- |
| `@ton-agent-kit/core`              | 1.2.2   |
| `@ton-agent-kit/plugin-token`      | 1.1.1   |
| `@ton-agent-kit/plugin-defi`       | 1.2.2   |
| `@ton-agent-kit/plugin-dns`        | 1.0.3   |
| `@ton-agent-kit/plugin-nft`        | 1.0.3   |
| `@ton-agent-kit/plugin-staking`    | 1.0.3   |
| `@ton-agent-kit/plugin-analytics`  | 1.1.1   |
| `@ton-agent-kit/plugin-escrow`     | 1.5.0   |
| `@ton-agent-kit/plugin-identity`   | 1.5.0   |
| `@ton-agent-kit/plugin-payments`   | 1.0.3   |
| `@ton-agent-kit/plugin-agent-comm` | 1.2.0   |
| `@ton-agent-kit/plugin-memory`     | 1.0.2   |
| `@ton-agent-kit/orchestrator`      | 1.1.1   |
| `@ton-agent-kit/strategies`        | 1.0.1   |
| `@ton-agent-kit/x402-middleware`   | 1.1.1   |
| `@ton-agent-kit/mcp-server`        | 1.1.1   |
| `@ton-agent-kit/langchain`         | 1.0.2   |
| `@ton-agent-kit/ai-tools`          | 1.0.2   |

### Peer Dependencies

All `@ton-agent-kit/*` packages declare `zod` (>=4.0.0) as a **peer dependency**. This ensures a single Zod instance is shared across the SDK, which is critical for `toAITools()` -- Zod v4's `toJSONSchema()` only works when schemas are created by the same Zod instance that generates the JSON schema. Users must install `zod` explicitly:

```bash
npm install @ton-agent-kit/core zod
```

---

## Core Design

### 1. Plugin Architecture (`.use()` pattern)

```typescript
const agent = new TonAgentKit(wallet, rpcUrl)
  .use(TokenPlugin)
  .use(DefiPlugin)
  .use(EscrowPlugin)
  .use(IdentityPlugin)
  .use(PaymentsPlugin);

// 68 actions available via methods proxy
await agent.methods.get_balance({});
await agent.methods.create_escrow({ beneficiary: "0:...", amount: "1" });
await agent.methods.register_agent({ name: "bot", capabilities: ["trading"] });
await agent.methods.pay_for_resource({ url: "https://api.example.com/data" });
```

### 2. toAITools() -- LLM Tool Integration

Uses Zod v4 native `toJSONSchema()` (top-level import, not dynamic require) to generate OpenAI-compatible function definitions. The `$schema` property is stripped from the output for compatibility. Works correctly via `npm install` thanks to `zod` being a peer dependency.

```typescript
const tools = agent.toAITools();
// Returns Array<{ type: "function", function: { name, description, parameters } }>
// Compatible with OpenAI, Anthropic, Google, Groq, Mistral, OpenRouter, Together
```

### 3. Wallet Auto-detect (V3/V4/V5)

```typescript
// Tries V5R1, V4, V3R2 -- returns first with balance
const wallet = await KeypairWallet.autoDetect(mnemonic, client, "testnet");
```

### 4. KeypairWallet.generateMultiple()

```typescript
// Create N wallets with fresh 24-word mnemonics
const wallets = await KeypairWallet.generateMultiple(3, { network: "testnet" });
// Returns [{wallet: KeypairWallet, mnemonic: string[]}, ...]
```

### 5. Transaction Pattern (proven reliable)

All write operations use fresh client + `getCredentials()`:

```typescript
const { secretKey, publicKey } = agent.wallet.getCredentials();
const freshClient = new TonClient4({ endpoint: agent.rpcUrl });
const walletContract = freshClient.open(
  WalletContractV5R1.create({
    workchain: 0, publicKey,
    walletId: { networkGlobalId: networkId, workchain: 0, subwalletNumber: 0 },
  }),
);
const seqno = await walletContract.getSeqno();
await walletContract.sendTransfer({ seqno, secretKey, messages: [...] });
```

### 6. Balance Guard (prevents insufficient funds)

```typescript
const currentBalance = Number(fromNano(state.account.balance.coins));
if (requestedAmount > currentBalance - 0.01) {
  throw new Error(`Insufficient balance: ${currentBalance} TON`);
}
```

---

## All 72 Actions -- Status

| #   | Plugin     | Action                       | Method                                  | Status                      |
| --- | ---------- | ---------------------------- | --------------------------------------- | --------------------------- |
| 1   | Token      | `get_balance`                | TonClient4 + TONAPI fallback            | Live testnet + mainnet      |
| 2   | Token      | `get_jetton_balance`         | TONAPI                                  | Live                        |
| 3   | Token      | `transfer_ton`               | sendTransfer + balance guard            | Live (TX confirmed)         |
| 4   | Token      | `transfer_jetton`            | sendTransfer                            | Schema validated            |
| 5   | Token      | `deploy_jetton`              | sendTransfer                            | Live (AgentCoin deployed)   |
| 6   | Token      | `get_jetton_info`            | TONAPI                                  | Schema validated            |
| 7   | Token      | `simulate_transaction`       | Balance + fee estimation                | Live                        |
| 8   | DeFi       | `swap_dedust`                | DeDust SDK                              | Live                        |
| 9   | DeFi       | `swap_stonfi`                | STON.fi SDK                             | Live                        |
| 10  | DeFi       | `get_price`                  | TONAPI rates                            | Live ($1.00 USDT)           |
| 11  | DeFi       | `create_dca_order`           | swap.coffee Strategies API              | Primitive                   |
| 12  | DeFi       | `create_limit_order`         | swap.coffee Strategies API              | Primitive                   |
| 13  | DeFi       | `cancel_order`               | swap.coffee Strategies API              | Primitive                   |
| 14  | DeFi       | `get_yield_pools`            | swap.coffee Yield API                   | Primitive                   |
| 15  | DeFi       | `yield_deposit`              | swap.coffee + on-chain LP               | Primitive                   |
| 16  | DeFi       | `yield_withdraw`             | swap.coffee + on-chain LP burn          | Primitive                   |
| 17  | DeFi       | `get_staking_pools`          | swap.coffee Staking API                 | Primitive                   |
| 18  | DeFi       | `get_token_trust`            | DYOR.io API                             | Primitive                   |
| 19  | DeFi       | `swap_best_price`            | Omniston aggregator                     | Primitive                   |
| 20  | NFT        | `get_nft_info`               | TONAPI                                  | Live                        |
| 21  | NFT        | `get_nft_collection`         | TONAPI                                  | Live ("Telegram Usernames") |
| 22  | NFT        | `transfer_nft`               | sendTransfer                            | Schema validated            |
| 23  | DNS        | `resolve_domain`             | TONAPI DNS                              | Live (foundation.ton)       |
| 24  | DNS        | `lookup_address`             | TONAPI DNS                              | Live                        |
| 25  | DNS        | `get_domain_info`            | TONAPI DNS                              | Live                        |
| 26  | Staking    | `get_staking_info`           | TONAPI staking                          | Live                        |
| 27  | Staking    | `stake_ton`                  | sendTransfer + op code                  | Schema validated            |
| 28  | Staking    | `unstake_ton`                | sendTransfer + op code                  | Schema validated            |
| 29  | Analytics  | `get_transaction_history`    | TONAPI events                           | Live                        |
| 30  | Analytics  | `get_wallet_info`            | TONAPI accounts                         | Live                        |
| 31  | Analytics  | `get_portfolio_metrics`      | TONAPI events + computation             | Live                        |
| 32  | Analytics  | `get_equity_curve`           | TONAPI events + computation             | Live                        |
| 33  | Analytics  | `wait_for_transaction`       | TONAPI streaming                        | Live                        |
| 34  | Analytics  | `subscribe_webhook`          | TONAPI webhooks                         | Schema validated            |
| 35  | Analytics  | `call_contract_method`       | TONAPI get-method                       | Live                        |
| 36  | Analytics  | `get_accounts_bulk`          | TONAPI bulk accounts                    | Live                        |
| 37  | Escrow     | `create_escrow`              | Deploy Tact contract on-chain           | Live (on-chain)             |
| 38  | Escrow     | `deposit_to_escrow`          | Send TON to escrow contract             | Live (on-chain)             |
| 39  | Escrow     | `release_escrow`             | Release message to contract             | Live (on-chain)             |
| 40  | Escrow     | `refund_escrow`              | Refund message to contract              | Live (on-chain)             |
| 41  | Escrow     | `get_escrow_info`            | Read on-chain contract state            | Live (on-chain)             |
| 42  | Escrow     | `confirm_delivery`           | DeliveryConfirmed message               | Live (on-chain)             |
| 43  | Escrow     | `auto_release_escrow`        | AutoRelease message                     | Live (on-chain)             |
| 44  | Escrow     | `open_dispute`               | OpenDispute + cross-contract notify     | Live (on-chain)             |
| 45  | Escrow     | `join_dispute`               | JoinDispute with arbiter stake          | Live (on-chain)             |
| 46  | Escrow     | `vote_release`               | VoteRelease with majority check         | Live (on-chain)             |
| 47  | Escrow     | `vote_refund`                | VoteRefund with majority check          | Live (on-chain)             |
| 48  | Escrow     | `claim_reward`               | ClaimReward with winner/loser payout    | Live (on-chain)             |
| 49  | Escrow     | `fallback_settle`            | FallbackSettle after 72h deadline       | Live (on-chain)             |
| 50  | Escrow     | `seller_stake_escrow`        | SellerStake for bidirectional escrow    | Live (on-chain)             |
| 51  | Identity   | `register_agent`             | On-chain Register + local JSON          | Live (on-chain)             |
| 52  | Identity   | `discover_agent`             | On-chain getters + local search         | Live                        |
| 53  | Identity   | `get_agent_reputation`       | On-chain getter + local scoring         | Live                        |
| 54  | Identity   | `deploy_reputation_contract` | Deploy Tact contract on-chain           | Live (on-chain)             |
| 55  | Identity   | `withdraw_reputation_fees`   | Withdraw with 20-year rule              | Live (on-chain)             |
| 56  | Identity   | `process_pending_ratings`    | Process queued ratings                  | Live                        |
| 57  | Identity   | `get_open_disputes`          | On-chain dispute registry               | Live                        |
| 58  | Identity   | `trigger_cleanup`            | TriggerCleanup message                  | Live (on-chain)             |
| 59  | Identity   | `get_agent_cleanup_info`     | On-chain cleanup eligibility check      | Live                        |
| 60  | Payments   | `pay_for_resource`           | HTTP + sendTransfer + x402 flow         | Live                        |
| 61  | Payments   | `get_delivery_proof`         | Proof lookup                            | Live                        |
| 62  | AgentComm  | `broadcast_intent`           | On-chain BroadcastIntent message        | Live (on-chain)             |
| 63  | AgentComm  | `discover_intents`           | On-chain intent getters                 | Live                        |
| 64  | AgentComm  | `send_offer`                 | On-chain SendOffer message              | Live (on-chain)             |
| 65  | AgentComm  | `get_offers`                 | On-chain offer getters                  | Live                        |
| 66  | AgentComm  | `accept_offer`               | On-chain AcceptOffer message            | Live (on-chain)             |
| 67  | AgentComm  | `settle_deal`                | On-chain SettleDeal message             | Live (on-chain)             |
| 68  | AgentComm  | `cancel_intent`              | On-chain CancelIntent message           | Live (on-chain)             |
| 69  | Memory     | `save_context`               | Persistent JSON file store              | Live                        |
| 70  | Memory     | `get_context`                | Persistent JSON file store              | Live                        |
| 71  | Memory     | `list_context`               | Persistent JSON file store              | Live                        |
| 72  | Memory     | `delete_context`             | Persistent JSON file store              | Live                        |

> **Primitive** status: Actions are implemented, schema-validated, and have Zod schemas. They require external API keys (SWAP_COFFEE_API_KEY or DYOR_API_KEY) and have not been tested live on-chain yet.

---

## DeFi Plugin -- Expanded Design (v1.1.0)

The DeFi plugin grew from 3 to 12 actions, adding advanced primitives including Omniston aggregator:

### Live Actions (3)

- **swap_dedust** / **swap_stonfi** -- DEX swaps via DeDust SDK and STON.fi SDK
- **get_price** -- Token price in USD and TON via TONAPI `/v2/rates` endpoint

### DeFi Primitives (8) -- via swap.coffee and DYOR.io APIs

| Category              | Actions                                                  | API                              |
| --------------------- | -------------------------------------------------------- | -------------------------------- |
| **Order Management**  | `create_dca_order`, `create_limit_order`, `cancel_order` | swap.coffee Strategies API       |
| **Yield Farming**     | `get_yield_pools`, `yield_deposit`, `yield_withdraw`     | swap.coffee Yield API            |
| **Staking Discovery** | `get_staking_pools`                                      | swap.coffee Staking API (public) |
| **Trust & Safety**    | `get_token_trust`                                        | DYOR.io API                      |

**DCA Orders:** Periodic swaps at fixed intervals. Parameters: `fromToken`, `toToken`, `totalAmount`, `intervalSeconds`, `invocations`. Calculates per-swap amount automatically.

**Limit Orders:** Conditional swaps triggered when minimum output is achievable. Parameters: `fromToken`, `toToken`, `amount`, `minOutput` (in nano-units), `slippage`.

**Yield Pools:** Aggregates 2000+ pools from 16 protocols. Sort by APR, TVL, or volume. Client-side filtering by protocol and minimum APR. Standardized output: protocol, pair, apr, tvl, address, riskLevel.

**Staking Pools:** Multi-protocol pool discovery (TonStakers, Bemo, Hipo, etc.). Public endpoint, no API key required.

**Token Trust:** Scam and honeypot detection. Returns: trustScore (0-100), assessment (HIGH/MEDIUM/LOW), holders, marketCap, flags.

---

## Multi-Agent Orchestrator -- Design

The `@ton-agent-kit/orchestrator` package (v1.0.0) enables N specialized agents to collaborate on complex goals.

### Architecture

```
Goal                         Orchestrator                      Agents
  │                               │                               │
  │── swarm(goal) ───────────────→│                               │
  │                               │                               │
  │                  ┌─── PHASE 1: PLAN ───┐                      │
  │                  │ Planner sends goal + │                      │
  │                  │ agent capabilities   │                      │
  │                  │ to LLM              │                      │
  │                  │ LLM returns Task[]  │                      │
  │                  │ with dependsOn       │                      │
  │                  │ Validate: cycles,    │                      │
  │                  │ unknown agents/deps  │                      │
  │                  └─────────────────────┘                      │
  │                               │                               │
  │                  ┌─── PHASE 2: DISPATCH ──┐                   │
  │                  │ While pending tasks:    │                   │
  │                  │  Find ready (deps met)  │                   │
  │                  │  Execute in parallel ──────────────────────→│
  │                  │  Auto-inject results    │<── results ───────│
  │                  │  Retry on failure       │                   │
  │                  │  Detect deadlocks       │                   │
  │                  └────────────────────────┘                   │
  │                               │                               │
  │                  ┌─── PHASE 3: SUMMARIZE ─┐                   │
  │                  │ LLM summarizes all      │                   │
  │                  │ task results             │                   │
  │                  └────────────────────────┘                   │
  │                               │                               │
  │<── SwarmResult ───────────────│                               │
  │   {goal, plan, results,       │                               │
  │    summary, totalDuration,    │                               │
  │    agentsUsed, tasksCompleted, │                               │
  │    tasksFailed}               │                               │
```

### Key Components

**Planner** (`planner.ts`):

- Sends goal + agent capabilities (extracted via `getAvailableActions()`) to the LLM
- LLM returns a JSON array of tasks with `dependsOn` relationships
- System prompt enforces exact action names and parameter names from agent schemas
- Validates: circular dependencies (DFS), unknown agents, unknown actions, unknown deps
- 2-attempt retry: if validation fails, sends errors back to LLM for correction
- Strips placeholder values (containing "your\_", "placeholder", or invalid addresses)

**Dispatcher** (`dispatcher.ts`):

- Parallel execution via `Promise.allSettled` for ready tasks (all deps satisfied)
- Auto-inject: maps dependency result fields to matching parameter names in downstream tasks
- Uses `toJSONSchema` to extract action parameter names for matching
- Fallback `_context` object contains all dependency results for manual extraction
- Exponential backoff retry (1s, 2s, 4s) with configurable `maxRetries`
- Timeout enforcement per task (default: 30s)
- Deadlock detection: throws if `ready.length === 0 && pending.size > 0`

**Orchestrator** (`orchestrator.ts`):

- `.agent(name, role, agentInstance)` -- chainable registration
- `.swarm(goal, options)` -- 3-phase execution (Plan -> Dispatch -> Summarize)
- Auto-extracts capabilities from each agent's `getAvailableActions()`
- Default options: maxRetries=2, taskTimeout=30s, maxTasks=20, parallel=true, model="gpt-4o"

### Event Hooks

```typescript
const result = await orchestrator.swarm(goal, {
  onPlanReady: (tasks: Task[]) => {
    /* plan generated */
  },
  onTaskStart: (taskId: string) => {
    /* task execution started */
  },
  onTaskComplete: (taskId: string, result: any) => {
    /* task succeeded */
  },
  onTaskError: (taskId: string, error: Error) => {
    /* task failed */
  },
  onComplete: (result: SwarmResult) => {
    /* all done */
  },
});
```

### Auto-Inject Example

If Task A (`resolve_domain`) returns `{address: "0:abc..."}` and Task B (`get_balance`, which depends on Task A) accepts an `address` parameter, the dispatcher automatically injects the value. No manual wiring needed. The dispatcher uses `toJSONSchema` to discover each action's accepted parameter names.

---

## x402 Payment Middleware -- Design

```
Agent A                    x402 Server                  TON Blockchain
   │                           │                              │
   │── GET /api/data ─────────→│                              │
   │<── 402 Payment Required ──│                              │
   │   {amount, recipient,     │                              │
   │    protocol: ton-x402-v1} │                              │
   │                           │                              │
   │── transfer_ton ──────────────────────────────────────────→│
   │<── TX confirmed ──────────────────────────────────────────│
   │                           │                              │
   │── GET /api/data ─────────→│                              │
   │   X-Payment-Hash: abc123  │── verify on-chain ──────────→│
   │                           │<── confirmed ─────────────────│
   │<── 200 {data} ───────────│                              │
```

### Production Security:

- **Anti-replay**: `ReplayStore` interface (File / Redis / Memory / Custom) -- store is checked **before** in-memory cache
- **Per-instance cache**: `verifiedPayments` Set lives inside `tonPaywall()` closure, not module scope -- each middleware instance has its own cache (no cross-server leaks)
- **Timestamp**: TX must be < 5 min old (`utime` check, configurable via `proofTTL`)
- **Amount**: Smart tolerance (cross: 0.0005 TON, self: 0.005 TON for gas deduction)
- **2-level verification**: Blockchain endpoint (`/blockchain/transactions/{hash}`) -> Events endpoint (`/events/{hash}`) fallback
- **Recipient validation**: Normalized address comparison (lowercase, "0:" prefix stripped)

### Storage Options:

- **FileReplayStore** -- Default, zero dependencies, persists to `.x402-used-hashes.json`, survives restarts
- **RedisReplayStore** -- Production scale, works with @upstash/redis, ioredis, or any Redis client
- **MemoryReplayStore** -- Testing only, data lost on restart
- **Custom** -- Implement `ReplayStore` interface: `has(hash): Promise<boolean>`, `add(hash): Promise<void>`

---

## Escrow Plugin -- On-Chain Design

Each escrow deal deploys a **Tact smart contract** to TON. All state is on-chain -- no JSON storage.

```
Depositor                  Escrow Contract (Tact)       Beneficiary
   │                           │ (deployed on-chain)         │
   │── create_escrow ─────────→│ Deploy contract with:       │
   │                           │  depositor, beneficiary,    │
   │                           │  arbiter, deadline          │
   │                           │                             │
   │── deposit_to_escrow ─────→│ Receive Deposit message     │
   │   (TON sent to contract)  │ amount += msg.value         │
   │                           │                             │
   │── release_escrow ────────→│ Receive Release message     │
   │   (depositor or arbiter)  │ Send funds to beneficiary ──→│
   │                           │ released = true             │
   │                           │                             │
   │   OR after deadline:      │                             │
   │── refund_escrow ─────────→│ Receive Refund message      │
   │<── funds returned ────────│ refunded = true             │
```

### Smart Contract ([contracts/escrow.tact](contracts/escrow.tact)):

- **Deposit**: Accepts TON via `Deposit` message, accumulates in contract balance
- **Release**: Only depositor or arbiter can release to beneficiary
- **Refund**: Depositor, arbiter, or anyone after deadline can trigger refund
- **Gas fix**: Uses `SendRemainingBalance | SendIgnoreErrors` mode with `value: 0` -- forwards all remaining gas, does not fail on error. This replaced the misleading `value: self.amount - ton("0.01")` pattern.
- **State**: All escrow data readable via `get fun escrowData()` on-chain
- **Double-settle prevention**: `released` and `refunded` flags prevent re-entrancy
- **Audit**: Every action is a verifiable on-chain transaction
- **Compiled output**: Tact compiled output (ABI, BOC, TS wrappers) is copied to `plugin-escrow/src/contracts/`

A JSON index maps `escrowId -> contractAddress` for lookup convenience.

---

## Autonomous Runtime (`agent.runLoop()`) -- Design

```
User                     TonAgentKit              OpenAI-compatible LLM
  │                           │                           │
  │── runLoop(goal) ─────────→│                           │
  │                           │── Build tool definitions ─→│
  │                           │   (Zod v4 -> toJSONSchema) │
  │                           │                           │
  │                           │   ┌─── Iteration Loop ───┐│
  │                           │   │                       ││
  │                           │   │── chat.completions ──→││
  │                           │   │<── tool_calls[] ──────││
  │                           │   │                       ││
  │                           │   │── Execute actions ────││
  │                           │   │   (on-chain TXs)      ││
  │                           │   │                       ││
  │                           │   │── Feed results back ─→││
  │                           │   │   (as tool results)   ││
  │                           │   │                       ││
  │                           │   └─── Until no tool_calls│
  │                           │                           │
  │<── {goal, steps, summary} │                           │
```

### Key design decisions:

- **Zod v4 native**: Uses `toJSONSchema()` from Zod v4 directly (top-level import) -- no `zod-to-json-schema` dependency. Works correctly via `npm install` (not just monorepo) thanks to `zod` being a peer dependency, ensuring a single Zod instance
- **Proper JSON schemas**: `toAITools()` generates correct parameter names (`to`, `beneficiary`, `domain`, etc.) and types -- verified by 458/462 tests and 13/13 bot messages
- **Provider-agnostic**: Any OpenAI-compatible API works via `baseURL` (OpenRouter, Groq, Together, Mistral)
- **Parameter remapping**: Automatically fixes LLM parameter name mismatches against action schemas
- **Event hooks**: `onIteration`, `onActionStart`, `onActionResult`, `onComplete` for custom UIs
- **Bounded execution**: `maxIterations` prevents runaway loops (default: 5)

### 5 Demo Scenarios (demo-runloop.ts):

1. **Balance & Price Analysis** -- Check balance, get USDT price, calculate holdings value
2. **Autonomous Transfer** -- Send 0.001 TON, verify balance change
3. **Multi-Step Research** -- Resolve foundation.ton, check balance, get price, summarize
4. **Full Agent Workflow** -- Register agent, balance, price, DNS, discover, full report
5. **Autonomous Escrow** -- Create escrow, list all, inspect details

---

## Multi-Agent Architecture

```
Agent A (market-data-provider)          Agent B (trading-bot)
Wallet A (separate mnemonic)            Wallet B (separate mnemonic)
         │                                       │
    1. register_agent ──→ Registry          2. register_agent ──→ Registry
         │                                       │
         │                              3. discover_agent("price_feed")
         │<────── found Agent A ─────────────────│
         │                                       │
         │                              4. create_escrow (deploy contract)
         │                              5. deposit_to_escrow (lock TON)
         │                                       │
    6. Deliver service ──────────────────────────→│
         │                                       │
         │                              7. release_escrow (funds -> Agent A)
         │                                       │
    8. rate Agent B ──→ Reputation      9. rate Agent A ──→ Reputation
```

Every step is a real on-chain transaction verifiable on [tonviewer.com](https://tonviewer.com).

---

## Telegram Bot -- Design

```
User (Telegram)          Bot                    OpenAI           TON
     │                    │                       │               │
     │── "Send 1 TON" ──→│── function call ─────→│               │
     │                    │<── transfer_ton() ────│               │
     │                    │                       │               │
     │                    │── amount > 0.05? ────→│               │
     │<── Approve? ───────│   (HITL check)        │               │
     │── Approve ────────→│                       │               │
     │                    │── balance check ──────────────────────→│
     │                    │── sendTransfer ───────────────────────→│
     │                    │<── TX confirmed ──────────────────────│
     │<── "Sent 1 TON" ──│                       │               │
```

### Features:

- **68 actions** available via `toAITools()` for proper LLM schemas
- Configurable LLM via `OPENAI_BASE_URL` and `AI_MODEL` env vars (default: GPT-4.1-nano)
- **HITL**: transfers > 0.05 TON require Approve/Reject inline buttons
- **TX mode**: `TX auto` (skip buttons) / `TX confirm` (require approval)
- **Balance guard**: prevents insufficient funds
- **HTML formatting**: bold, monospace, explorer links, shortened addresses
- **Typing indicators**: shows "typing..." during LLM processing
- Bot commands: `/start` (onboarding + balance), `/help` (command reference), `/wallet` (quick balance)
- Registered bot commands menu via `bot.api.setMyCommands()`
- @grammyjs/runner for concurrent processing (fixes HITL deadlock)
- Per-user chat history with error recovery
- `safeReply` fallback for HTML parse errors
- 7 plugins loaded: Token, DeFi, DNS, Staking, Escrow, Identity, Analytics

---

## Agent Commerce Protocol

```
┌─────────────┐     Registry       ┌─────────────┐
│   Agent A    │ ─── discover ────→ │   Agent B    │
│ trader-bot   │                    │ data-provider│
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       │         x402 Protocol             │
       │ ──── GET /api (402) ────────────→ │
       │ ──── pay via transfer_ton ──────→ │
       │ ──── GET /api + proof ──────────→ │
       │ <─── 200 {data} ─────────────────│
       │                                   │
       │         Reputation                │
       │ ──── rate task (success) ───────→ │
       │                                   │
┌──────┴───────┐                    ┌──────┴───────┐
│  User (TG)   │                    │  On-chain     │
│  HITL approve│                    │  reputation   │
└──────────────┘                    └───────────────┘
```

See [demo-agent-commerce.ts](demo-agent-commerce.ts) for the demo and [test-commerce.ts](test-commerce.ts) for the full 9-section E2E suite with 5 wallets.

---

## Agent Communication Protocol

On-chain intent/offer system stored in the reputation contract. Agents broadcast what they need, others respond with offers. The full lifecycle runs on-chain with sha256-indexed service lookup (O(1)). Max 10 open intents per agent with automatic cleanup of expired entries. See [docs/agent-comm.md](docs/agent-comm.md).

## Strategy Engine

Deterministic workflow engine. Define step-by-step workflows with conditions, transforms, retries, and scheduling. Runs independently of LLMs. Built-in templates for DCA buying, price monitoring, portfolio rebalancing, and reputation guarding. See [docs/strategies.md](docs/strategies.md).

## Cache Layer

TTL-based transparent cache on `runAction()`. Read actions cached with per-action TTLs (get_price: 30s, get_balance: 10s, resolve_domain: 5min). Write actions never cached, auto-invalidate related reads. 376x speedup on repeated calls. LRU eviction at 500 entries.

## Agent Lifecycle Manager

Process manager for long-running agents. Deploy, start, stop, restart with health checks (periodic `get_balance` calls), auto-restart on crash (exponential backoff: 1s, 2s, 4s, max 30s), max runtime enforcement, and event hooks. See `packages/orchestrator/src/agent-manager.ts`.

## 5-Agent Autonomous Simulation

[test-autonomous.ts](test-autonomous.ts) runs 4 scripted agents and 1 fully LLM-driven agent concurrently for up to 1 hour on testnet. Agent D has a 20% delivery failure rate that creates natural disputes. Agent E uses `runLoop()` with all 68 tools. See [docs/autonomous-simulation.md](docs/autonomous-simulation.md).

---

## Test Results

| Test Suite             | Result              | Details                                                                                    |
| ---------------------- | ------------------- | ------------------------------------------------------------------------------------------ |
| test-all-actions.ts    | 76+ pass            | 16 sections, 68 actions, 12 plugins                                                         |
| test-escrow.ts         | 21/21 pass          | 7 sections, full lifecycle + gas fix verified on-chain                                     |
| test-orchestrator.ts   | 33/34 pass          | 11 sections, parallel + dependencies + event hooks                                         |
| test-x402.ts           | 10+ pass            | Security edge cases: anti-replay, wrong wallet, old TX, insufficient amount, wrong network |
| test-x402-npm.ts       | 29/29 pass          | npm install security tests                                                                 |
| test-npm-exhaustive.ts | 75/75 pass (1 skip) | All 68 actions via npm install                                                             |
| test-toaitools.ts      | 458/462 pass        | Zod v4 native toJSONSchema()                                                               |
| demo-runloop.ts        | 5/5 scenarios       | 15+ autonomous actions                                                                     |
| demo-agent-commerce.ts | 8/8 steps           | On-chain verified, 2 wallets                                                               |
| Claude Desktop MCP     | 8/8 pass            | Live tool calls                                                                            |
| Telegram Bot           | 13/13 pass          | Correct parameter names                                                                    |

---

## Differentiation

### vs. Hackathon Competitors

| Project            | What they built   | What we add                                                        |
| ------------------ | ----------------- | ------------------------------------------------------------------ |
| TON AI Framework   | Generic framework | 37 concrete actions, MCP, bot, x402, orchestrator, DeFi primitives |
| TON Security Agent | Scam detection    | Full agent economy infrastructure                                  |
| Gold Standard      | Vague concept     | Working MVP with live transactions                                 |

### vs. Other Chains

| Feature                  | Our advantage                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multi-Agent Orchestrator | N agents collaborate with parallel execution, dependency resolution, and auto-inject -- no other agent SDK on any blockchain has this                         |
| DeFi Primitives          | DCA orders, limit orders, yield farming (2000+ pools), staking pool discovery, token trust scoring -- comprehensive DeFi coverage via swap.coffee and DYOR.io |
| Autonomous Runtime       | `agent.runLoop()` -- no other agent SDK has LLM-driven autonomous execution                                                                                   |
| `toAITools()`            | Works via `npm install` (not just monorepo) -- proper JSON schemas with correct parameter names, powered by Zod v4 native `toJSONSchema()`                    |
| 15 npm packages          | Modular -- install only what you need, vs monolithic single-package SDKs                                                                                      |
| On-chain Escrow          | Tact smart contract deployed per deal -- fully trustless, gas-optimized                                                                                       |
| x402                     | Production-hardened with pluggable anti-replay, per-instance cache, 2-level on-chain verification                                                             |
| Agent identity           | Registry + reputation (like ERC-8004 for TON)                                                                                                                 |
| HITL                     | Telegram-native (1B users) vs custom UI                                                                                                                       |
| Multi-agent commerce     | 2 real wallets, on-chain escrow between agents, 8-step demo                                                                                                   |
| User access              | Telegram bot = zero friction                                                                                                                                  |

---

## Technology Stack

| Layer        | Technology                                                                                     |
| ------------ | ---------------------------------------------------------------------------------------------- |
| Runtime      | Bun 1.3+                                                                                       |
| Language     | TypeScript (strict)                                                                            |
| Blockchain   | @ton/ton, @ton/core, @ton/crypto                                                               |
| DeFi         | @dedust/sdk, @ston-fi/sdk                                                                      |
| AI/MCP       | @modelcontextprotocol/sdk                                                                      |
| LLM          | OpenAI (configurable via OPENAI_BASE_URL + AI_MODEL)                                           |
| Bot          | grammY, @grammyjs/runner                                                                       |
| HTTP         | Express (x402 middleware)                                                                      |
| Contracts    | Tact (escrow)                                                                                  |
| Validation   | Zod v4 (native `toJSONSchema()`, peer dependency)                                              |
| APIs         | TONAPI (indexed data), swap.coffee (DCA, limit orders, yield, staking), DYOR.io (trust scores) |
| Storage      | JSON files (File), Redis (optional), Custom                                                    |
| Distribution | npm (public registry -- 15 packages under @ton-agent-kit)                                      |

---
