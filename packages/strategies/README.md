# @ton-agent-kit/strategies

Strategy engine for defining, scheduling, and executing multi-step deterministic workflows on the TON blockchain. Includes built-in templates for common patterns like DCA, price monitoring, portfolio rebalancing, and reputation guarding.

Part of [TON Agent Kit](https://github.com/Andy00L/ton-agent-kit).

## Install

```bash
npm install @ton-agent-kit/strategies @ton-agent-kit/core zod
```

## Usage

```typescript
import { defineStrategy, StrategyRunner } from "@ton-agent-kit/strategies";

const dcaStrategy = defineStrategy({
  name: "dca-buy-ton",
  description: "Buy TON with USDT every hour",
  schedule: "every 1h",
  steps: [
    { action: "get_price", params: { token: "TON" } },
    {
      action: "swap_best_price",
      params: { fromToken: "USDT", toToken: "TON", amount: "10" },
    },
  ],
});

// Register with the agent
agent.useStrategy(dcaStrategy);

// Run once
const result = await agent.runStrategy("dca-buy-ton");

// Or start on schedule
agent.startStrategy("dca-buy-ton");
agent.stopStrategy("dca-buy-ton");
```

### Built-in Templates

```typescript
import {
  createDcaStrategy,
  createPriceMonitorStrategy,
  createRebalanceStrategy,
  createReputationGuardStrategy,
} from "@ton-agent-kit/strategies";

const dca = createDcaStrategy({ token: "TON", amount: "5", interval: "1h" });
const monitor = createPriceMonitorStrategy({ token: "TON", threshold: 3.5 });
const rebalance = createRebalanceStrategy({ targets: { TON: 60, USDT: 40 } });
const guard = createReputationGuardStrategy({ minScore: 70 });
```

## Key APIs

| Export | Description |
|---|---|
| `defineStrategy` | Factory to create a validated strategy definition. |
| `StrategyRunner` | Executes strategies against a TonAgentKit instance. |
| `StrategyScheduler` | Interval-based scheduler for recurring strategies. |
| `parseSchedule` | Parse schedule strings like `"every 5m"` or `"every 1h"`. |
| `StrategyContext` | Mutable execution context shared across strategy steps. |

## Documentation

See [docs/strategies.md](https://github.com/Andy00L/ton-agent-kit/blob/main/docs/strategies.md) for the full strategy system design.

## Links

- [GitHub](https://github.com/Andy00L/ton-agent-kit)
- [npm](https://www.npmjs.com/package/@ton-agent-kit/strategies)

## License

MIT
