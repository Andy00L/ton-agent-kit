# @ton-agent-kit/plugin-token

Token plugin for TON and Jetton (fungible token) operations. Query balances, transfer native TON and Jetton tokens, deploy new Jettons, inspect metadata, and simulate transactions.

Part of [TON Agent Kit](https://github.com/Andy00L/ton-agent-kit).

## Install

```bash
npm install @ton-agent-kit/plugin-token @ton-agent-kit/core zod
```

## Usage

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import TokenPlugin from "@ton-agent-kit/plugin-token";

const agent = new TonAgentKit(wallet).use(TokenPlugin);

// Check TON balance
const balance = await agent.runAction("get_balance", {});
console.log(balance);

// Transfer TON
const tx = await agent.runAction("transfer_ton", {
  to: "EQBx...",
  amount: "1.5",
  comment: "Payment",
});
console.log(tx.explorerUrl);
```

## Actions

| Action | Description |
|---|---|
| `get_balance` | Get the TON balance of any wallet. |
| `get_jetton_balance` | Get a Jetton token balance for a wallet. |
| `transfer_ton` | Send TON to another address with an optional comment. |
| `transfer_jetton` | Send Jetton tokens to another address. |
| `deploy_jetton` | Deploy a new Jetton token contract. |
| `get_jetton_info` | Get Jetton metadata (name, symbol, decimals, supply). |
| `simulate_transaction` | Simulate a TON transfer via emulation without broadcasting. |

## Links

- [GitHub](https://github.com/Andy00L/ton-agent-kit)
- [npm](https://www.npmjs.com/package/@ton-agent-kit/plugin-token)

## License

MIT
