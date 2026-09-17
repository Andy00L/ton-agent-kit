<p align="center">
  <img src="assets/hero.png" alt="TON Agent Kit" width="1000">
</p>

<p align="center">
  <h1 align="center">TON Agent Kit</h1>
  <p align="center"><strong>The Agent Commerce Protocol for TON</strong></p>
  <p align="center">Connect any AI agent to TON. Build agent economies with on-chain escrow, reputation, and paid APIs.</p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ton-agent-kit/core"><img src="https://img.shields.io/npm/v/@ton-agent-kit/core?label=%40ton-agent-kit%2Fcore" alt="npm"></a>
  <a href="https://www.npmjs.com/search?q=%40ton-agent-kit"><img src="https://img.shields.io/badge/npm-21%20packages-blue" alt="npm packages"></a>
  <a href="https://github.com/Andy00L/ton-agent-kit/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Andy00L/ton-agent-kit/ci.yml?branch=main&label=CI" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#packages">Packages</a> &bull;
  <a href="#all-actions">Actions</a> &bull;
  <a href="#smart-contracts">Contracts</a> &bull;
  <a href="#agent-commerce-protocol">Commerce</a> &bull;
  <a href="#mcp-server">MCP</a> &bull;
  <a href="#x402-payment-middleware">x402</a> &bull;
  <a href="#telegram-bot">Bot</a> &bull;
  <a href="#test-suite">Tests</a>
</p>

---

## What is TON Agent Kit?

A TypeScript SDK that gives AI agents full access to TON protocols. 75 actions across 12 plugins, packaged as 21 npm modules.

Agents can swap tokens, deploy contracts, manage escrows, broadcast intents, discover other agents, and get paid for services. All from a single `TonAgentKit` instance.

The core loop: register on-chain, publish capabilities, find services, negotiate deals, escrow funds, deliver via x402, settle, rate.

```
Agent A                  TON Blockchain                Agent B
  |                          |                           |
  |-- register_agent ------->|                           |
  |                          |<------ register_agent ----|
  |-- broadcast_intent ----->|                           |
  |    "need price feed"     |                           |
  |                          |-------- discover -------->|
  |                          |<------- send_offer -------|
  |<- get_offers ------------|                           |
  |-- accept_offer --------->|                           |
  |-- create_escrow -------->|                           |
  |-- deposit_to_escrow ---->|                           |
  |                          |<-- deliver via x402 ------|
  |-- confirm_delivery ----->|                           |
  |-- release_escrow ------->|                           |
  |-- settle_deal ---------->|                           |
```

## Quick Start

```bash
npm install @ton-agent-kit/core @ton-agent-kit/plugin-token @ton-agent-kit/plugin-defi
```

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import TokenPlugin from "@ton-agent-kit/plugin-token";
import DefiPlugin from "@ton-agent-kit/plugin-defi";

const wallet = await KeypairWallet.fromMnemonic(process.env.TON_MNEMONIC!.split(" "), {
  network: "testnet",
  version: "V5R1",
});

const agent = new TonAgentKit(wallet, "https://testnet-v4.tonhubapi.com")
  .use(TokenPlugin)
  .use(DefiPlugin);

// Run an action directly
const balance = await agent.runAction("get_balance", {});

// Or expose all actions as OpenAI-compatible tools
const tools = agent.toAITools(); // Zod v4 -> JSON Schema
```

The `.use()` calls are chainable. `toAITools()` converts every registered action schema (Zod v4) into OpenAI function-calling format. Pass `tools` to any LLM.

### Environment

```bash
# .env
TON_MNEMONIC=word1 word2 ... word24
TON_NETWORK=testnet
OPENAI_API_KEY=sk-...
```

See [.env.example](.env.example) for the full list.

---

## Architecture

```mermaid
graph TD
    subgraph Runtimes
        MCP["MCP Server<br>(packages/mcp-server)"]
        BOT["Telegram Bot<br>(separate repo)"]
        TEST["Test Runner<br>(tests.ts)"]
        CUSTOM["Your App"]
    end

    subgraph Core
        AK["TonAgentKit<br>.use() .runAction() .toAITools() .runLoop()"]
        PR["PluginRegistry"]
        AC["ActionCache (TTL + LRU)"]
        W["KeypairWallet / ReadOnlyWallet"]
    end

    subgraph Plugins["12 Plugins (75 actions)"]
        P1["Token (7)"]
        P2["DeFi (12)"]
        P3["Escrow (14)"]
        P4["Identity (9)"]
        P5["AgentComm (7)"]
        P6["Analytics (8)"]
        P7["+ DNS, NFT, Staking,<br>Payments, Memory, Endpoints"]
    end

    subgraph Infra
        O["Orchestrator"]
        S["Strategies"]
        X["x402 Middleware"]
        L["LangChain + AI Tools"]
    end

    subgraph Blockchain["TON Blockchain"]
        RC["Reputation Contract<br>(testnet)"]
        EC["Escrow Contracts<br>(per-deal)"]
    end

    MCP --> AK
    BOT --> AK
    TEST --> AK
    CUSTOM --> AK
    AK --> PR
    AK --> AC
    AK --> W
    PR --> Plugins
    P3 --> EC
    P4 --> RC
    P5 --> RC
    O --> AK
    S --> AK
    X --> Blockchain
```

Full architecture: [ARCHITECTURE.md](ARCHITECTURE.md)

---

## Packages

21 npm packages. 12 plugins with actions, 9 infrastructure modules.

| Package | What it does |
|---|---|
| `@ton-agent-kit/core` | Agent, plugin system, wallet, gas estimation, cache, verify |
| `@ton-agent-kit/plugin-token` | TON and Jetton transfers, balances, deploy, simulate |
| `@ton-agent-kit/plugin-defi` | DeDust, STON.fi, Omniston swaps, DCA, limits, yield, staking pools, trust |
| `@ton-agent-kit/plugin-dns` | .ton domain resolution, reverse lookup, domain info |
| `@ton-agent-kit/plugin-nft` | NFT info, transfer, collection data |
| `@ton-agent-kit/plugin-staking` | Stake/unstake TON in validator pools |
| `@ton-agent-kit/plugin-analytics` | TX history, wallet info, portfolio, equity curve, webhooks, contract calls |
| `@ton-agent-kit/plugin-escrow` | On-chain Tact escrow with dispute resolution |
| `@ton-agent-kit/plugin-identity` | Agent registry, reputation, discovery, on-chain scan fallback, cleanup |
| `@ton-agent-kit/plugin-payments` | x402 payment flow, delivery proofs, binary content detection, JSON-unwrap |
| `@ton-agent-kit/plugin-agent-comm` | Intent/offer marketplace protocol, testnet retry for indexing delays |
| `@ton-agent-kit/plugin-memory` | Key-value store (file, in-memory) with TTL and namespaces |
| `@ton-agent-kit/plugin-endpoints` | Dynamic x402 endpoint management (open, close, list) |
| `@ton-agent-kit/orchestrator` | Multi-agent planner, dispatcher, parallel execution |
| `@ton-agent-kit/strategies` | Deterministic workflow engine, scheduling, templates |
| `@ton-agent-kit/x402-middleware` | Express paywall middleware, address normalization, atomic anti-replay claims |
| `@ton-agent-kit/mcp-server` | Model Context Protocol server (stdio + SSE) |
| `@ton-agent-kit/langchain` | LangChain DynamicStructuredTool adapter |
| `@ton-agent-kit/ai-tools` | Vercel AI SDK and OpenAI tools adapter |
| `@ton-agent-kit/wallet-store` | AES-256-GCM encrypted wallet/key storage, file store with 48h TTL |
| `@ton-agent-kit/network-mode` | CLI network mode selector (local, public IP, tunnel) |

All packages are `@ton-agent-kit/*` scoped on npm. Published versions live on
[npm](https://www.npmjs.com/org/ton-agent-kit); a table here would go stale the
next time any one of the 21 is released, and it did.

---

## All Actions

75 actions across 12 plugins. Each action has a Zod v4 schema, a description, and a handler function.

### Token (7 actions)

| Action | What it does |
|---|---|
| `get_balance` | TON balance for any wallet |
| `get_jetton_balance` | Jetton balance for a wallet (via TONAPI) |
| `transfer_ton` | Send TON with simulate-only, simulate-first, or direct mode |
| `transfer_jetton` | Send Jettons (resolves Jetton wallet address) |
| `deploy_jetton` | Deploy new Jetton minter with on-chain TEP-64 metadata |
| `get_jetton_info` | Jetton master data (total supply) |
| `simulate_transaction` | Build and emulate a TX via TONAPI without broadcasting |

### DeFi (12 actions)

| Action | What it does |
|---|---|
| `swap_dedust` | Swap on DeDust DEX (TON/Jetton, Jetton/Jetton) |
| `swap_stonfi` | Swap on STON.fi DEX, with a caller-stated minimum output |
| `swap_best_price` | Aggregated swap via Omniston WebSocket (best price across all DEXes) |
| `get_price` | USD and TON price for a Jetton (TONAPI rates) |
| `create_dca_order` | DCA order via swap.coffee Strategies API |
| `create_limit_order` | Limit order via swap.coffee |
| `cancel_order` | Cancel active DCA or limit order |
| `get_yield_pools` | List 2000+ yield/LP pools (16 protocols) from swap.coffee |
| `yield_deposit` | Deposit into a yield pool (provide_liquidity op) |
| `yield_withdraw` | Withdraw from a pool (burn LP tokens) |
| `get_staking_pools` | Staking pools with APR/TVL from swap.coffee |
| `get_token_trust` | Token trust score and risk flags from DYOR.io |

### DNS (3 actions)

| Action | What it does |
|---|---|
| `resolve_domain` | Resolve .ton domain to wallet address |
| `lookup_address` | Reverse lookup: wallet address to .ton domain |
| `get_domain_info` | Domain details including expiry |

### NFT (3 actions)

| Action | What it does |
|---|---|
| `get_nft_info` | NFT data (index, owner, collection, metadata) |
| `transfer_nft` | Transfer NFT ownership |
| `get_nft_collection` | Collection info (name, description, item count) |

### Staking (3 actions)

| Action | What it does |
|---|---|
| `get_staking_info` | Nominator pool positions for a wallet |
| `stake_ton` | Deposit to a validator pool |
| `unstake_ton` | Withdraw from a validator pool |

### Analytics (8 actions)

| Action | What it does |
|---|---|
| `get_transaction_history` | Recent wallet events from TONAPI |
| `get_wallet_info` | Balance, status, interfaces, last activity |
| `get_portfolio_metrics` | PnL, ROI, win rate, max drawdown |
| `get_equity_curve` | Daily balance time-series |
| `wait_for_transaction` | SSE stream, blocks until next TX or timeout |
| `subscribe_webhook` | Register TONAPI webhook for TX notifications |
| `call_contract_method` | Call any get-method on any contract (TVM stack decode) |
| `get_accounts_bulk` | Bulk account info for up to 100 addresses |

### Escrow (14 actions)

| Action | What it does |
|---|---|
| `create_escrow` | Deploy Tact escrow contract on-chain |
| `deposit_to_escrow` | Fund the escrow |
| `release_escrow` | Release funds to beneficiary |
| `refund_escrow` | Refund funds to depositor |
| `get_escrow_info` | Read on-chain state or list all escrows |
| `confirm_delivery` | Buyer confirms delivery (optional x402 proof hash) |
| `auto_release_escrow` | Auto-release after deadline (requires delivery confirmation) |
| `open_dispute` | Freeze escrow for arbiter voting |
| `join_dispute` | Self-select as arbiter with TON stake |
| `vote_release` | Vote to release (majority settles) |
| `vote_refund` | Vote to refund (majority settles) |
| `claim_reward` | Collect arbiter reward after settlement |
| `fallback_settle` | Settle after 72h voting deadline |
| `seller_stake_escrow` | Seller deposits rep collateral before buyer funds |

### Identity (9 actions)

| Action | What it does |
|---|---|
| `register_agent` | Register on-chain + local JSON registry |
| `discover_agent` | Find agents by name (O(1)), capability index, or full scan with pagination |
| `get_agent_reputation` | Read on-chain score, optionally submit rating |
| `deploy_reputation_contract` | Deploy the Tact Reputation contract |
| `withdraw_reputation_fees` | Pull accumulated fees (owner only) |
| `process_pending_ratings` | Read queued ratings from memory, auto-submit |
| `get_open_disputes` | List unsettled disputes from on-chain |
| `trigger_cleanup` | Remove bad-score, inactive, or ghost agents |
| `get_agent_cleanup_info` | Check if an agent is eligible for cleanup |

### Payments (2 actions)

| Action | What it does |
|---|---|
| `pay_for_resource` | Full x402 flow: pay, wait, retry with proof hash. Handles JSON and binary responses. |
| `get_delivery_proof` | Look up delivery proof by TX hash or escrow ID |

### Agent Communication (7 actions)

| Action | What it does |
|---|---|
| `broadcast_intent` | Publish a service request on-chain (with description) |
| `discover_intents` | Find open intents (index-based or linear scan) |
| `send_offer` | Respond to an intent with price, delivery time, and endpoint |
| `get_offers` | Read pending offers for an intent |
| `accept_offer` | Accept an offer on-chain |
| `settle_deal` | Finalize a deal with 0-100 rating |
| `cancel_intent` | Cancel your own intent |

### Memory (4 actions)

| Action | What it does |
|---|---|
| `save_context` | Save key-value entry with optional TTL |
| `get_context` | Retrieve by key |
| `list_context` | List entries in namespace with optional prefix filter |
| `delete_context` | Delete entry by key |

### Endpoints (3 actions)

| Action | What it does |
|---|---|
| `open_x402_endpoint` | Create a paid endpoint that calls a specified data action |
| `close_x402_endpoint` | Remove a paid endpoint by path |
| `list_x402_endpoints` | List all active endpoints with prices and serve counts |

---

## Smart Contracts

Two Tact contracts deployed on TON testnet. Both use a self-funding model: each operation adds a small amount to a `storageFund` pool that covers long-term on-chain storage.

### Reputation Contract

On-chain agent registry, reputation scoring, intent/offer marketplace, and dispute tracking.

**Testnet address:** `0:6e78355a901729e4218ce6632a6a98df81e7a6740613defc99ef9639942385e9`

- 14 receive handlers, 19 getters, 39 state maps
- Score formula: `(successes * 100) / totalTasks` (0-100 integer)
- Max 10 open intents per agent. Quota pressure triggers automatic cleanup of expired intents.
- Capability index for O(1) agent discovery by service type
- Cleanup: removes agents below 20% score (100+ ratings), inactive 30+ days, or ghost (0 ratings after 7 days)
- Cascade erase: when an agent is cleaned up, expires up to 20 intents and rejects up to 30 offers

```mermaid
graph LR
    R[register_agent] --> D[discover_agent]
    D --> I[broadcast_intent]
    I --> O[send_offer]
    O --> A[accept_offer]
    A --> S[settle_deal + rating]
    S --> REP[Score updated on-chain]
```

Full docs: [docs/reputation-system.md](docs/reputation-system.md)

### Escrow Contract

Deployed per-deal. Handles deposit, delivery confirmation, release, refund, disputes with arbiter voting, and fallback settlement.

- 12 receive handlers, 2 getters, 5 state maps
- Dispute voting: 72h deadline, majority vote (floor(n/2)+1), arbiter stakes
- Seller stake scaling by reputation score (50-150% of base)
- x402 proof hash stored on-chain for verifiable delivery
- Cost: ~0.12 TON to deploy, ~0.03 TON per operation (gas refunded)

```mermaid
graph LR
    A[Create] --> B[Seller Stake]
    B --> C[Deposit]
    C --> D{Delivery?}
    D -->|confirmed| E[Release / Auto-Release]
    D -->|disputed| F[Open Dispute]
    F --> G[Arbiter Votes]
    G --> H{Majority?}
    H -->|release| E
    H -->|refund| I[Refund]
    H -->|timeout 72h| J[Fallback Settle]
```

Full docs: [docs/escrow-system.md](docs/escrow-system.md)

---

## Agent Commerce Protocol

The full workflow for agents trading services on TON. All on-chain.

```mermaid
sequenceDiagram
    participant A as Agent A (buyer)
    participant C as Reputation Contract
    participant B as Agent B (seller)
    participant E as Escrow Contract

    A->>C: register_agent
    B->>C: register_agent
    A->>C: broadcast_intent (service, budget, deadline, description)
    B->>C: discover_intents (by service hash)
    B->>C: send_offer (price, delivery time, endpoint)
    A->>C: get_offers
    A->>C: accept_offer
    A->>E: create_escrow + deposit
    B-->>A: deliver service (via x402 endpoint)
    A->>E: confirm_delivery (x402 proof hash)
    A->>E: release_escrow
    A->>C: settle_deal (rating 0-100)
```

Key details:
- Intents have a 24h max deadline (capped on-chain)
- The `description` field in `broadcast_intent` is stored on-chain, letting sellers understand what the buyer needs
- The `endpoint` field in `send_offer` is stored on-chain, so the buyer knows where to call after accepting
- Cancel an intent anytime (only the creator). Costs ~0.02 TON.
- Settle with a 0-100 rating that updates the seller's on-chain reputation score

Full docs: [docs/agent-comm.md](docs/agent-comm.md)

---

## Multi-Agent Orchestrator

```typescript
import { Orchestrator } from "@ton-agent-kit/orchestrator";

const orchestrator = new Orchestrator();
orchestrator.agent("trader", "executes swaps and transfers", traderAgent);
orchestrator.agent("researcher", "reads prices and pool data", researchAgent);

const result = await orchestrator.swarm(
  "Research TON DeFi pools and execute the best swap",
  { parallel: true, maxRetries: 2 }
);
```

The orchestrator uses an LLM planner to break goals into tasks, assigns them to agents based on their loaded plugins, and runs independent tasks in parallel. Dependencies are resolved automatically.

Components: `Orchestrator`, `Planner`, `Dispatcher`, `AgentManager`.

```mermaid
graph LR
    G[Goal] --> PL[Planner]
    PL --> T1[Task 1]
    PL --> T2[Task 2]
    PL --> T3[Task 3]
    T1 --> D[Dispatcher]
    T2 --> D
    T3 --> D
    D -->|parallel| A1[Agent 1]
    D -->|parallel| A2[Agent 2]
    A1 --> R[Aggregate Results]
    A2 --> R
```

---

## MCP Server

Expose all actions to Claude Desktop (or any MCP client) as tools.

The MCP server lives in `packages/mcp-server/`. It loads 10 plugins and exposes every action as an MCP tool, plus a `ton_agent_info` meta-tool.

Transports: **stdio** (default) and **SSE** (with Bearer token auth).

```json
{
  "mcpServers": {
    "ton-agent-kit": {
      "command": "bun",
      "args": ["run", "/path/to/ton-agent-kit/packages/mcp-server/src/index.ts"],
      "env": {
        "TON_MNEMONIC": "word1 word2 ... word24",
        "TON_NETWORK": "testnet"
      }
    }
  }
}
```

Full docs: [docs/mcp-server.md](docs/mcp-server.md)

---

## x402 Payment Middleware

Express middleware that gates API endpoints behind TON payments. The buyer sends TON, gets a 402 response with payment instructions, pays, and retries with the TX hash.

```typescript
import { createPaymentServer, tonPaywall, MemoryReplayStore } from "@ton-agent-kit/x402-middleware";

app.get("/api/price", tonPaywall({
  recipient: wallet.address.toRawString(),
  amount: "0.001",
  network: "testnet",
  replayStore: new MemoryReplayStore(),
}), (req, res) => {
  res.json({ price: "3.42" });
});
```

Anti-replay protection with 3 store backends: `FileReplayStore`, `RedisReplayStore`, `MemoryReplayStore`.
A custom store implements `has(hash)` and `add(hash)`, and should implement `claim(hash)` too: `claim`
records the hash and reports whether the caller was first, in one atomic step. Without it the middleware
falls back to `has` then `add`, and two requests carrying the same payment can both pass `has` before
either reaches `add`. Version 2.0.0 fixed that race and a paywall bypass, and 3.0.0 added a budget so one payment cannot serve unlimited responses. Both are in [CHANGELOG.md](./CHANGELOG.md).

The `EndpointPlugin` (`@ton-agent-kit/plugin-endpoints`) lets agents open/close x402 endpoints at runtime. Endpoints are advertised in offers via the on-chain `endpoint` field.

Full docs: [docs/x402-protocol.md](docs/x402-protocol.md)

---

## Telegram Bot

The Telegram bot has been moved to a separate repository:
**https://github.com/Andy00L/ton-agent-bot**

It is a multi-user grammY bot with inline keyboard UI, 3 operating modes (Normal, Listen, Auto), HITL approval for on-chain transactions, AES-256-GCM encrypted per-user wallet storage, and 5 LLM provider options.

The bot imports all 12 plugins from this SDK via npm. See [docs/telegram-bot.md](docs/telegram-bot.md) for details.

---

## Autonomous Runtime

### runLoop (built into core)

```typescript
const result = await agent.runLoop(
  "Check balance, find DeFi pools with >10% APR, monitor prices",
  {
    maxIterations: 10,
    model: "gpt-4o",
    onActionStart: (action) => console.log(`Running ${action}...`),
    onActionResult: (action, params, result) => console.log(`${action} done`),
    onComplete: () => console.log("done"),
  },
);

console.log(result.summary);
console.log(`${result.steps.length} actions ran`);
```

`runLoop` is built into `TonAgentKit`. The goal is the first argument, options
are the second. It converts every registered action to an OpenAI tool and runs a
multi-step loop in which the model chooses what to call. It returns
`{ goal, steps, summary }`. Arguments the model sends go to the action's Zod
schema unchanged: an argument that does not validate comes back to the model as
a tool error for it to correct, and is never renamed on its behalf.

The model defaults to `gpt-4.1-nano` and `maxIterations` to 5.

### Strategy Engine

```typescript
import { defineStrategy, StrategyScheduler } from "@ton-agent-kit/strategies";

const dca = defineStrategy({
  name: "weekly-dca",
  schedule: "every 1d",
  steps: [
    { action: "get_balance", params: {} },
    { action: "swap_dedust", params: { amount: "1", tokenAddress: "EQ..." }, condition: (ctx) => ctx.results[0].balance > 2 },
  ],
});
```

4 built-in templates: DCA, PriceMonitor, Rebalance, ReputationGuard.

```mermaid
graph LR
    D[defineStrategy] --> SC[Schedule: once / every Ns/m/h/d]
    SC --> R[StrategyRunner]
    R --> S1[Step 1: condition?]
    S1 -->|pass| E1[Execute action]
    S1 -->|fail| SK[Skip]
    E1 --> T1[Transform result]
    T1 --> S2[Step 2...]
```

Full docs: [docs/strategies.md](docs/strategies.md)

---

## Build It From Source

Everything below the Quick Start needs the repository, not just the published
packages. Requirements: Node 20 or 22 with npm 9 or later for the build, and
[Bun](https://bun.sh) to run the test runner, the contract suites and
`@ton-agent-kit/wallet-store`, which imports `bun:sqlite`. The three `npm test`
commands below strip TypeScript types with `--experimental-strip-types`, which
needs Node 22.6 or later; CI gates them on Node 22 for that reason.

```bash
git clone https://github.com/Andy00L/ton-agent-kit.git
cd ton-agent-kit
npm install
npm run build
```

`npm run build` typechecks and compiles all 21 packages. Success is exit 0 with
no TypeScript diagnostics. CI runs it on Node 20 and Node 22 for every push to
`main` and every pull request against it; the regression suites below run on
Node 22 only.

```bash
npm test -w packages/core              # token amounts, action cache
npm test -w packages/x402-middleware   # paywall floor, replay claims
npm test -w packages/strategies        # scheduling, template action names
npm test -w packages/orchestrator      # task dispatch
npm test -w packages/plugin-agent-comm # TVM stack parsing
npm run test:contracts                 # both Tact contracts, in a sandbox
bun packages/wallet-store/test/secret.test.mjs
bun packages/wallet-store/test/file-store.test.mjs
bun packages/plugin-identity/test/message-bodies.test.mjs
bun packages/core/test/methods-proxy.test.mjs
bun packages/core/test/context-run-action.test.mjs
```

These run offline, with no wallet and no API key. Each prints `n/n passed` and
exits 0 only when every check holds.

---

## Test Suite

28 test suites + shared setup. Interactive CLI runner.

Unlike the regression suites above, these run against live testnet: 27 of the
28 need `TON_MNEMONIC` set to a funded testnet wallet, three of those also need
`OPENAI_API_KEY`, and the remaining one opens a production websocket. None of
them run in CI.

```bash
bun run tests.ts          # Interactive menu
bun run tests.ts all      # Run everything
bun run tests.ts 1,3,7-9  # Specific tests
```

Results are saved to `tests/results/<timestamp>.log`.

| # | Suite | What it tests |
|---|---|---|
| 01 | plugin-system | Plugin registration, toAITools, schema validation |
| 02 | token-plugin | Balances, Jetton info, simulate |
| 03 | defi-plugin | Prices, swap schemas |
| 04 | nft-plugin | Collection data |
| 05 | dns-plugin | Domain resolution, reverse lookup |
| 06 | analytics-plugin | Wallet info, portfolio, equity curve, webhooks, contract calls |
| 07 | staking-plugin | Staking pool info |
| 08 | live-transfer | Real on-chain TON transfers (simulate, simulateFirst, direct) |
| 09 | transfer-edge-cases | Zero amount, negative, insufficient, invalid address |
| 10 | escrow-onchain | Full escrow lifecycle: create, deposit, release |
| 11 | identity-plugin | Registration, discovery, reputation scoring, gas refund check |
| 12 | schema-validation | All 75 actions bulk schema parse |
| 13 | cross-plugin-edge | Unknown action, chainable .use(), mainnet vs testnet |
| 14 | strategy-engine | defineStrategy, parseSchedule, execution |
| 15 | agent-lifecycle | AgentManager: deploy, start, stop, restart, hooks |
| 16 | cache-layer | Hits, misses, TTL, invalidation, LRU |
| 17 | mcp-sse | SSE transport: auth, CORS, health, 401/404 |
| 18 | escrow-advanced | 2-agent lifecycle: deposit, release, refund, double-settle |
| 19 | orchestrator | 4-agent swarm: parallel, dependencies, events, recovery |
| 20 | x402-security | Anti-replay, wrong wallet, expired TX, cross-endpoint |
| 21 | commerce-e2e | Full commerce flow: register, escrow, x402, dispute, rating |
| 22 | strategies-advanced | Templates, conditions, transforms, scheduling, context |
| 23 | agent-manager | Detailed lifecycle: restarts, max runtime, hooks |
| 24 | memory-plugin | InMemory, File, plugin integration, TTL, namespace |
| 25 | omniston | Omniston WebSocket quote for TON to USDT |
| 26 | autonomous-5agents | 5-agent simulation (4 scripted + 1 LLM-driven, 60 min default) |
| 27 | demo-runloop | 5 autonomous scenarios via runLoop |
| 28 | demo-commerce | 2-agent commerce protocol demo |

---

## Comparison

Honest comparison with other agent SDKs. Checkmarks mean the feature exists in the codebase, not that it is production-hardened.

| Feature | TON Agent Kit | Solana Agent Kit | Coinbase AgentKit |
|---|---|---|---|
| Actions | 75 | ~30 | ~20 |
| Plugins | 12 | monolithic | modular |
| Chain | TON | Solana | Base/ETH |
| On-chain escrow | Yes (Tact contract, arbiter voting) | No | No |
| On-chain reputation | Yes (score, cleanup, capability index) | No | No |
| Agent-to-agent protocol | Yes (intent/offer on-chain) | No | No |
| x402 payments | Yes (Express middleware) | No | Yes (ERC-8004) |
| MCP server | Yes (stdio + SSE) | Yes | Yes |
| Telegram HITL | Yes (inline buttons, 3 modes) | No | No |
| Multi-agent orchestrator | Yes (planner + dispatcher) | No | CrewAI integration |
| Strategy engine | Yes (DCA, price monitor, rebalance, rep guard) | No | No |
| LangChain adapter | Yes | Yes | Yes |
| Vercel AI adapter | Yes | No | Yes |
| Autonomous runtime | Yes (runLoop) | No | No |
| Test suites | 28 | varies | varies |

TON Agent Kit has more on-chain primitives. The tradeoff: it only works with TON. If you need multi-chain, this is not the right tool.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node 20 or 22 to build, Bun to run the test runner and wallet-store |
| Language | TypeScript (strict) |
| Blockchain | @ton/ton, @ton/core, @ton/crypto |
| DeFi | @dedust/sdk, @ston-fi/sdk, swap.coffee API, Omniston WebSocket |
| Contracts | Tact |
| AI / LLM | OpenAI SDK (compatible with OpenRouter, Groq, Together, Mistral) |
| MCP | @modelcontextprotocol/sdk |
| Bot | grammY, @grammyjs/runner |
| HTTP | Express |
| Validation | Zod v4 (peer dependency) |
| APIs | TONAPI, swap.coffee, DYOR.io |

---

## Examples

| Example | What it shows |
|---|---|
| [examples/simple-agent](examples/simple-agent) | 20 lines, 3 plugins, `agent.methods` proxy |
| [examples/mcp-server](examples/mcp-server) | MCP server for Claude Desktop |
| [examples/x402-server](examples/x402-server) | Express server with TON paywall endpoints |

---

## Contributing

### Adding a Plugin

```typescript
import { definePlugin, defineAction } from "@ton-agent-kit/core";
import { z } from "zod";

const myAction = defineAction({
  name: "my_action",
  description: "Does something useful",
  schema: z.object({ param: z.string() }),
  handler: async (agent, params) => {
    // agent.wallet, agent.rpcUrl, agent.network
    return { result: "done" };
  },
});

export default definePlugin({
  name: "my-plugin",
  actions: [myAction],
});
```

Then `agent.use(MyPlugin)` and the action is available everywhere: `runAction`, `toAITools`, MCP, orchestrator.

---

## Known Limitations

Stated here rather than found later.

- **The escrow contract has three defects that need a redeployment to fix.**
  They were found by running it, not by reading it, and each is pinned by a
  check in `contracts/test/escrow.sandbox.test.mjs` named `KNOWN DEFECT`:
  a buyer can confirm delivery and then refund itself the whole deal at any
  point before the deadline, leaving the seller with nothing; a dispute cannot
  seat a quorum because `JoinDispute` reserves the balance it is about to hold
  and then sweeps the remainder back, so roughly every other arbiter loses its
  stake to a failed action phase with no record of who sent it; and with fewer
  arbiters than `minArbiters` no vote can be held at all, so every dispute
  falls through to `FallbackSettle`, which the depositor controls. Do not rely
  on the arbiter network.
- **`contracts/reputation.tact` found no defects under the same treatment.**
  Every guard it claims is enforced, including the one that stops an agent
  bidding on its own intent to manufacture a reputation.
- **`npm audit` reports advisories that cannot be cleared today**, one of them
  critical (`protobufjs`, reached through `@ston-fi/omniston-sdk`). Clearing
  the tree means moving `ai` from 3 to 7 and `@ston-fi/sdk` from 1 to 2, both
  breaking changes.
- **Every package publishes TypeScript source**, not compiled JavaScript:
  `main` and `types` both point at `src/index.ts`. A consumer therefore needs a
  bundler, a loader, or Node 23.6 or later, and compiles this SDK under their
  own compiler settings.
- **Escrow actions do not confirm the on-chain outcome.** They send the message
  and write a local terminal status without reading back what the contract did.
  `verifyContractExecution` is exported from core for this and no action calls
  it yet.
- **Delivery is self-reported in escrow**, and the x402 payment proof hash is
  stored but never checked on chain. The reputation-score gate on escrow
  creation is enforced off chain and can be bypassed by calling the contract
  directly.
- **`@ton/ton` 16.3.0 is deliberately not adopted.** The range stays `^16.2.2`:
  the release changes the wallet v5 types and the shape of
  `account.balance.coins`, so it needs a pass with on-chain tests.
- **`any` remains outside the audited files**, mostly in
  `packages/core/src/agent.ts` and the generated Tact bindings.

The full list, with the release each item relates to, is under Known issues in
[CHANGELOG.md](./CHANGELOG.md).

---

## License

MIT
