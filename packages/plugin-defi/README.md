# @ton-agent-kit/plugin-defi

DeFi plugin for DEX swaps, price feeds, DCA orders, limit orders, yield farming, staking pools, and token trust scores on TON. Aggregates DeDust, STON.fi, swap.coffee, and Omniston behind a unified interface.

Part of [TON Agent Kit](https://github.com/Andy00L/ton-agent-kit).

## Install

```bash
npm install @ton-agent-kit/plugin-defi @ton-agent-kit/core zod
```

## Usage

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import DefiPlugin from "@ton-agent-kit/plugin-defi";

const agent = new TonAgentKit(wallet).use(DefiPlugin);

// Check token price
const price = await agent.runAction("get_price", {
  token: "EQBynBO23...",
});
console.log(price);

// Swap at best price across all DEXes
const swap = await agent.runAction("swap_best_price", {
  fromToken: "TON",
  toToken: "EQBynBO23...",
  amount: "10",
});
console.log(swap.explorerUrl);
```

## Actions

| Action | Description |
|---|---|
| `swap_dedust` | Swap tokens on DeDust DEX. |
| `swap_stonfi` | Swap tokens on STON.fi DEX. |
| `swap_best_price` | Swap at best price across all DEXes via Omniston aggregator. |
| `get_price` | Get token price from DEX pools. |
| `create_dca_order` | Create a Dollar Cost Averaging order (swap.coffee). |
| `create_limit_order` | Create a limit order (swap.coffee). |
| `cancel_order` | Cancel an active DCA or limit order (swap.coffee). |
| `get_yield_pools` | List yield farming and liquidity pools (swap.coffee). |
| `yield_deposit` | Deposit into a yield farming pool. |
| `yield_withdraw` | Withdraw from a yield farming pool. |
| `get_staking_pools` | List staking pools with APR (swap.coffee). |
| `get_token_trust` | Get token trust score from DYOR.io. |

## Links

- [GitHub](https://github.com/Andy00L/ton-agent-kit)
- [npm](https://www.npmjs.com/package/@ton-agent-kit/plugin-defi)

## License

MIT
