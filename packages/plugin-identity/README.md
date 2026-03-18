# @ton-agent-kit/plugin-identity

Identity plugin for on-chain agent registration, discovery, and reputation management on TON. Agents can register themselves, discover other agents by capability, and query reputation scores backed by a Tact smart contract.

Part of [TON Agent Kit](https://github.com/Andy00L/ton-agent-kit).

## Install

```bash
npm install @ton-agent-kit/plugin-identity @ton-agent-kit/core zod
```

## Usage

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import IdentityPlugin from "@ton-agent-kit/plugin-identity";

const agent = new TonAgentKit(wallet).use(IdentityPlugin);

// Register the agent on-chain
await agent.runAction("register_agent", {
  name: "my-agent",
  services: ["swap", "analytics"],
});

// Discover other agents
const agents = await agent.runAction("discover_agent", {
  service: "swap",
});

// Check reputation
const rep = await agent.runAction("get_agent_reputation", {
  agentAddress: "EQBx...",
});
console.log(rep.score);
```

## Actions

| Action | Description |
|---|---|
| `register_agent` | Register the current agent on-chain with metadata. |
| `discover_agent` | Discover registered agents, optionally filtered by service. |
| `get_agent_reputation` | Query an agent's on-chain reputation score. |
| `deploy_reputation_contract` | Deploy a new Reputation smart contract. |
| `withdraw_reputation_fees` | Withdraw accumulated fees from the Reputation contract. |
| `process_pending_ratings` | Process queued ratings into finalized scores. |
| `get_open_disputes` | List currently open reputation disputes. |
| `trigger_cleanup` | Trigger cleanup of expired or stale agent registrations. |
| `get_agent_cleanup_info` | Get cleanup eligibility info for an agent. |

## Documentation

See [docs/reputation-system.md](https://github.com/Andy00L/ton-agent-kit/blob/main/docs/reputation-system.md) for the full reputation system design.

## Links

- [GitHub](https://github.com/Andy00L/ton-agent-kit)
- [npm](https://www.npmjs.com/package/@ton-agent-kit/plugin-identity)

## License

MIT
