# @ton-agent-kit/orchestrator

Multi-agent orchestrator and lifecycle manager for TON. Register specialized agents, decompose goals into parallel task plans via LLM, and execute them with dependency resolution and retry logic. Also includes `AgentManager` for deploying, starting, stopping, and monitoring agent lifecycles.

Part of [TON Agent Kit](https://github.com/Andy00L/ton-agent-kit).

## Install

```bash
npm install @ton-agent-kit/orchestrator @ton-agent-kit/core zod
```

## Usage

### Multi-Agent Swarm

```typescript
import { Orchestrator } from "@ton-agent-kit/orchestrator";

const orch = new Orchestrator()
  .agent("wallet", "manages balances and transfers", walletAgent)
  .agent("defi", "handles swaps and price checks", defiAgent);

const result = await orch.swarm(
  "Check my balance and swap 1 TON for USDT"
);
console.log(result.summary);
console.log(result.tasksCompleted, result.tasksFailed);
```

### Agent Lifecycle Manager

```typescript
import { AgentManager } from "@ton-agent-kit/orchestrator";

const manager = new AgentManager();

// Deploy and start an agent
manager.deploy("trader", traderAgent, {
  autoRestart: true,
  maxRestarts: 3,
  healthCheck: "30s",
  strategy: "dca-buy-ton",
});
manager.start("trader");

// Check status
const status = manager.status("trader");
console.log(status.state, status.uptime);

// Stop
manager.stop("trader");
```

## Key APIs

| Export | Description |
|---|---|
| `Orchestrator` | Decomposes goals into parallel task plans and executes them across agents. |
| `Planner` | LLM-powered task planner that breaks goals into validated task graphs. |
| `Dispatcher` | Task dispatcher with parallel execution, dependency resolution, and retries. |
| `AgentManager` | Deploy, start, stop, restart, and monitor agent lifecycles. |

## Links

- [GitHub](https://github.com/Andy00L/ton-agent-kit)
- [npm](https://www.npmjs.com/package/@ton-agent-kit/orchestrator)

## License

MIT
