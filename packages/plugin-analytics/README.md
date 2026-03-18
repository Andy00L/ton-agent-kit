# @ton-agent-kit/plugin-analytics

Analytics plugin for wallet insights, transaction history, portfolio metrics, and real-time event subscriptions on TON.

Part of [TON Agent Kit](https://github.com/Andy00L/ton-agent-kit).

## Install

```bash
npm install @ton-agent-kit/plugin-analytics @ton-agent-kit/core zod
```

## Usage

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import AnalyticsPlugin from "@ton-agent-kit/plugin-analytics";

const agent = new TonAgentKit(wallet).use(AnalyticsPlugin);

// Get transaction history
const history = await agent.runAction("get_transaction_history", {
  limit: 10,
});
console.log(history);

// Compute portfolio metrics
const metrics = await agent.runAction("get_portfolio_metrics", {});
console.log(metrics.pnl, metrics.roi);
```

## Actions

| Action | Description |
|---|---|
| `get_wallet_info` | Get detailed wallet info (balance, status, interfaces). |
| `get_transaction_history` | Get recent transaction history for a wallet. |
| `get_portfolio_metrics` | Compute PnL, ROI, win rate, and max drawdown. |
| `get_equity_curve` | Daily balance time-series for charting. |
| `wait_for_transaction` | Wait for the next transaction via SSE streaming. |
| `subscribe_webhook` | Register a TONAPI webhook for transaction notifications. |
| `call_contract_method` | Call any get-method on any smart contract. |
| `get_accounts_bulk` | Fetch account info for multiple addresses in one call. |

## Links

- [GitHub](https://github.com/Andy00L/ton-agent-kit)
- [npm](https://www.npmjs.com/package/@ton-agent-kit/plugin-analytics)

## License

MIT
