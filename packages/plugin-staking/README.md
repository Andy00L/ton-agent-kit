# @ton-agent-kit/plugin-staking

Staking plugin for native TON staking operations. Query validator staking pools with APRs, stake TON with a chosen pool, and unstake to reclaim funds.

Part of [TON Agent Kit](https://github.com/Andy00L/ton-agent-kit).

## Install

```bash
npm install @ton-agent-kit/plugin-staking @ton-agent-kit/core zod
```

## Usage

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import StakingPlugin from "@ton-agent-kit/plugin-staking";

const agent = new TonAgentKit(wallet).use(StakingPlugin);

// List staking pools
const pools = await agent.runAction("get_staking_info", {});
console.log(pools);

// Stake TON
const result = await agent.runAction("stake_ton", {
  pool: "EQBx...",
  amount: "10",
});
```

## Actions

| Action | Description |
|---|---|
| `stake_ton` | Stake TON with a validator pool. |
| `unstake_ton` | Unstake TON from a validator pool. |
| `get_staking_info` | Get staking pools and validator info with APRs. |

## Links

- [GitHub](https://github.com/Andy00L/ton-agent-kit)
- [npm](https://www.npmjs.com/package/@ton-agent-kit/plugin-staking)

## License

MIT
